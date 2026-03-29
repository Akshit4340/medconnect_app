'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSocket } from '@/hooks/use-socket';
import { useAuth } from '@/contexts/auth.context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function ConsultationPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { user } = useAuth();
  const { socket } = useSocket();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    { from: string; text: string }[]
  >([]);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    if (!socket || !appointmentId) return;

    // Join the consultation room
    socket.emit('rtc:join_room', appointmentId);

    // Set up local video
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Create peer connection
        pcRef.current = new RTCPeerConnection(ICE_SERVERS);

        // Add local tracks to peer connection
        stream.getTracks().forEach((track) => {
          pcRef.current!.addTrack(track, stream);
        });

        // When we get remote tracks
        pcRef.current.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
            setIsConnected(true);
          }
        };

        // ICE candidate handling
        pcRef.current.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('rtc:ice_candidate', {
              targetUserId: 'peer',
              candidate: event.candidate,
            });
          }
        };
      });

    // Handle incoming WebRTC events
    socket.on('rtc:peer_joined', async () => {
      if (!pcRef.current) return;
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      socket.emit('rtc:offer', { targetUserId: 'peer', offer });
    });

    socket.on(
      'rtc:offer',
      async ({
        offer,
      }: {
        fromUserId: string;
        offer: RTCSessionDescriptionInit;
      }) => {
        if (!pcRef.current) return;
        await pcRef.current.setRemoteDescription(offer);
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        socket.emit('rtc:answer', { targetUserId: 'peer', answer });
      },
    );

    socket.on(
      'rtc:answer',
      async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
        await pcRef.current?.setRemoteDescription(answer);
      },
    );

    socket.on(
      'rtc:ice_candidate',
      async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
        await pcRef.current?.addIceCandidate(candidate);
      },
    );

    socket.on(
      'chat:message',
      (data: { fromUserId: string; message: string }) => {
        setChatMessages((prev) => [
          ...prev,
          { from: data.fromUserId, text: data.message },
        ]);
      },
    );

    return () => {
      socket.emit('rtc:leave_room', appointmentId);
      pcRef.current?.close();
      socket.off('rtc:peer_joined');
      socket.off('rtc:offer');
      socket.off('rtc:answer');
      socket.off('rtc:ice_candidate');
      socket.off('chat:message');
    };
  }, [socket, appointmentId]);

  const toggleMute = () => {
    const stream = localVideoRef.current?.srcObject as MediaStream;
    stream?.getAudioTracks().forEach((t) => (t.enabled = isMuted));
    setIsMuted(!isMuted);
  };

  const toggleCamera = () => {
    const stream = localVideoRef.current?.srcObject as MediaStream;
    stream?.getVideoTracks().forEach((t) => (t.enabled = isCameraOff));
    setIsCameraOff(!isCameraOff);
  };

  const sendChat = () => {
    if (!chatInput.trim() || !socket) return;
    socket.emit('chat:message', { roomId: appointmentId, message: chatInput });
    setChatMessages((prev) => [...prev, { from: 'me', text: chatInput }]);
    setChatInput('');
  };

  return (
    <div className="h-full flex gap-4">
      {/* Video area */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="relative flex-1 bg-slate-900 rounded-xl overflow-hidden">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {!isConnected && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <p>Waiting for the other participant...</p>
            </div>
          )}
          {/* Local video (picture-in-picture) */}
          <div className="absolute bottom-4 right-4 w-32 h-24 bg-slate-800 rounded-lg overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-3">
          <Button
            variant={isMuted ? 'destructive' : 'outline'}
            onClick={toggleMute}
          >
            {isMuted ? '🔇 Unmute' : '🎤 Mute'}
          </Button>
          <Button
            variant={isCameraOff ? 'destructive' : 'outline'}
            onClick={toggleCamera}
          >
            {isCameraOff ? '📷 Turn on camera' : '📷 Turn off camera'}
          </Button>
          <Button variant="destructive" onClick={() => window.history.back()}>
            📞 End call
          </Button>
        </div>
      </div>

      {/* Chat sidebar */}
      <Card className="w-72 flex flex-col">
        <div className="p-3 border-b font-medium text-sm">
          In-consultation chat
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {chatMessages.map((msg, i) => (
            <div
              key={i}
              className={`text-xs p-2 rounded-lg max-w-full ${
                msg.from === 'me'
                  ? 'bg-slate-900 text-white ml-4'
                  : 'bg-slate-100 text-slate-900 mr-4'
              }`}
            >
              {msg.text}
            </div>
          ))}
        </div>
        <div className="p-3 border-t flex gap-2">
          <input
            className="flex-1 text-sm border rounded px-2 py-1"
            placeholder="Type a message..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendChat()}
          />
          <Button size="sm" onClick={sendChat}>
            Send
          </Button>
        </div>
      </Card>
    </div>
  );
}
