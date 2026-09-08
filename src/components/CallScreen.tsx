import React, { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Camera } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DecryptedAvatar } from "./DecryptedAvatar";

export type CallState = 
  | "idle" 
  | "calling" 
  | "ringing" 
  | "connecting" 
  | "connected"
  | "ended";

export interface CallScreenProps {
  otherUserId: string;
  otherUserName: string;
  otherUserPhoto?: string;
  isVideo: boolean;
  isIncoming: boolean;
  onAccept: () => void;
  onReject: () => void;
  onHangup: () => void;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callState: CallState;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  isMuted: boolean;
  isVideoOff: boolean;
}

export function CallScreen({
  otherUserId,
  otherUserName,
  otherUserPhoto,
  isVideo,
  isIncoming,
  onAccept,
  onReject,
  onHangup,
  localStream,
  remoteStream,
  callState,
  onToggleMute,
  onToggleVideo,
  isMuted,
  isVideoOff,
}: CallScreenProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoOff]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callState]);

  const showVideo = isVideo && callState === "connected" && !isVideoOff;

  return (
    <div className="fixed inset-0 z-[100] bg-neutral-950 flex flex-col items-center justify-between text-white overflow-hidden">
      {/* Background (blurred avatar for audio or remote video) */}
      <div className="absolute inset-0 flex items-center justify-center opacity-30 blur-3xl scale-125 z-0 select-none pointer-events-none">
        {otherUserPhoto ? (
          <img src={otherUserPhoto} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-indigo-900" />
        )}
      </div>

      {showVideo && remoteStream ? (
        <video 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover z-0" 
        />
      ) : null}

      {/* Header Info */}
      <div className="z-10 w-full p-12 flex flex-col items-center mt-8">
        {!showVideo && (
           <DecryptedAvatar
              photoUrl={otherUserPhoto}
              fallback={otherUserName.substring(0, 2).toUpperCase() || "NN"}
              className="w-32 h-32 rounded-full mb-6 shadow-2xl text-4xl"
            />
        )}
        <h2 className="text-3xl font-medium drop-shadow-md">
          {otherUserName}
        </h2>
        <p className="text-neutral-300 mt-2 text-lg drop-shadow-md">
          {callState === "ringing" && "Ringing..."}
          {callState === "calling" && "Calling..."}
          {callState === "connecting" && "Connecting... End-to-end Encrypted"}
          {callState === "connected" && "End-to-end Encrypted"}
          {callState === "ended" && "Call Ended"}
        </p>
      </div>

      {/* Local Video PIP */}
      {isVideo && localStream && (
        <motion.div 
          drag
          dragConstraints={{ left: -100, right: 100, top: -500, bottom: 0 }}
          className="absolute bottom-40 right-6 w-28 h-40 bg-neutral-800 rounded-2xl overflow-hidden shadow-xl z-20 border border-neutral-700 cursor-move"
        >
          {isVideoOff ? (
            <div className="w-full h-full flex items-center justify-center bg-neutral-900">
              <Camera className="w-8 h-8 text-neutral-500" />
            </div>
          ) : (
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover scale-x-[-1]" 
            />
          )}
        </motion.div>
      )}

      {/* Controls */}
      <div className="z-10 w-full p-12 flex items-center justify-center gap-8 mb-8">
        {(callState === "calling" || callState === "connected" || callState === "connecting") && (
          <>
            <button 
              onClick={onToggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                isMuted ? "bg-white text-black" : "bg-neutral-800/80 text-white hover:bg-neutral-700 backdrop-blur-md border border-neutral-700"
              }`}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            {isVideo && (
              <button 
                onClick={onToggleVideo}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                  isVideoOff ? "bg-white text-black" : "bg-neutral-800/80 text-white hover:bg-neutral-700 backdrop-blur-md border border-neutral-700"
                }`}
              >
                {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </button>
            )}

            <button 
              onClick={onHangup}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
          </>
        )}

        {isIncoming && (callState === "ringing" || callState === "idle") && (
          <>
            <button 
              onClick={onReject}
              className="absolute bottom-[90px] left-6 w-14 h-14 rounded-2xl bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <button 
              onClick={onAccept}
              className="absolute bottom-[90px] right-6 w-14 h-14 rounded-2xl bg-indigo-500 hover:bg-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 transition-transform hover:scale-105"
            >
              <Phone className="w-6 h-6" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
