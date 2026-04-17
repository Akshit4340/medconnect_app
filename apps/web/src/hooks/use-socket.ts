'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { tokenStorage } from '@/lib/api';

let socketInstance: Socket | null = null;

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = tokenStorage.getAccess();

    if (!token) {
      setError('No access token — please log in');
      return;
    }

    // Reuse existing connection
    if (socketInstance) {
      if (!socketInstance.connected) {
        socketInstance.connect();
      }
      socketRef.current = socketInstance;
      setIsConnected(socketInstance.connected);
      return;
    }

    // Create new connection
    socketInstance = io(
      process.env.NEXT_PUBLIC_REALTIME_URL || 'http://localhost:3002',
      {
        auth: (cb) => {
          cb({ token: tokenStorage.getAccess() });
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      },
    );

    socketRef.current = socketInstance;

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected:', socketInstance?.id);
      setIsConnected(true);
      setError(null);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);

      if (
        err.message === 'Invalid token' ||
        err.message === 'Authentication required'
      ) {
        import('@/lib/api').then(({ api }) => {
          api
            .get('/auth/me')
            .then(() => {
              if (socketInstance && !socketInstance.connected) {
                socketInstance.connect();
              }
            })
            .catch(() => {
              setError('Session expired. Please log in again.');
              setIsConnected(false);
            });
        });
        return;
      }

      setError(err.message);
      setIsConnected(false);
    });

    return () => {
      // Don't disconnect on unmount — keep the singleton alive
      // Only remove the local listeners
      socketInstance?.off('connect');
      socketInstance?.off('disconnect');
      socketInstance?.off('connect_error');
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    error,
  };
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
