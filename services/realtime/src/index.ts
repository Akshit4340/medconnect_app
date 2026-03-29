import 'dotenv/config';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';
import type { JwtPayload } from '@medconnect/types';
import {
  socketConnectionsActive,
  socketConnectionsTotal,
  socketEventsTotal,
  startMetricsServer,
} from './metrics';

const PORT = process.env.REALTIME_PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const pub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const sub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    credentials: true,
  },
});

interface RTCSessionDescriptionInit {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp?: string;
}

interface RTCIceCandidateInit {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
}

startMetricsServer(9091);

// ─── Auth middleware ───────────────────────────────────────────────────────────

interface AuthenticatedSocket extends Socket {
  user?: JwtPayload;
}

io.use((socket: AuthenticatedSocket, next) => {
  const token = socket.handshake.auth.token as string;

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    socket.user = payload;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

// ─── Connection handler ───────────────────────────────────────────────────────

io.on('connection', (socket: AuthenticatedSocket) => {
  const user = socket.user!;
  console.log(`[Socket] Connected: ${user.userId} (${user.role})`);

  // Join tenant room — isolates events between different clinics
  socket.join(`tenant:${user.tenantId}`);

  // Join personal room for direct notifications
  socket.join(`user:${user.userId}`);

  socketConnectionsActive.inc();
  socketConnectionsTotal.inc();

  socket.onAny((event: string) => {
    socketEventsTotal.inc({ event });
  });

  // ─── Doctor presence ───────────────────────────────────────────────────────

  if (user.role === 'doctor') {
    // Set doctor as online in Redis
    redis.hset(`presence:${user.tenantId}`, user.userId, 'online');

    // Broadcast to tenant that this doctor is online
    socket.to(`tenant:${user.tenantId}`).emit('doctor:presence', {
      doctorId: user.userId,
      status: 'online',
    });

    // Handle status updates from doctor
    socket.on(
      'presence:update',
      async (status: 'online' | 'busy' | 'offline') => {
        await redis.hset(`presence:${user.tenantId}`, user.userId, status);

        // Publish to all realtime instances via Redis pub/sub
        pub.publish(
          `presence:${user.tenantId}`,
          JSON.stringify({ doctorId: user.userId, status }),
        );
      },
    );
  }

  // ─── Appointment events ────────────────────────────────────────────────────

  socket.on(
    'appointment:status_change',
    (data: {
      appointmentId: string;
      status: string;
      patientUserId: string;
    }) => {
      // Notify the specific patient
      io.to(`user:${data.patientUserId}`).emit('appointment:updated', {
        appointmentId: data.appointmentId,
        status: data.status,
      });

      // Broadcast to whole tenant (for admin dashboards)
      socket.to(`tenant:${user.tenantId}`).emit('appointment:updated', {
        appointmentId: data.appointmentId,
        status: data.status,
      });
    },
  );

  // ─── In-app notifications ──────────────────────────────────────────────────

  socket.on(
    'notification:send',
    (data: { targetUserId: string; title: string; message: string }) => {
      io.to(`user:${data.targetUserId}`).emit('notification:new', {
        title: data.title,
        message: data.message,
        timestamp: new Date().toISOString(),
      });
    },
  );

  // ─── WebRTC signaling ──────────────────────────────────────────────────────

  socket.on(
    'rtc:offer',
    (data: { targetUserId: string; offer: RTCSessionDescriptionInit }) => {
      io.to(`user:${data.targetUserId}`).emit('rtc:offer', {
        fromUserId: user.userId,
        offer: data.offer,
      });
    },
  );

  socket.on(
    'rtc:answer',
    (data: { targetUserId: string; answer: RTCSessionDescriptionInit }) => {
      io.to(`user:${data.targetUserId}`).emit('rtc:answer', {
        fromUserId: user.userId,
        answer: data.answer,
      });
    },
  );

  socket.on(
    'rtc:ice_candidate',
    (data: { targetUserId: string; candidate: RTCIceCandidateInit }) => {
      io.to(`user:${data.targetUserId}`).emit('rtc:ice_candidate', {
        fromUserId: user.userId,
        candidate: data.candidate,
      });
    },
  );

  // ─── In-consultation chat ──────────────────────────────────────────────────

  socket.on('chat:message', (data: { roomId: string; message: string }) => {
    io.to(`room:${data.roomId}`).emit('chat:message', {
      fromUserId: user.userId,
      message: data.message,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('rtc:join_room', (roomId: string) => {
    socket.join(`room:${roomId}`);
    socket
      .to(`room:${roomId}`)
      .emit('rtc:peer_joined', { userId: user.userId });
  });

  socket.on('rtc:leave_room', (roomId: string) => {
    socket.leave(`room:${roomId}`);
    socket.to(`room:${roomId}`).emit('rtc:peer_left', { userId: user.userId });
  });

  // ─── Disconnect ────────────────────────────────────────────────────────────

  socket.on('disconnect', async () => {
    console.log(`[Socket] Disconnected: ${user.userId}`);
    socketConnectionsActive.dec();

    if (user.role === 'doctor') {
      await redis.hset(`presence:${user.tenantId}`, user.userId, 'offline');
      pub.publish(
        `presence:${user.tenantId}`,
        JSON.stringify({ doctorId: user.userId, status: 'offline' }),
      );
    }
  });
});

// ─── Redis pub/sub for multi-instance presence sync ───────────────────────────

sub.subscribe('presence:*', (err) => {
  if (err) console.error('[Redis] Subscribe error:', err);
});

sub.on('message', (channel: string, message: string) => {
  const tenantId = channel.split(':')[1];
  const data = JSON.parse(message);
  io.to(`tenant:${tenantId}`).emit('doctor:presence', data);
});

// ─── Start ─────────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`[Realtime] Socket.io server running on port ${PORT}`);
});
