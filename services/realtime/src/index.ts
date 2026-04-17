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

// Track who is in each consultation room: roomId → Set of userIds
const roomParticipants = new Map<string, Set<string>>();
// Track userId → socketId for direct messaging
const userSockets = new Map<string, string>();

startMetricsServer(9091);

// ─── Auth middleware ───────────────────────────────────────────────────────────

interface AuthenticatedSocket extends Socket {
  user?: JwtPayload;
}

io.use((socket: AuthenticatedSocket, next) => {
  const token = socket.handshake.auth.token as string;
  if (!token) return next(new Error('Authentication required'));

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    socket.user = payload;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

// ─── Connection ───────────────────────────────────────────────────────────────

io.on('connection', (socket: AuthenticatedSocket) => {
  const user = socket.user!;
  console.log(`[Socket] Connected: ${user.userId} (${user.role})`);

  socketConnectionsActive.inc();
  socketConnectionsTotal.inc();

  // Track user → socket mapping for direct peer messaging
  userSockets.set(user.userId, socket.id);

  // Join tenant + personal rooms
  socket.join(`tenant:${user.tenantId}`);
  socket.join(`user:${user.userId}`);

  // Track all events
  socket.onAny((event: string) => {
    socketEventsTotal.inc({ event });
  });

  // ─── Doctor presence ─────────────────────────────────────────────────────────

  if (user.role === 'doctor') {
    redis.hset(`presence:${user.tenantId}`, user.userId, 'online');
    socket.to(`tenant:${user.tenantId}`).emit('doctor:presence', {
      doctorId: user.userId,
      status: 'online',
    });

    socket.on(
      'presence:update',
      async (status: 'online' | 'busy' | 'offline') => {
        await redis.hset(`presence:${user.tenantId}`, user.userId, status);
        pub.publish(
          `presence:${user.tenantId}`,
          JSON.stringify({ doctorId: user.userId, status }),
        );
      },
    );
  }

  // ─── Appointment events ───────────────────────────────────────────────────────

  socket.on(
    'appointment:status_change',
    (data: {
      appointmentId: string;
      status: string;
      patientUserId: string;
    }) => {
      io.to(`user:${data.patientUserId}`).emit('appointment:updated', {
        appointmentId: data.appointmentId,
        status: data.status,
      });
      socket.to(`tenant:${user.tenantId}`).emit('appointment:updated', {
        appointmentId: data.appointmentId,
        status: data.status,
      });
    },
  );

  // ─── Notifications ────────────────────────────────────────────────────────────

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

  // ─── WebRTC consultation room ─────────────────────────────────────────────────

  socket.on('rtc:join_room', (roomId: string) => {
    socket.join(`room:${roomId}`);

    // Track participants
    if (!roomParticipants.has(roomId)) {
      roomParticipants.set(roomId, new Set());
    }
    roomParticipants.get(roomId)!.add(user.userId);

    console.log(
      `[WebRTC] ${user.userId} joined room ${roomId}. Participants: ${roomParticipants.get(roomId)!.size}`,
    );

    // Tell everyone else in the room that a new peer joined
    // Include the joiner's userId so the other peer knows who to signal
    socket.to(`room:${roomId}`).emit('rtc:peer_joined', {
      userId: user.userId,
      role: user.role,
    });

    // Tell the joiner who is already in the room
    const existingParticipants = Array.from(
      roomParticipants.get(roomId) || [],
    ).filter((id) => id !== user.userId);

    socket.emit('rtc:room_joined', {
      roomId,
      participants: existingParticipants,
    });
  });

  socket.on('rtc:leave_room', (roomId: string) => {
    socket.leave(`room:${roomId}`);
    roomParticipants.get(roomId)?.delete(user.userId);

    if (roomParticipants.get(roomId)?.size === 0) {
      roomParticipants.delete(roomId);
    }

    socket.to(`room:${roomId}`).emit('rtc:peer_left', {
      userId: user.userId,
    });

    console.log(`[WebRTC] ${user.userId} left room ${roomId}`);
  });

  // WebRTC signaling — route to specific target user
  socket.on(
    'rtc:offer',
    (data: { targetUserId: string; offer: { type: string; sdp?: string } }) => {
      console.log(`[WebRTC] Offer from ${user.userId} to ${data.targetUserId}`);
      io.to(`user:${data.targetUserId}`).emit('rtc:offer', {
        fromUserId: user.userId,
        offer: data.offer,
      });
    },
  );

  socket.on(
    'rtc:answer',
    (data: {
      targetUserId: string;
      answer: { type: string; sdp?: string };
    }) => {
      console.log(
        `[WebRTC] Answer from ${user.userId} to ${data.targetUserId}`,
      );
      io.to(`user:${data.targetUserId}`).emit('rtc:answer', {
        fromUserId: user.userId,
        answer: data.answer,
      });
    },
  );

  socket.on(
    'rtc:ice_candidate',
    (data: {
      targetUserId: string;
      candidate: {
        candidate?: string;
        sdpMid?: string | null;
        sdpMLineIndex?: number | null;
      };
    }) => {
      io.to(`user:${data.targetUserId}`).emit('rtc:ice_candidate', {
        fromUserId: user.userId,
        candidate: data.candidate,
      });
    },
  );

  // ─── In-consultation chat ─────────────────────────────────────────────────────

  socket.on('chat:message', (data: { roomId: string; message: string }) => {
    // Broadcast to everyone in the room including sender
    io.to(`room:${data.roomId}`).emit('chat:message', {
      fromUserId: user.userId,
      message: data.message,
      timestamp: new Date().toISOString(),
    });
  });

  // ─── Disconnect ───────────────────────────────────────────────────────────────

  socket.on('disconnect', async () => {
    console.log(`[Socket] Disconnected: ${user.userId}`);
    socketConnectionsActive.dec();
    userSockets.delete(user.userId);

    // Clean up all rooms this user was in
    for (const [roomId, participants] of roomParticipants.entries()) {
      if (participants.has(user.userId)) {
        participants.delete(user.userId);
        io.to(`room:${roomId}`).emit('rtc:peer_left', {
          userId: user.userId,
        });
        if (participants.size === 0) {
          roomParticipants.delete(roomId);
        }
      }
    }

    if (user.role === 'doctor') {
      await redis.hset(`presence:${user.tenantId}`, user.userId, 'offline');
      pub.publish(
        `presence:${user.tenantId}`,
        JSON.stringify({ doctorId: user.userId, status: 'offline' }),
      );
    }
  });
});

// ─── Redis pub/sub ────────────────────────────────────────────────────────────

sub.psubscribe('presence:*', (err) => {
  if (err) console.error('[Redis] Subscribe error:', err);
});

sub.on('pmessage', (_pattern: string, channel: string, message: string) => {
  const tenantId = channel.split(':')[1];
  const data = JSON.parse(message) as { doctorId: string; status: string };
  io.to(`tenant:${tenantId}`).emit('doctor:presence', data);
});

// ─── Start ────────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`[Realtime] Socket.io server on port ${PORT}`);
});
