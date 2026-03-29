'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { tokenStorage } from '@/lib/api';

let socketInstance: Socket | null = null;

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = tokenStorage.getAccess();
    if (!token) return;

    if (!socketInstance) {
      socketInstance = io(
        process.env.NEXT_PUBLIC_REALTIME_URL || 'http://localhost:3002',
        {
          auth: { token },
          transports: ['websocket'],
        },
      );
    }

    socketRef.current = socketInstance;

    socketInstance.on('connect', () => setIsConnected(true));
    socketInstance.on('disconnect', () => setIsConnected(false));

    if (socketInstance.connected) setIsConnected(true);

    return () => {
      socketInstance?.off('connect');
      socketInstance?.off('disconnect');
    };
  }, []);

  return { socket: socketRef.current, isConnected };
}

export function disconnectSocket() {
  socketInstance?.disconnect();
  socketInstance = null;
}
