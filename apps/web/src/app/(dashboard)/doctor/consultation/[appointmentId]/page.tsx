'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/use-socket';
import { useAuth } from '@/contexts/auth.context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface RTCSessionDescriptionInit {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp?: string;
}

interface RTCIceCandidateInit {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
}

interface ChatMessage {
  fromUserId: string;
  message: string;
  timestamp: string;
  isMine: boolean;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export default function ConsultationPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const { socket, isConnected: socketConnected } = useSocket();

  // Video refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  // State
  const [callStatus, setCallStatus] = useState<
    'waiting' | 'connecting' | 'connected' | 'ended'
  >('waiting');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [remotePeerId, setRemotePeerId] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(0);

  // ─── Create peer connection ─────────────────────────────────────────────────

  const createPeerConnection = useCallback(
    (targetUserId: string) => {
      if (!socket) return null;

      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Add local tracks
      localStreamRef.current?.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });

      // Remote track handler
      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setCallStatus('connected');
        }
      };

      // ICE candidate handler
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('rtc:ice_candidate', {
            targetUserId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('[WebRTC] Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setCallStatus('connected');
        } else if (
          pc.connectionState === 'disconnected' ||
          pc.connectionState === 'failed'
        ) {
          setCallStatus('waiting');
        }
      };

      pcRef.current = pc;
      return pc;
    },
    [socket],
  );

  // ─── Initialize camera/mic then join room ───────────────────────────────────

  useEffect(() => {
    if (!socket || !socketConnected || !appointmentId) return;

    let mounted = true;

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Join the consultation room
        socket.emit('rtc:join_room', appointmentId);
      } catch (err) {
        console.error('[WebRTC] Media access error:', err);
        alert(
          'Could not access camera/microphone. Please check your browser permissions.',
        );
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [socket, socketConnected, appointmentId]);

  // ─── Socket event handlers ───────────────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    // We joined — see who's already here
    socket.on(
      'rtc:room_joined',
      async (data: { roomId: string; participants: string[] }) => {
        setParticipantCount(data.participants.length + 1);
        console.log(
          '[WebRTC] Room joined, existing participants:',
          data.participants,
        );

        // If someone is already in the room, initiate the call
        if (data.participants.length > 0 && user) {
          const targetId = data.participants[0];
          setRemotePeerId(targetId);
          setCallStatus('connecting');

          const pc = createPeerConnection(targetId);
          if (!pc) return;

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit('rtc:offer', {
            targetUserId: targetId,
            offer: { type: offer.type, sdp: offer.sdp },
          });
        }
      },
    );

    // A new peer joined — they will send us an offer
    socket.on('rtc:peer_joined', (data: { userId: string; role: string }) => {
      console.log('[WebRTC] Peer joined:', data.userId);
      setRemotePeerId(data.userId);
      setCallStatus('connecting');
      setParticipantCount((prev) => prev + 1);
      createPeerConnection(data.userId);
    });

    // Peer left
    socket.on('rtc:peer_left', (data: { userId: string }) => {
      console.log('[WebRTC] Peer left:', data.userId);
      setCallStatus('waiting');
      setParticipantCount((prev) => Math.max(1, prev - 1));
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    });

    // Received an offer — create answer
    socket.on(
      'rtc:offer',
      async (data: {
        fromUserId: string;
        offer: RTCSessionDescriptionInit;
      }) => {
        console.log('[WebRTC] Received offer from', data.fromUserId);
        setRemotePeerId(data.fromUserId);
        setCallStatus('connecting');

        const pc = pcRef.current || createPeerConnection(data.fromUserId);
        if (!pc) return;

        await pc.setRemoteDescription(data.offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('rtc:answer', {
          targetUserId: data.fromUserId,
          answer: { type: answer.type, sdp: answer.sdp },
        });
      },
    );

    // Received an answer
    socket.on(
      'rtc:answer',
      async (data: {
        fromUserId: string;
        answer: RTCSessionDescriptionInit;
      }) => {
        console.log('[WebRTC] Received answer from', data.fromUserId);
        const pc = pcRef.current;
        if (!pc) return;
        await pc.setRemoteDescription(data.answer);
      },
    );

    // Received ICE candidate
    socket.on(
      'rtc:ice_candidate',
      async (data: { fromUserId: string; candidate: RTCIceCandidateInit }) => {
        const pc = pcRef.current;
        if (!pc) return;
        try {
          await pc.addIceCandidate(data.candidate);
        } catch (err) {
          console.error('[WebRTC] ICE candidate error:', err);
        }
      },
    );

    // Chat messages
    socket.on(
      'chat:message',
      (data: { fromUserId: string; message: string; timestamp: string }) => {
        setChatMessages((prev) => [
          ...prev,
          {
            fromUserId: data.fromUserId,
            message: data.message,
            timestamp: data.timestamp,
            isMine: data.fromUserId === user?.userId,
          },
        ]);
      },
    );

    return () => {
      socket.off('rtc:room_joined');
      socket.off('rtc:peer_joined');
      socket.off('rtc:peer_left');
      socket.off('rtc:offer');
      socket.off('rtc:answer');
      socket.off('rtc:ice_candidate');
      socket.off('chat:message');
    };
  }, [socket, createPeerConnection, user, remotePeerId]);

  // ─── Controls ─────────────────────────────────────────────────────────────────

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => (t.enabled = isMuted));
    setIsMuted(!isMuted);
  };

  const toggleCamera = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => (t.enabled = isCameraOff));
    setIsCameraOff(!isCameraOff);
  };

  const toggleScreenShare = async () => {
    if (!pcRef.current || !localStreamRef.current) return;

    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace video track in peer connection
        const videoSender = pcRef.current
          .getSenders()
          .find((s) => s.track?.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(screenTrack);
        }

        // Show screen share in local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        screenTrack.onended = () => {
          setIsScreenSharing(false);
          // Switch back to camera
          const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
          if (videoSender && cameraTrack) {
            videoSender.replaceTrack(cameraTrack);
          }
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.error('[WebRTC] Screen share error:', err);
      }
    } else {
      // Stop screen share — switch back to camera
      const cameraTrack = localStreamRef.current.getVideoTracks()[0];
      const videoSender = pcRef.current
        .getSenders()
        .find((s) => s.track?.kind === 'video');
      if (videoSender && cameraTrack) {
        await videoSender.replaceTrack(cameraTrack);
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      setIsScreenSharing(false);
    }
  };

  const endCall = () => {
    if (socket && appointmentId) {
      socket.emit('rtc:leave_room', appointmentId);
    }

    // Stop all tracks
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current = null;

    setCallStatus('ended');
    router.back();
  };

  const sendChat = () => {
    if (!chatInput.trim() || !socket) return;
    socket.emit('chat:message', {
      roomId: appointmentId,
      message: chatInput.trim(),
    });
    setChatInput('');
  };

  // ─── Status badge ─────────────────────────────────────────────────────────────

  const statusBadge = {
    waiting: {
      label: 'Waiting for other participant...',
      color: 'bg-yellow-100 text-yellow-800',
    },
    connecting: { label: 'Connecting...', color: 'bg-blue-100 text-blue-800' },
    connected: { label: 'Connected', color: 'bg-green-100 text-green-800' },
    ended: { label: 'Call ended', color: 'bg-red-100 text-red-800' },
  }[callStatus];

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-4 p-2">
      {/* Main video area */}
      <div className="flex-1 flex flex-col gap-3">
        {/* Status bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`text-xs px-3 py-1 rounded-full font-medium ${statusBadge.color}`}
            >
              {statusBadge.label}
            </span>
            <span className="text-xs text-slate-500">
              Room: {appointmentId?.slice(0, 8)}...
            </span>
          </div>
          <span className="text-xs text-slate-500">
            {participantCount} participant{participantCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Remote video (main) */}
        <div className="relative flex-1 bg-slate-900 rounded-xl overflow-hidden">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {callStatus === 'waiting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
              <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center text-2xl">
                👤
              </div>
              <p className="text-sm text-slate-300">
                Share this appointment ID with the other participant
              </p>
              <code className="text-xs bg-slate-800 px-3 py-1 rounded">
                {appointmentId}
              </code>
            </div>
          )}

          {callStatus === 'connecting' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white text-sm animate-pulse">
                Establishing connection...
              </div>
            </div>
          )}

          {/* Local video (PiP) */}
          <div className="absolute bottom-4 right-4 w-36 h-28 bg-slate-800 rounded-xl overflow-hidden border-2 border-slate-600 shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {isCameraOff && (
              <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                <span className="text-slate-400 text-xs">Camera off</span>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 py-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleMute}
            className={
              isMuted
                ? 'bg-red-100 border-red-300 text-red-700 hover:bg-red-200'
                : ''
            }
          >
            {isMuted ? '🔇 Unmuted' : '🎤 Mute'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleCamera}
            className={
              isCameraOff
                ? 'bg-red-100 border-red-300 text-red-700 hover:bg-red-200'
                : ''
            }
          >
            {isCameraOff ? '📷 Camera off' : '📷 Camera'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleScreenShare}
            className={
              isScreenSharing
                ? 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200'
                : ''
            }
          >
            {isScreenSharing ? '🖥️ Stop sharing' : '🖥️ Share screen'}
          </Button>

          <Button variant="destructive" size="sm" onClick={endCall}>
            📞 End call
          </Button>
        </div>
      </div>

      {/* Chat sidebar */}
      <Card className="w-72 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-slate-200 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-900">
            Consultation chat
          </span>
          <span className="text-xs text-slate-400">
            {chatMessages.length} messages
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
          {chatMessages.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">
              Messages will appear here
            </p>
          )}
          {chatMessages.map((msg, i) => (
            <div
              key={i}
              className={`flex flex-col ${msg.isMine ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-full text-xs px-3 py-2 rounded-xl break-words ${
                  msg.isMine
                    ? 'bg-slate-900 text-white rounded-br-none'
                    : 'bg-slate-100 text-slate-900 rounded-bl-none'
                }`}
              >
                {msg.message}
              </div>
              <span className="text-xs text-slate-400 mt-0.5 px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-slate-200 flex gap-2">
          <input
            className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white"
            placeholder="Message..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChat();
              }
            }}
          />
          <Button size="sm" onClick={sendChat} disabled={!chatInput.trim()}>
            Send
          </Button>
        </div>
      </Card>
    </div>
  );
}
