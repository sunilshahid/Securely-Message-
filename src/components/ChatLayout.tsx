
function ScrollPicker({ items, selected, onChange, itemHeight = 40 }: { items: string[], selected: string, onChange: (val: string) => void, itemHeight?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<any>(null);

  const repeatedItems = useMemo(() => [...items, ...items, ...items], [items]);

  useEffect(() => {
    const centerIndex = items.length + Math.max(0, items.indexOf(selected));
    if (containerRef.current) {
      containerRef.current.scrollTop = centerIndex * itemHeight;
    }
  }, []); 

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isScrollingRef.current) return;
    
    const scrollTop = e.currentTarget.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    
    const actualIndex = index % items.length;
    if (actualIndex >= 0 && actualIndex < items.length) {
      const selectedItem = items[actualIndex];
      if (selectedItem !== selected) {
        onChange(selectedItem);
      }
    }

    clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      if (index < items.length || index >= items.length * 2) {
        isScrollingRef.current = true;
        if (containerRef.current) containerRef.current.scrollTop = (items.length + actualIndex) * itemHeight;
        setTimeout(() => { isScrollingRef.current = false; }, 50);
      }
    }, 150);
  };

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className="overflow-y-auto h-full snap-y snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-[55px]"
    >
      {repeatedItems.map((val, i) => (
        <button 
          key={i} 
          onClick={() => {
            if (containerRef.current) {
               containerRef.current.scrollTo({ top: i * itemHeight, behavior: 'smooth' });
            }
          }}
          className={`w-full h-[40px] snap-center flex items-center justify-center text-xl font-medium transition-colors ${val === selected ? 'text-indigo-400' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          {val}
        </button>
      ))}
    </div>
  );
}

function CustomDateTimePicker({ onSelect, onClose }: { onSelect: (d: Date) => void, onClose: () => void }) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [hour, setHour] = useState(() => {
    let h = new Date().getHours() + 1;
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return h.toString().padStart(2, '0');
  });
  const [minute, setMinute] = useState("00");
  const [ampm, setAmpm] = useState(() => {
    return (new Date().getHours() + 1) >= 12 ? "PM" : "AM";
  });

  const dates = Array.from({length: 30}).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const hours = Array.from({length: 12}).map((_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = Array.from({length: 60}).map((_, i) => i.toString().padStart(2, '0'));

  const handleSchedule = () => {
    const d = new Date(selectedDate);
    let h = parseInt(hour, 10);
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    d.setHours(h);
    d.setMinutes(parseInt(minute, 10));
    d.setSeconds(0);
    d.setMilliseconds(0);
    onSelect(d);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex flex-col justify-end md:justify-center items-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-neutral-900 w-full md:w-[400px] rounded-t-3xl md:rounded-3xl flex flex-col overflow-hidden border border-neutral-800 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-neutral-800">
          <h3 className="text-lg font-medium text-neutral-100">Schedule Message</h3>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white rounded-full transition-colors"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 flex flex-col gap-8">
          <div>
            <label className="text-sm font-medium text-neutral-400 mb-3 block">Date</label>
            <div className="flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x">
              {dates.map((d, i) => {
                const isSelected = selectedDate.toDateString() === d.toDateString();
                const isToday = i === 0;
                const isTomorrow = i === 1;
                let label = d.toLocaleDateString('en-US', { weekday: 'short' });
                if (isToday) label = "Today";
                if (isTomorrow) label = "Tomorrow";
                
                return (
                  <button 
                    key={i} 
                    onClick={() => setSelectedDate(d)}
                    className={`snap-start shrink-0 flex flex-col items-center justify-center w-[72px] h-[72px] rounded-2xl border transition-all ${isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700'}`}
                  >
                    <span className="text-[11px] font-medium uppercase tracking-wider opacity-80 mb-1">{label}</span>
                    <span className="text-xl font-medium">{d.getDate()}</span>
                  </button>
                )
              })}
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-neutral-400 mb-3 block">Time</label>
            <div className="flex items-center gap-4 justify-center">
              <div className="flex-1 bg-neutral-800 border border-neutral-700 rounded-2xl overflow-hidden h-[150px] relative">
                 <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 bg-white/5 pointer-events-none border-y border-white/10" />
                 <ScrollPicker items={hours} selected={hour} onChange={setHour} />
              </div>
              <span className="text-xl font-medium text-neutral-500">:</span>
              <div className="flex-1 bg-neutral-800 border border-neutral-700 rounded-2xl overflow-hidden h-[150px] relative">
                 <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 bg-white/5 pointer-events-none border-y border-white/10" />
                 <ScrollPicker items={minutes} selected={minute} onChange={setMinute} />
              </div>
              <div className="flex flex-col gap-2 w-16">
                 <button onClick={() => setAmpm("AM")} className={`flex-1 rounded-xl font-medium text-sm transition-all h-12 ${ampm === "AM" ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:bg-neutral-700'}`}>AM</button>
                 <button onClick={() => setAmpm("PM")} className={`flex-1 rounded-xl font-medium text-sm transition-all h-12 ${ampm === "PM" ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:bg-neutral-700'}`}>PM</button>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-neutral-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-3 font-medium text-neutral-300 hover:text-white transition-colors">Cancel</button>
          <button onClick={handleSchedule} className="px-8 py-3 bg-indigo-600 text-white font-medium rounded-full shadow-lg hover:bg-indigo-500 active:scale-95 transition-all">Schedule</button>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import QRCode from "react-qr-code";
import {
  Settings,
  Plus,
  Search,
  MessageSquare,
  Clock,
  Paperclip,
  Send,
  ArrowLeft,
  QrCode,
  X,
  Zap,
  Key,
  Check,
  CheckCheck,
  Eye,
  Mic,
  Square,
  Camera,
  User,
  AtSign,
  Pencil,
  Phone,
  Video,
  CircleDashed,
  LogOut,
  Calendar,
  Copy,
  Trash2,
  Shield,
  ChevronDown,
  BadgeCheck,
  Reply,
  MoreVertical,
  Users,
  CheckSquare,
  Filter,
  Bell,
  Archive,
  ChevronLeft,
  Edit2
} from "lucide-react";
import { Conversation, ChatMessage } from "../types";

import { decryptFile } from "../crypto";
import { DisappearingClock } from "./DisappearingClock";
import { ScheduledClock } from "./ScheduledClock";
import { DecryptedAvatar } from "./DecryptedAvatar";
import { CallScreen, CallState } from "./CallScreen";
import { CallsTab } from "./CallsTab";
import { toast } from "./Toast";

declare global {
  interface Window {
    __pendingOffer: any;
    __pendingCandidates: any[];
  }
}

function ViewOnceOverlay({
  onClose,
  text,
  url,
  type,
}: {
  onClose: () => void;
  text?: string;
  url?: string;
  type?: string;
}) {
  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <button 
        onClick={onClose} 
        className="absolute top-6 left-6 p-2 bg-neutral-800/50 hover:bg-neutral-800 rounded-full text-white transition-colors z-[101]"
      >
          <ArrowLeft className="w-6 h-6" />
      </button>
      {type?.startsWith("video/") && url ? (
        <video src={url} autoPlay controlsList="nodownload" disablePictureInPicture className="max-w-full max-h-full rounded-lg" />
      ) : type?.startsWith("audio/") && url ? (
        <audio src={url} autoPlay controlsList="nodownload" className="max-w-full" />
      ) : url ? (
        <img src={url} alt="View once" className="max-w-full max-h-full object-contain rounded-lg pointer-events-none" />
      ) : text ? (
        <div className="text-white text-2xl font-medium max-w-2xl text-center leading-relaxed">
          {text}
        </div>
      ) : null}
    </div>
  );
}

function AttachmentLoader({
  attachmentId,
  decryptionKey,
}: {
  attachmentId: string;
  decryptionKey?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [type, setType] = useState<string>("");

  useEffect(() => {
    if (!decryptionKey) return;
    const parts = decryptionKey.split("|");
    const keyHex = parts[0];
    const mimeTypeOverride = parts[1];

    fetch(`/api/v1/attachments/${attachmentId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Attachment missing");
        const mimeType = mimeTypeOverride || res.headers.get("content-type") || "application/octet-stream";
        return res.blob().then((blob) => ({ blob, mimeType }));
      })
      .then(async ({ blob, mimeType }) => {
        const decrypted = await decryptFile(blob, keyHex, mimeType);
        setType(decrypted.type);
        setUrl(URL.createObjectURL(decrypted));
      })
      .catch(err => { if (err.message !== 'Failed to fetch') console.error(err); });
  }, [attachmentId, decryptionKey]);

  if (!url) {
    return (
      <div className="mb-2 p-3 bg-black/20 rounded-lg text-sm flex items-center gap-2">
        <Clock className="w-4 h-4 animate-spin" />
        Decrypting...
      </div>
    );
  }

  if (type.startsWith("image/")) {
    return (
      <img src={url} alt="Attachment" className="max-w-full rounded-lg mb-2" />
    );
  }
  if (type.startsWith("video/")) {
    return <video src={url} controls className="max-w-full rounded-lg mb-2" />;
  }
  if (type.startsWith("audio/")) {
    return <audio src={url} controls className="max-w-full mb-2" />;
  }

  return (
    <a
      href={url}
      download={`attachment-${attachmentId}`}
      className="mb-2 p-3 bg-black/20 rounded-lg text-sm flex items-center gap-2 block hover:bg-black/30"
    >
      <Paperclip className="w-4 h-4" />
      Download Attachment
    </a>
  );
}

function ViewOnceMessage({
  msg,
  onViewed,
}: {
  msg: ChatMessage;
  onViewed: () => void;
}) {
  const [isViewing, setIsViewing] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [type, setType] = useState<string | undefined>(undefined);
  const [decrypting, setDecrypting] = useState(false);

  let label = "Txt";
  if (msg.attachmentId && msg.decryptionKey) {
    const parts = msg.decryptionKey.split("|");
    const mimeType = parts[1] || type || "";
    if (mimeType.startsWith("image/")) {
      label = "Photo";
    } else if (mimeType.startsWith("video/") || mimeType.startsWith("audio/") || mimeType.startsWith("application/")) {
      label = "Others";
    } else if (mimeType) {
      label = "Others";
    }
  }

  if (msg.isSelf) {
    return (
      <div className={"flex items-center gap-1.5 font-medium " + (msg.isSelf ? "text-indigo-200" : "text-neutral-200")}>
        <span className="w-3.5 h-3.5 flex items-center justify-center rounded-full border-[1.5px] border-current text-[8px] font-bold opacity-80 border-dashed">1</span>
        <span className="text-[15px] italic">{label}</span>
      </div>
    );
  }

  if (msg.viewOnceViewed) {
    return (
      <div className={"flex items-center gap-1.5 font-medium italic " + (msg.isSelf ? "text-indigo-300" : "text-neutral-400")}>
        <CircleDashed className="w-4 h-4 opacity-80" />
        <span className="text-[15px]">Opened</span>
      </div>
    );
  }

  const handleOpen = async () => {
    if (url || !msg.attachmentId) {
       setIsViewing(true);
       return;
    }
    
    if (msg.attachmentId && msg.decryptionKey) {
      setDecrypting(true);
      try {
        const parts = msg.decryptionKey.split("|");
        const keyHex = parts[0];
        const mimeTypeOverride = parts[1];
        
        const res = await fetch(`/api/v1/attachments/${msg.attachmentId}`);
        if (!res.ok) throw new Error("Attachment missing");
        
        const mimeType = mimeTypeOverride || res.headers.get("content-type") || "application/octet-stream";
        const blob = await res.blob();
        
        const decrypted = await decryptFile(blob, keyHex, mimeType);
        setType(decrypted.type);
        setUrl(URL.createObjectURL(decrypted));
      } catch (err) { if (err.message !== 'Failed to fetch') console.error(err); }
      setDecrypting(false);
    }
  };

  const handleClose = () => {
    setIsViewing(false);
    if (url) URL.revokeObjectURL(url);
    setUrl(null);
    onViewed();
  };

  return (
    <>
      {isViewing && (
        <ViewOnceOverlay
          onClose={handleClose}
          text={msg.decryptedText}
          url={url || undefined}
          type={type}
        />
      )}
      <button 
        onClick={handleOpen}
        disabled={decrypting}
        className={"flex items-center gap-1.5 font-medium transition-opacity hover:opacity-80 text-left " + (msg.isSelf ? "text-indigo-200" : "text-neutral-200")}
      >
        {decrypting ? (
          <Clock className="w-3.5 h-3.5 animate-spin opacity-80" />
        ) : (
          <span className="w-3.5 h-3.5 flex items-center justify-center rounded-full border-[1.5px] border-current text-[8px] font-bold opacity-80 border-dashed">1</span>
        )}
        <span className="text-[15px] italic">
           {label}
        </span>
      </button>
    </>
  );
}

type ChatLayoutProps = {
  socket: any;
  myId: string;
  myName?: string;
  myUsername?: string;
  myPhoto?: string;
  myAbout?: string;
  conversations: Conversation[];
  activeConvId: string | null;
  onSelectConv: (id: string) => void;
  onSendMessage: (
    text: string,
    scheduledTime?: Date,
    attachment?: File,
    expireIn?: number,
    isViewOnce?: boolean,
    replyToId?: string,
    replyTo?: { text: string; senderName: string; isSelf: boolean; }
  ) => void;
  onViewOnceOpened: (msgId: string, attachmentId?: string) => void;
  onAddContact: (id: string, name?: string, photoUrl?: string, about?: string) => void;
  onSaveContact: (id: string, name: string) => Promise<void>;
  onUpdateProfile: (updates: any) => void;
  onUpdateConversation?: (convId: string, updates: any) => void;
  onLogout?: () => void;
};

export default function ChatLayout({
  socket,
  myId,
  myName,
  myUsername,
  myPhoto,
  myAbout,
  conversations,
  activeConvId,
  onSelectConv,
  onSendMessage,
  onViewOnceOpened,
  onAddContact,
  onSaveContact,
  onUpdateProfile,
  onUpdateConversation,
  onLogout,
}: ChatLayoutProps) {
  const [newContactId, setNewContactId] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [text, setText] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [rescheduleMsgId, setRescheduleMsgId] = useState<string | null>(null);
  const [scheduleTime, setScheduleTime] = useState("");
  const [showQrModal, setShowQrModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<"chats" | "calls" | "stories">("chats");
  
  const [showProfileModal, setShowProfileModal] = useState(false);
  type ProfileScreen = "main" | "name" | "about" | "username";
  const [profileScreen, setProfileScreen] = useState<ProfileScreen>("main");
  const [profileName, setProfileName] = useState(myName || "");
  const [profileUsername, setProfileUsername] = useState(myUsername || "");
  const [profilePhoto, setProfilePhoto] = useState(myPhoto || "");
  const [profileAbout, setProfileAbout] = useState(myAbout || "");
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);

  const [isDiscoverable, setIsDiscoverable] = useState(true);
  const [globalDisappear, setGlobalDisappear] = useState(() =>
    parseInt(localStorage.getItem("global_disappear") || "0"),
  );
  const [showChatSettings, setShowChatSettings] = useState(false);
  const [chatSettingsView, setChatSettingsView] = useState<"main" | "disappear">("main");
  const [tempDisappearDelay, setTempDisappearDelay] = useState<number>(-1);
  const [showCustomTimeModal, setShowCustomTimeModal] = useState(false);
  const [customTimeValue, setCustomTimeValue] = useState("30");
  const [customTimeUnit, setCustomTimeUnit] = useState("seconds");
  const [globalCustomDisappearInput, setGlobalCustomDisappearInput] = useState("");

  const [attachment, setAttachment] = useState<File | null>(null);
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const cancelRecordingRef = useRef(false);
  const sendAfterRecordingRef = useRef(false);
  const recordingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setRecordingTime(0);
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  }, [isRecording]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const schedulePressTimer = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showNotificationProfile, setShowNotificationProfile] = useState(false);
  const [showNotificationProfileSettings, setShowNotificationProfileSettings] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupLink, setGroupLink] = useState("");
  const [highlightMsgId, setHighlightMsgId] = useState<string | null>(null);
  const [contactNameInput, setContactNameInput] = useState("");
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // WebRTC State
  const [callState, setCallState] = useState<CallState>("idle");
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [callIsVideo, setCallIsVideo] = useState(false);
  const [callingUserId, setCallingUserId] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Cleanup WebRTC
  const cleanupCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    setCallState("idle");
    setCallingUserId(null);
    setIsIncomingCall(false);
    setIsMuted(false);
    setIsVideoOff(false);
    window.__pendingOffer = null;
    window.__pendingCandidates = [];
  };

  const initLocalStream = async (video: boolean) => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast("Your browser does not support media devices or it's blocked. Please try in a separate tab.", "error");
        return null;
      }
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video,
          audio: true,
        });
      } catch (e: any) {
        if (video && (e.name === 'NotReadableError' || e.name === 'NotFoundError')) {
          console.warn("Camera in use or not found, falling back to audio-only");
          stream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true,
          });
          setIsVideoOff(true);
        } else {
          throw e;
        }
      }
      setLocalStream(stream);
      return stream;
    } catch (err: any) {
      console.error("No media device access", err);
      let errorMsg = "Could not access microphone/camera. Please grant permissions.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        errorMsg = "Microphone/camera permission was denied. Please allow permissions in your browser to make calls.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        errorMsg = "No microphone or camera was found on your device.";
      }
      toast(errorMsg, "error");
      return null;
    }
  };

  const createPeerConnection = (otherId: string, stream: MediaStream) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      let rStream = event.streams && event.streams[0];
      if (!rStream) {
         rStream = new MediaStream([event.track]);
      }
      setRemoteStream(prev => {
         if (prev && event.streams && event.streams.length === 0) {
            prev.addTrack(event.track);
            return prev;
         }
         return rStream;
      });
      setCallState("connected");
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        // Send candidate via signaling
        socket.emit("call_signaling", {
          recipientId: otherId,
          payload: { type: "candidate", candidate: event.candidate },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        cleanupCall();
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  const startCallDialog = async (isVideoCall: boolean, targetId?: string) => {
    const idToCall = targetId || activeConvId;
    if (!idToCall) return;
    setCallIsVideo(isVideoCall);
    setIsIncomingCall(false);
    setCallingUserId(idToCall);
    setCallState("calling");
    window.__pendingCandidates = [];
    
    const stream = await initLocalStream(isVideoCall);
    if (!stream) {
      cleanupCall();
      return;
    }

    const pc = createPeerConnection(idToCall, stream);
    
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      socket?.emit("call_signaling", {
        recipientId: idToCall,
        payload: { type: "offer", offer, isVideo: isVideoCall },
      });
    } catch (e) {
      console.error(e);
      cleanupCall();
    }
  };

  const sendCallSignaling = (payload: any) => {
    if (socket && callingUserId) {
       socket.emit("call_signaling", {
         recipientId: callingUserId,
         payload
       });
    }
  };

  const callStateRef = useRef(callState);
  useEffect(() => { callStateRef.current = callState; }, [callState]);

  useEffect(() => {
    if (!socket) return;
    
    const onCallSignaling = async (data: any) => {
      const { senderId, payload } = data;
      
      if (payload.type === "offer") {
        if (callStateRef.current !== "idle") {
          // busy
          return;
        }
        setCallingUserId(senderId);
        setCallIsVideo(payload.isVideo);
        setIsIncomingCall(true);
        setCallState("ringing");

        // Temporary create pc without stream just to save remote offer? Better to wait for user to accept.
        // Actually, we must save the offer.
        window.__pendingOffer = payload.offer;
        window.__pendingCandidates = [];
      }
      else if (payload.type === "answer") {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(payload.answer);
          if (window.__pendingCandidates) {
             window.__pendingCandidates.forEach((c) => peerConnectionRef.current.addIceCandidate(c).catch(console.error));
             window.__pendingCandidates = [];
          }
        }
      }
      else if (payload.type === "candidate") {
        if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
          try {
            await peerConnectionRef.current.addIceCandidate(payload.candidate);
          } catch(e) { console.error(e); }
        } else {
           // Queue candidate if pc isn't ready or remoteDescription is missing
           if (!window.__pendingCandidates) window.__pendingCandidates = [];
           window.__pendingCandidates.push(payload.candidate);
        }
      }
      else if (payload.type === "end") {
        cleanupCall();
      }
    };

    if (socket) {
      socket.on("receive_call_signaling", onCallSignaling);
      return () => {
        socket.off("receive_call_signaling", onCallSignaling);
      };
    }
  }, [socket]); // removed callState to prevent re-binding

  const acceptCall = async () => {
    if (!callingUserId || !window.__pendingOffer) return;
    setCallState("connecting");
    
    const stream = await initLocalStream(callIsVideo);
    if (!stream) {
      sendCallSignaling({ type: "end" });
      cleanupCall();
      return;
    }
    
    const pc = createPeerConnection(callingUserId, stream);
    
    try {
      await pc.setRemoteDescription(window.__pendingOffer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      sendCallSignaling({ type: "answer", answer });

      if (window.__pendingCandidates) {
         window.__pendingCandidates.forEach((c: any) => pc.addIceCandidate(c));
         window.__pendingCandidates = [];
      }
    } catch(e) {
      cleanupCall();
    }
  };

  const rejectCall = () => {
    sendCallSignaling({ type: "end" });
    cleanupCall();
  };

  const hangupCall = () => {
    sendCallSignaling({ type: "end" });
    cleanupCall();
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = !t.enabled);
      setIsVideoOff(!isVideoOff);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, activeConvId]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "0px";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(Math.max(scrollHeight, 44), 120) + "px";
    }
  }, [text]);

  useEffect(() => {
    if (!newContactId.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/v1/users/search?q=${encodeURIComponent(newContactId)}`,
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (e) { if (e.message !== 'Failed to fetch') console.error(e); } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [newContactId]);
  
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim() || !isSearchActive) return conversations;
    const lowerQuery = searchQuery.toLowerCase();
    
    return conversations.filter(conv => {
      if (conv.displayName?.toLowerCase().includes(lowerQuery) || conv.id.toLowerCase().includes(lowerQuery)) return true;
      return false;
    });
  }, [conversations, searchQuery, isSearchActive]);

  const messagesSearchResults = useMemo(() => {
    if (!searchQuery.trim() || !isSearchActive) return [];
    const lowerQuery = searchQuery.toLowerCase();
    
    return conversations.flatMap(conv => {
      return conv.messages
        .filter(m => m.decryptedText?.toLowerCase().includes(lowerQuery) && m.status !== "scheduled")
        .map(m => ({ ...m, convId: conv.id, convName: conv.displayName || conv.id.substring(0, 4), photoUrl: conv.photoUrl }))
        .reverse() // show most recent first
    });
  }, [conversations, searchQuery, isSearchActive]);

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const isNoteToSelf = activeConvId === myId;
  const visibleMessages = activeConv?.messages.filter((m) => m.status !== "scheduled") || [];
  const scheduledMessages = activeConv?.messages.filter((m) => m.status === "scheduled") || [];
  
  const [showScheduledModal, setShowScheduledModal] = useState(false);
  const [openScheduleMenuId, setOpenScheduleMenuId] = useState<string | null>(null);

  const startVoiceRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast("Your browser does not support media devices or it's blocked. Please try in a separate tab.", "error");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      cancelRecordingRef.current = false;
      sendAfterRecordingRef.current = false;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start();
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        
        if (cancelRecordingRef.current) {
          cancelRecordingRef.current = false;
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        setAttachment(audioFile);
        
        if (sendAfterRecordingRef.current) {
          sendAfterRecordingRef.current = false;
          // Use setTimeout to ensure attachment state would have settled, or just manually call send
          setTimeout(() => {
             // We can't easily rely on handleSend directly since attachment is async
             // We'll simulate by calling onSendMessage directly here
             let expireValue = activeConv?.disappearDelay !== undefined ? activeConv.disappearDelay : globalDisappear;
             onSendMessage(
               "", 
               undefined, 
               audioFile, 
               expireValue === -1 ? 0 : expireValue, 
               false,
               replyingTo?.id,
               replyingTo ? {
                  text: (() => {
  if (replyingTo.decryptedText) return replyingTo.decryptedText;
  if (replyingTo.attachmentId) {
    if (replyingTo.isViewOnce) return "💣 View once message";
    const mime = (replyingTo.decryptionKey || "").split("|")[1] || "";
    if (mime.startsWith("audio/")) return "🎤 Voice message";
    if (mime.startsWith("image/")) return "📷 Photo";
    if (mime.startsWith("video/")) return "🎥 Video";
    return "📎 Attachment";
  }
  return "";
})(),
                  senderName: replyingTo.isSelf ? 'You' : (activeConv?.displayName || 'Unknown'),
                  isSelf: replyingTo.isSelf
               } : undefined
             );
             setReplyingTo(null);
             setAttachment(null);
          }, 0);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err) {
      console.error("Microphone error", err);
    }
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      cancelRecordingRef.current = true;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const stopVoiceRecordingAndSend = () => {
    if (mediaRecorderRef.current && isRecording) {
      sendAfterRecordingRef.current = true;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSend = (overrideScheduleTime?: Date, overrideAttachment?: File) => {
    const finalAttachment = overrideAttachment || attachment;
    if (!text.trim() && !finalAttachment) return;
    let sTime: Date | undefined;
    if (overrideScheduleTime) {
      sTime = overrideScheduleTime;
    } else if (scheduleOpen && scheduleTime) {
      sTime = new Date(scheduleTime);
    }
    let expireValue =
      activeConv?.disappearDelay !== undefined
        ? activeConv.disappearDelay
        : globalDisappear;

    // convert attachment
    const atch = finalAttachment ? finalAttachment : undefined;
    onSendMessage(
      text,
      sTime,
      atch,
      expireValue > 0 ? expireValue : undefined,
      isViewOnce,
      replyingTo?.id,
      replyingTo ? {
        text: (() => {
  if (replyingTo.decryptedText) return replyingTo.decryptedText;
  if (replyingTo.attachmentId) {
    if (replyingTo.isViewOnce) return "💣 View once message";
    const mime = (replyingTo.decryptionKey || "").split("|")[1] || "";
    if (mime.startsWith("audio/")) return "🎤 Voice message";
    if (mime.startsWith("image/")) return "📷 Photo";
    if (mime.startsWith("video/")) return "🎥 Video";
    return "📎 Attachment";
  }
  return "";
})(),
        senderName: replyingTo.isSelf ? 'You' : (activeConv?.displayName || 'Unknown'),
        isSelf: replyingTo.isSelf
      } : undefined
    );
    setReplyingTo(null);

    setText("");
    setAttachment(null);
    setIsViewOnce(false);
    setScheduleOpen(false);
    setScheduleTime("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex h-screen w-full bg-neutral-950 text-neutral-200 font-sans overflow-hidden">
      {/* WebRTC Call Screen Overlay */}
      {callState !== "idle" && callingUserId && (
        <CallScreen
          otherUserId={callingUserId}
          otherUserName={conversations.find((c) => c.id === callingUserId)?.displayName || conversations.find((c) => c.id === callingUserId)?.id.substring(0, 4) || "Unknown"}
          otherUserPhoto={conversations.find((c) => c.id === callingUserId)?.photoUrl}
          isVideo={callIsVideo}
          isIncoming={isIncomingCall}
          onAccept={acceptCall}
          onReject={rejectCall}
          onHangup={hangupCall}
          localStream={localStream}
          remoteStream={remoteStream}
          callState={callState}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
        />
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-neutral-950 flex flex-col text-neutral-100 overflow-y-auto">
          <div className="flex flex-col w-full max-w-2xl mx-auto min-h-screen p-4">
            <div className="flex items-center gap-4 mb-8 pt-4">
              <button
                onClick={() => {
                  setShowAdd(false);
                  setNewContactId("");
                }}
                className="p-2 -ml-2 text-neutral-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h1 className="text-2xl font-medium flex-1">New Chat</h1>
            </div>
            
            <div className="relative mb-6 w-full">
              <Search className="w-5 h-5 absolute left-3 top-2.5 text-neutral-500 pointer-events-none" />
              <input
                type="text"
                value={newContactId}
                onChange={(e) => setNewContactId(e.target.value)}
                placeholder="Search by Username..."
                className="w-full bg-neutral-900 text-neutral-200 text-[15px] rounded-full pl-10 pr-4 py-2 outline-none focus:ring-1 focus:ring-neutral-700 transition-all placeholder-neutral-500 border border-neutral-800"
                autoFocus
              />
            </div>
            
            {!newContactId.trim() && (
              <button
                onClick={() => {
                  onAddContact(myId, "Note to Self");
                  setShowAdd(false);
                  setNewContactId("");
                }}
                className="w-full bg-indigo-600/10 text-indigo-400 p-4 rounded-2xl font-medium hover:bg-indigo-600/20 transition-colors mb-6 text-left flex items-center gap-4"
              >
                <DecryptedAvatar 
                  photoUrl={undefined}
                  fallback="NO"
                  className="w-10 h-10 rounded-full shrink-0 shadow-sm"
                />
                <div className="flex-1">
                  <div className="text-lg text-indigo-100">Message Note to Self</div>
                </div>
              </button>
            )}

            <div className="space-y-2">
              <div className="px-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                Search Results
              </div>
              {isSearching ? (
                <div className="text-center p-8 text-neutral-500">Searching...</div>
              ) : searchResults.length === 0 && newContactId.trim() ? (
                <div className="text-center p-8 text-neutral-500">No users found.</div>
              ) : searchResults.length > 0 ? (
                searchResults.filter(u => u.securelyId !== myId).map((u) => (
                  <button
                    key={u.securelyId}
                    onClick={() => {
                      onAddContact(u.securelyId, u.displayName, u.photoUrl, u.about);
                      setShowAdd(false);
                      setNewContactId("");
                    }}
                    className="w-full p-4 flex items-center gap-4 hover:bg-neutral-900 rounded-2xl transition-colors text-left"
                  >
                    <DecryptedAvatar
                      photoUrl={u.photoUrl}
                      fallback={u.displayName && u.displayName !== 'Unknown' ? u.displayName.substring(0, 2).toUpperCase() : u.username ? u.username.substring(0, 2).toUpperCase() : "?"}
                      className="w-12 h-12 rounded-full shrink-0 shadow-sm"
                    />
                    <div className="flex-1 overflow-hidden">
                      <h3 className="font-medium text-lg text-neutral-200 truncate">
                        {u.displayName || "Unknown"}
                      </h3>
                      <p className="text-sm text-neutral-500 truncate">
                        {u.username
                          ? `@${u.username}`
                          : u.securelyId.substring(0, 12) + "..."}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center p-8 text-neutral-500">
                  Type a username, phone number, or securely ID to find someone.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-sm w-full flex flex-col items-center">
            <button
              onClick={() => setShowQrModal(false)}
              className="self-end p-2 text-neutral-400 hover:text-white -mt-4 -mr-4"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-medium mb-6">Your Securely ID</h2>
            <div className="bg-white p-4 rounded-xl mb-6">
              <QRCode value={myId} size={200} />
            </div>
            <p className="text-sm mt-4 text-neutral-500 text-center">
              Have a contact scan this QR code to initiate a secure encrypted
              channel.
            </p>
          </div>
        </div>
      )}

      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-neutral-950 flex flex-col text-neutral-100 overflow-y-auto">
          {profileScreen === "main" && (
            <div className="flex flex-col w-full max-w-2xl mx-auto min-h-screen relative p-4">
              <div className="flex items-center gap-4 mb-10 pt-4">
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="p-2 -ml-2 text-neutral-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-2xl font-medium">Profile</h1>
              </div>
              
              <div className="flex flex-col items-center mb-10">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={profilePhotoInputRef}
                  onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (re) => {
                              if (typeof re.target?.result === "string") {
                                setProfilePhoto(re.target.result);
                                // Encrypt and upload to avoid server seeing the photo
                                import("../crypto").then(({ encryptFile }) => {
                                  encryptFile(file).then(({ encryptedBlob, keyHex, mimeType }) => {
                                    const formData = new FormData();
                                    formData.append("file", encryptedBlob);
                                    fetch("/api/v1/attachments", {
                                      method: "POST",
                                      body: formData,
                                    }).then(res => res.json()).then(data => {
                                      onUpdateProfile({ 
                                        photoUrl: `${data.attachmentId}|${keyHex}|${mimeType}` 
                                      });
                                    }).catch(err => { if (err.message !== 'Failed to fetch') console.error(err); });
                                  });
                                });
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                  }}
                />
                <button 
                  onClick={() => profilePhotoInputRef.current?.click()}
                  className="relative group w-32 h-32 rounded-full overflow-hidden shrink-0 shadow-xl mb-4"
                >
                  <DecryptedAvatar 
                    photoUrl={profilePhoto}
                    fallback={profileName.substring(0, 2).toUpperCase() || "ME"}
                    className="w-32 h-32 rounded-full text-4xl"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10 cursor-pointer">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </button>
                <button 
                  onClick={() => profilePhotoInputRef.current?.click()}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-full text-sm font-medium transition-colors"
                >
                  Edit photo
                </button>
              </div>

              <div className="space-y-1">
                <button 
                  onClick={() => setProfileScreen("name")}
                  className="w-full flex items-center gap-5 p-4 hover:bg-neutral-900 rounded-2xl transition-colors text-left"
                >
                  <div className="w-10 h-10 flex items-center justify-center text-neutral-400">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="flex-1 border-b border-neutral-800 pb-4 pt-1">
                    <p className="text-lg font-normal">{profileName || "Add your name"}</p>
                    <p className="text-sm text-neutral-500">Name</p>
                  </div>
                </button>
                
                <button 
                  onClick={() => setProfileScreen("about")}
                  className="w-full flex items-center gap-5 p-4 hover:bg-neutral-900 rounded-2xl transition-colors text-left"
                >
                  <div className="w-10 h-10 flex items-center justify-center text-neutral-400">
                    <Pencil className="w-6 h-6 fill-current" />
                  </div>
                  <div className="flex-1 border-b border-neutral-800 pb-4 pt-1">
                    <p className="text-lg font-normal">{profileAbout || "Write a few words about yourself"}</p>
                    <p className="text-sm text-neutral-500">About</p>
                  </div>
                </button>

                <div className="px-4 py-3 pb-8 text-sm text-neutral-500">
                  Your profile and changes to it will be visible to people you message, contacts, and groups.
                </div>

                <div className="w-full h-px bg-neutral-800 mb-2"></div>

                <button 
                  onClick={() => setProfileScreen("username")}
                  className="w-full flex items-center gap-5 p-4 hover:bg-neutral-900 rounded-2xl transition-colors text-left"
                >
                  <div className="w-10 h-10 flex items-center justify-center text-neutral-400">
                    <AtSign className="w-6 h-6" />
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-lg font-normal">{profileUsername ? `@${profileUsername}` : "Set Username"}</p>
                    <p className="text-sm text-neutral-500">Username</p>
                  </div>
                </button>

                <div className="px-4 py-3 text-sm text-neutral-500">
                  People can now message you using your optional username so you don't have to give out your phone number.
                </div>
              </div>
            </div>
          )}

          {profileScreen === "name" && (
            <div className="flex flex-col w-full max-w-2xl mx-auto min-h-screen p-4">
              <div className="flex items-center gap-4 mb-10 pt-4">
                <button
                  onClick={() => setProfileScreen("main")}
                  className="p-2 -ml-2 text-neutral-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-2xl font-medium flex-1">Your name</h1>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1 ml-1">Name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full bg-neutral-900 text-white rounded-2xl p-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all border border-neutral-800 text-lg"
                    placeholder="Your name"
                    autoFocus
                  />
                </div>
                
                <div className="flex justify-end pt-8">
                  <button
                    onClick={() => {
                      onUpdateProfile({ displayName: profileName });
                      setProfileScreen("main");
                    }}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-medium transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {profileScreen === "about" && (
            <div className="flex flex-col w-full max-w-2xl mx-auto min-h-screen p-4">
              <div className="flex items-center gap-4 mb-10 pt-4">
                <button
                  onClick={() => setProfileScreen("main")}
                  className="p-2 -ml-2 text-neutral-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-2xl font-medium flex-1">About</h1>
              </div>
              
              <div className="space-y-6">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400">
                    <Pencil className="h-5 w-5" />
                  </div>
                  <input
                    type="text"
                    value={profileAbout}
                    onChange={(e) => setProfileAbout(e.target.value)}
                    className="w-full bg-transparent text-white border-b-2 border-indigo-500 p-3 pl-12 outline-none text-lg"
                    placeholder="Write a few words about yourself"
                    autoFocus
                  />
                  {profileAbout && (
                    <button 
                      onClick={() => setProfileAbout("")}
                      className="absolute inset-y-0 right-0 pr-2 flex items-center text-neutral-400 hover:text-white"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
                
                <div className="flex justify-end pt-8">
                  <button
                    onClick={() => {
                      onUpdateProfile({ about: profileAbout });
                      setProfileScreen("main");
                    }}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-medium transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {profileScreen === "username" && (
            <div className="flex flex-col w-full max-w-2xl mx-auto min-h-screen p-4">
              <div className="flex items-center gap-4 mb-10 pt-4">
                <button
                  onClick={() => setProfileScreen("main")}
                  className="p-2 -ml-2 text-neutral-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-2xl font-medium flex-1">Username</h1>
              </div>
              
              <div className="flex flex-col items-center mb-10">
                <div className="w-24 h-24 rounded-full bg-neutral-900 flex items-center justify-center mb-6">
                  <AtSign className="w-12 h-12 text-neutral-400" />
                </div>
                <h2 className="text-xl font-medium mb-8">Choose your username</h2>
                
                <div className="w-full relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400">
                    @
                  </div>
                  <input
                    type="text"
                    value={profileUsername}
                    onChange={(e) => setProfileUsername(e.target.value)}
                    className="w-full bg-neutral-900 text-white rounded-t-lg border-b-2 border-indigo-500 p-4 pl-10 outline-none text-lg"
                    placeholder="Username"
                    autoFocus
                  />
                </div>
                
                <div className="w-full mt-4 text-sm text-neutral-500">
                  Usernames let people contact you without knowing your phone number. 
                  You can change this at any time.
                </div>
                
                <div className="w-full flex justify-end pt-12">
                  <button
                    onClick={() => {
                      onUpdateProfile({ username: profileUsername });
                      setProfileScreen("main");
                    }}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-medium transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      
      {/* ---------------- NEW GROUP MODAL ---------------- */}
      <AnimatePresence>
        {showNewGroup && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden h-[80vh] md:h-auto md:max-h-[85vh]"
            >
              <div className="flex justify-between items-center p-4 border-b border-neutral-800 bg-neutral-950">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowNewGroup(false)}
                    className="p-2 -ml-2 rounded-full hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white"
                  >
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                  <h2 className="text-xl font-medium text-white">Name this group</h2>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-8">
                <div className="flex items-center gap-4">
                  <button className="w-14 h-14 rounded-full bg-neutral-800 flex items-center justify-center shrink-0 hover:bg-neutral-700 transition-colors text-neutral-400">
                    <Camera className="w-6 h-6" />
                  </button>
                  <div className="flex-1 border-b border-neutral-700 pb-1">
                    <input 
                      type="text" 
                      placeholder="Group name (required)" 
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="w-full bg-transparent border-none outline-none text-white text-lg placeholder-neutral-500"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="w-6 h-6 text-neutral-400" />
                    <span className="text-lg text-white">Disappearing messages</span>
                  </div>
                  <span className="text-neutral-400 text-lg">Off</span>
                </div>

                <div className="border-t border-neutral-800 pt-6">
                  <h3 className="text-lg font-medium text-white mb-2">Members</h3>
                  <p className="text-neutral-400 text-base">You can add or invite friends after creating this group.</p>
                </div>

                {groupLink && (
                  <div className="mt-8 p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-2xl">
                    <p className="text-sm font-medium text-indigo-400 mb-2">Group Link Generated</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-300 truncate flex-1">{groupLink}</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(groupLink);
                          toast("Link copied!", "success");
                        }}
                        className="p-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex justify-end">
                {groupLink ? (
                  <button
                    onClick={() => {
                      setShowNewGroup(false);
                      setGroupLink("");
                      setGroupName("");
                    }}
                    className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white font-medium rounded-full transition-colors"
                  >
                    Done
                  </button>
                ) : (
                  <button
                    disabled={!groupName.trim()}
                    onClick={() => {
                      // Generate link exactly like we do for video calls
                      const id = crypto.randomUUID ? crypto.randomUUID().split("-")[0] : Math.random().toString(36).substring(7);
                      setGroupLink(window.location.origin + "?group=" + id);
                    }}
                    className="px-6 py-2.5 bg-neutral-200 disabled:bg-neutral-800 text-neutral-900 disabled:text-neutral-500 font-medium rounded-full transition-colors"
                  >
                    Create
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------- NOTIFICATION PROFILES BOTTOM SHEET ---------------- */}
      <AnimatePresence>
        {showNotificationProfile && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={() => setShowNotificationProfile(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-md bg-neutral-100 rounded-t-3xl sm:rounded-3xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="w-12 h-1 bg-neutral-300 rounded-full mx-auto mt-3 mb-2" />
              <div className="p-2 space-y-1">
                <button 
                   onClick={() => {
                     setShowNotificationProfile(false);
                     setShowNotificationProfileSettings(true);
                   }}
                   className="w-full flex items-center justify-between p-4 bg-white hover:bg-neutral-50 rounded-2xl transition-colors mb-2 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center text-2xl shadow-sm">
                      💪
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-medium text-neutral-900">Work</h3>
                      <p className="text-neutral-500 text-sm">Off</p>
                    </div>
                  </div>
                  <ChevronLeft className="w-6 h-6 text-neutral-400 rotate-180" />
                </button>
                
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-neutral-100 mb-2">
                   <button className="w-full text-left p-4 hover:bg-neutral-50 transition-colors text-neutral-900 text-[17px]">
                     For 1 hour
                   </button>
                   <button className="w-full text-left p-4 hover:bg-neutral-50 transition-colors text-neutral-900 text-[17px]">
                     Until 6:00 PM
                   </button>
                   <button 
                     onClick={() => {
                       setShowNotificationProfile(false);
                       setShowNotificationProfileSettings(true);
                     }}
                     className="w-full text-left p-4 hover:bg-neutral-50 transition-colors text-neutral-900 text-[17px]"
                   >
                     View settings
                   </button>
                </div>

                <button 
                  onClick={() => {
                     setShowNotificationProfile(false);
                     setShowNotificationProfileSettings(true);
                  }}
                  className="w-full flex items-center gap-4 p-4 bg-white hover:bg-neutral-50 rounded-2xl transition-colors shadow-sm"
                >
                  <div className="w-12 h-12 rounded-full border border-neutral-300 flex items-center justify-center">
                    <Plus className="w-6 h-6 text-neutral-700" />
                  </div>
                  <span className="text-[17px] font-medium text-neutral-900">New profile</span>
                </button>
              </div>
              <div className="h-6" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------- NOTIFICATION PROFILE SETTINGS ---------------- */}
      <AnimatePresence>
        {showNotificationProfileSettings && (
          <div className="fixed inset-0 z-50 bg-neutral-100 flex flex-col">
            <motion.div
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="flex-1 flex flex-col w-full h-full bg-neutral-100"
            >
              <div className="flex items-center gap-4 p-4 bg-neutral-100 sticky top-0 z-10 border-b border-neutral-200">
                <button 
                  onClick={() => setShowNotificationProfileSettings(false)} 
                  className="p-2 -ml-2 rounded-full hover:bg-neutral-200 transition-colors text-neutral-700"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-2xl font-medium text-neutral-900 flex-1">Work</h1>
                <button className="p-2 text-neutral-700 hover:bg-neutral-200 rounded-full transition-colors">
                  <Edit2 className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="p-4 bg-white mb-2 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center text-2xl shadow-sm">
                      💪
                    </div>
                    <span className="text-[17px] text-neutral-900 font-medium">Work</span>
                  </div>
                  <div className="w-12 h-6 bg-neutral-300 rounded-full relative cursor-pointer">
                    <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm" />
                  </div>
                </div>

                <div className="bg-white mb-2 shadow-sm py-4">
                  <h3 className="px-4 text-base font-medium text-neutral-900 mb-4">Allowed notifications</h3>
                  <button className="w-full flex items-center gap-4 px-4 py-2 hover:bg-neutral-50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center shrink-0 border border-neutral-200">
                      <Plus className="w-6 h-6 text-neutral-700" />
                    </div>
                    <span className="text-[17px] text-neutral-900">Add people or groups</span>
                  </button>
                </div>

                <div className="bg-white mb-2 shadow-sm py-4">
                  <h3 className="px-4 text-base font-medium text-neutral-900 mb-4">Schedule</h3>
                  <button className="w-full flex items-center gap-4 px-4 py-2 hover:bg-neutral-50 transition-colors">
                    <div className="w-6 h-6 flex items-center justify-center shrink-0">
                      <Clock className="w-6 h-6 text-neutral-700" />
                    </div>
                    <div className="text-left">
                      <p className="text-[17px] text-neutral-900">Schedule</p>
                      <p className="text-[15px] text-neutral-500">Off</p>
                    </div>
                  </button>
                </div>

                <div className="bg-white mb-2 shadow-sm py-4">
                  <h3 className="px-4 text-base font-medium text-neutral-900 mb-4">Exceptions</h3>
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-4">
                      <Phone className="w-6 h-6 text-neutral-700" />
                      <span className="text-[17px] text-neutral-900">Allow all calls</span>
                    </div>
                    <div className="w-12 h-6 bg-indigo-600 rounded-full relative cursor-pointer">
                      <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow-sm" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-4">
                      <span className="w-6 h-6 text-neutral-700 font-medium text-xl flex items-center justify-center">@</span>
                      <span className="text-[17px] text-neutral-900">Notify for all mentions</span>
                    </div>
                    <div className="w-12 h-6 bg-neutral-300 rounded-full relative cursor-pointer">
                      <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm" />
                    </div>
                  </div>
                </div>

                <button className="w-full bg-white p-4 flex items-center gap-4 shadow-sm hover:bg-neutral-50 transition-colors mt-6 mb-12">
                  <Trash2 className="w-6 h-6 text-red-500" />
                  <span className="text-[17px] text-red-500">Delete profile</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-neutral-800 bg-neutral-900/50">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-400" />
                Settings
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-8 overflow-y-auto max-h-[70vh]">
              {/* Privacy Section */}
              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Privacy
                </h3>
                
                <div className="flex items-center justify-between bg-neutral-800/50 p-4 rounded-2xl border border-neutral-800">
                  <div>
                    <p className="font-medium text-neutral-200">
                      Discoverability
                    </p>
                    <p className="text-xs text-neutral-500 mt-1 leading-relaxed max-w-[240px]">
                      Allow others to find you via username or phone search. 
                      <span className="block mt-1">Users with your Securely ID can still connect.</span>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const next = !isDiscoverable;
                      setIsDiscoverable(next);
                      onUpdateProfile({ discoverable: next });
                    }}
                    className={`w-12 h-6 rounded-full transition-colors relative shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-neutral-900 ${isDiscoverable ? "bg-indigo-600" : "bg-neutral-700"}`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${isDiscoverable ? "translate-x-6" : "translate-x-0.5"}`}
                    ></div>
                  </button>
                </div>
              </section>

              {/* Messaging Section */}
              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Messaging
                </h3>
                
                <div className="bg-neutral-800/50 p-4 rounded-2xl border border-neutral-800 space-y-4">
                  <div>
                    <p className="font-medium text-neutral-200">
                      Global Disappearing Messages
                    </p>
                    <p className="text-xs text-neutral-500 mt-1 mb-4 leading-relaxed">
                      Set a default expiration timer for all new messages sent across your conversations.
                    </p>
                  </div>
                  
                  <div className="relative">
                    <select
                      value={globalDisappear}
                      onChange={(e) => {
                        const v = parseInt(e.target.value);
                        setGlobalDisappear(v);
                        localStorage.setItem("global_disappear", v.toString());
                      }}
                      className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-xl py-3 px-4 outline-none focus:border-indigo-500 appearance-none transition-colors"
                    >
                      <option value={0}>Off</option>
                      <option value={60}>1 Minute</option>
                      <option value={120}>2 Minutes</option>
                      <option value={300}>5 Minutes</option>
                      <option value={1800}>30 Minutes</option>
                      <option value={3600}>1 Hour</option>
                      <option value={86400}>1 Day</option>
                      <option value={259200}>3 Days</option>
                      <option value={2592000}>1 Month</option>
                    </select>
                    <div className="absolute right-4 top-3.5 pointer-events-none text-neutral-400">
                      <ChevronDown className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Custom timer (seconds)"
                      className="flex-1 bg-neutral-900 border border-neutral-700 text-white rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-colors placeholder:text-neutral-600"
                      value={globalCustomDisappearInput}
                      onChange={(e) => setGlobalCustomDisappearInput(e.target.value)}
                    />
                    <button
                      onClick={() => {
                        const val = parseInt(globalCustomDisappearInput);
                        if (!isNaN(val) && val > 0) {
                          setGlobalDisappear(val);
                          localStorage.setItem("global_disappear", val.toString());
                          setGlobalCustomDisappearInput("");
                        }
                      }}
                      className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 px-5 py-3 rounded-xl font-medium transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-neutral-900"
                    >
                      Set
                    </button>
                  </div>
                </div>
              </section>

              {/* How it Works Section */}
              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4" />
                  How it Works
                </h3>
                
                <div className="bg-neutral-800/50 p-4 rounded-2xl border border-neutral-800 space-y-4 text-sm text-neutral-300">
                  <div>
                    <h4 className="font-medium text-neutral-200 mb-1 flex items-center gap-1.5"><Key className="w-4 h-4 text-indigo-400" /> End-to-End Encryption</h4>
                    <p className="text-neutral-500 leading-relaxed">
                      Every message, photo, and voice memo is encrypted on your device before sending. Only you and your recipient have the keys to decrypt them. The server never sees your content.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-neutral-200 mb-1 flex items-center gap-1.5"><Clock className="w-4 h-4 text-indigo-400" /> Disappearing Messages</h4>
                    <p className="text-neutral-500 leading-relaxed">
                      The expiration timer starts only after a message has been sent (for you) or read (for the recipient). Once the timer runs out, the message is permanently deleted from both devices.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-neutral-200 mb-1 flex items-center gap-1.5"><User className="w-4 h-4 text-indigo-400" /> Note to Self</h4>
                    <p className="text-neutral-500 leading-relaxed">
                      Your personal space to save links, memos, and files. Notes to yourself are also encrypted and can be scheduled for a future time as reminders.
                    </p>
                  </div>
                </div>
              </section>

              {/* Account Section */}
              <section className="space-y-4 pt-4 border-t border-neutral-800">
                <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Account
                </h3>
                
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      if (window.confirm("Are you sure you want to log out?")) {
                        if (onLogout) {
                          onLogout();
                        } else {
                          localStorage.removeItem("signal_identity");
                          window.location.href = "/";
                       }
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 py-3.5 rounded-xl font-medium transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Log Out
                  </button>
  
                  <button
                    onClick={async () => {
                      if (window.confirm("Are you absolutely sure you want to DELETE your account? This cannot be undone.")) {
                        try {
                          const res = await fetch(`/api/v1/users?securelyId=${myId}`, { method: 'DELETE' });
                          if (res.ok) {
                            if (onLogout) {
                              onLogout();
                            } else {
                              localStorage.removeItem("signal_identity");
                              window.location.href = "/";
                            }
                          } else {
                            toast("Failed to delete account.", "error");
                          }
                        } catch (e) {
                           toast("Error deleting account.", "error");
                        }
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 py-3.5 rounded-xl font-medium transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Account
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`w-full md:w-80 lg:w-96 shrink-0 bg-neutral-900 border-r border-neutral-800 flex flex-col relative ${activeConvId ? "hidden md:flex" : "flex"}`}
      >      {/* Global Chat Menu */}
      <AnimatePresence>
        {showChatMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setShowChatMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-4 top-16 w-56 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl z-50 overflow-hidden py-2"
            >
              <button 
                onClick={() => { setShowChatMenu(false); setShowNewGroup(true); }}
                className="w-full text-left px-4 py-3 hover:bg-neutral-800 transition-colors flex items-center gap-3 text-sm"
              >
                <Users className="w-5 h-5 text-neutral-400" /> New group
              </button>
              <button className="w-full text-left px-4 py-3 hover:bg-neutral-800 transition-colors flex items-center gap-3 text-sm">
                <CheckSquare className="w-5 h-5 text-neutral-400" /> Mark all read
              </button>
              <button className="w-full text-left px-4 py-3 hover:bg-neutral-800 transition-colors flex items-center gap-3 text-sm">
                <Filter className="w-5 h-5 text-neutral-400" /> Filter unread chats
              </button>
              <button 
                onClick={() => { setShowChatMenu(false); setShowNotificationProfile(true); }}
                className="w-full text-left px-4 py-3 hover:bg-neutral-800 transition-colors flex items-center gap-3 text-sm"
              >
                <Bell className="w-5 h-5 text-neutral-400" /> Notification profile
              </button>
              <button className="w-full text-left px-4 py-3 hover:bg-neutral-800 transition-colors flex items-center gap-3 text-sm">
                <Archive className="w-5 h-5 text-neutral-400" /> Archived chats
              </button>
              <button 
                onClick={() => { setShowChatMenu(false); setShowSettings(true); }}
                className="w-full text-left px-4 py-3 hover:bg-neutral-800 transition-colors flex items-center gap-3 text-sm"
              >
                <Settings className="w-5 h-5 text-neutral-400" /> Settings
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
        {activeTab === "chats" && (<div className="p-4 flex items-center justify-between border-b border-neutral-800 h-[73px]">
          <AnimatePresence mode="wait">
            {!isSearchActive ? (
              <motion.div 
                key="header-default"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowProfileModal(true)}
                    className="rounded-full shadow-lg shrink-0 overflow-hidden hover:opacity-80 transition-opacity"
                  >
                    <DecryptedAvatar 
                      photoUrl={myPhoto}
                      fallback={myName ? myName.substring(0, 2).toUpperCase() : "ME"}
                      className="w-10 h-10 rounded-full"
                    />
                  </button>
                </div>
                <div className="flex items-center gap-4 shrink-0 text-neutral-400">
                  <button
                    onClick={() => setIsSearchActive(true)}
                    className="cursor-pointer hover:text-white transition-colors"
                  >
                    <Search className="w-6 h-6" />
                  </button>
                  <div className="relative flex items-center">
                    <button
                      onClick={() => setShowChatMenu(!showChatMenu)}
                      className="cursor-pointer hover:text-white transition-colors"
                    >
                      <MoreVertical className="w-6 h-6" />
                    </button>

                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="header-search"
                initial={{ opacity: 0, flex: 0 }}
                animate={{ opacity: 1, flex: 1 }}
                exit={{ opacity: 0, flex: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center w-full"
              >
                <div className="relative w-full flex items-center gap-3">
                  <button 
                    onClick={() => {
                      setIsSearchActive(false);
                      setSearchQuery("");
                    }}
                    className="p-2 -ml-2 text-neutral-400 hover:text-neutral-200 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="relative flex-1">
                    <Search className="w-5 h-5 absolute left-3 top-2.5 text-neutral-500 pointer-events-none" />
                    <input
                      autoFocus
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search messages..."
                      className="w-full bg-neutral-900 text-neutral-200 text-[15px] rounded-full pl-10 pr-4 py-2 outline-none focus:ring-1 focus:ring-neutral-700 transition-all placeholder-neutral-500 border border-neutral-800"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>)}
        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
          {activeTab === "chats" ? (
            <>
              <div className="flex-1 overflow-y-auto h-full w-full">
            {!isSearchActive || !searchQuery.trim() ? (
            filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 flex flex-col items-center justify-center h-full">
                <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">No active conversations.</p>
                <button
                  onClick={() => setShowAdd(!showAdd)}
                  className="text-indigo-400 hover:text-indigo-300 text-sm mt-3 border border-indigo-500/30 px-4 py-1.5 rounded-full transition-colors"
                >
                  Start a secure chat
                </button>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => onSelectConv(conv.id)}
                  className={`w-full p-3 flex items-center gap-3 transition-colors text-left border-b border-neutral-800/50 ${activeConvId === conv.id ? "bg-neutral-800" : "hover:bg-neutral-800/50"}`}
                >
                  <DecryptedAvatar 
                    photoUrl={conv.photoUrl}
                    fallback={conv.displayName && conv.displayName !== 'Unknown' ? conv.displayName.substring(0, 2).toUpperCase() : "?"}
                    className="w-12 h-12 rounded-full shrink-0 shadow-sm"
                  />
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className="font-medium text-neutral-200 truncate">
                        {conv.displayName || "Unknown"}
                      </h3>
                      <span className="text-xs text-neutral-500 shrink-0">
                        {conv.messages.length > 0 &&
                          new Date(
                            conv.messages[conv.messages.length - 1].timestamp,
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-500 truncate">
                      {(() => {
                        if (conv.messages.length === 0) return "Encrypted session started";
                        const lastMsg = conv.messages[conv.messages.length - 1];
                        if (lastMsg.decryptedText) return lastMsg.decryptedText;
                        if (lastMsg.attachmentId) {
                          if (lastMsg.isViewOnce) return "💣 View once message";
                          const mime = (lastMsg.decryptionKey || "").split("|")[1] || "";
                          if (mime.startsWith("audio/")) return "🎤 Voice message";
                          if (mime.startsWith("image/")) return "📷 Photo";
                          if (mime.startsWith("video/")) return "🎥 Video";
                          return "📎 Attachment";
                        }
                        return "Encrypted message";
                      })()}
                    </p>
                  </div>
                </button>
              ))
            )
          ) : (
            <div className="py-2">
              {filteredConversations.length === 0 && messagesSearchResults.length === 0 ? (
                <div className="p-8 text-center text-neutral-500">No results found.</div>
              ) : (
                <>
                  {filteredConversations.length > 0 && (
                    <div className="mb-4">
                      <div className="px-4 py-1 text-xs font-semibold text-neutral-500 tracking-wider uppercase">Chats</div>
                      {filteredConversations.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => {
                            onSelectConv(conv.id);
                            setIsSearchActive(false);
                            setSearchQuery("");
                          }}
                          className={`w-full p-3 flex items-center gap-3 transition-colors text-left border-b border-neutral-800/50 ${activeConvId === conv.id ? "bg-neutral-800" : "hover:bg-neutral-800/50"}`}
                        >
                          <DecryptedAvatar 
                            photoUrl={conv.photoUrl}
                            fallback={conv.displayName && conv.displayName !== 'Unknown' ? conv.displayName.substring(0, 2).toUpperCase() : "?"}
                            className="w-10 h-10 rounded-full shrink-0 shadow-sm"
                          />
                          <div className="flex-1 overflow-hidden">
                            <h3 className="font-medium text-neutral-200 truncate">
                              {conv.displayName || "Unknown"}
                            </h3>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {messagesSearchResults.length > 0 && (
                    <div>
                      <div className="px-4 py-1 text-xs font-semibold text-neutral-500 tracking-wider uppercase border-b border-neutral-800/50">Messages</div>
                      {messagesSearchResults.map((msg) => (
                        <button
                          key={msg.id}
                          onClick={() => {
                            onSelectConv(msg.convId);
                            setIsSearchActive(false);
                            setSearchQuery("");
                            setHighlightMsgId(msg.id);
                          }}
                          className="w-full p-3 transition-colors text-left border-b border-neutral-800/50 hover:bg-neutral-800/50 flex gap-3"
                        >
                          <DecryptedAvatar 
                            photoUrl={msg.photoUrl}
                            fallback={msg.convName && msg.convName !== 'Unknown' ? msg.convName.substring(0, 2).toUpperCase() : "?"}
                            className="w-8 h-8 rounded-full shrink-0 shadow-sm mt-1"
                          />
                          <div className="flex-1 overflow-hidden min-w-0">
                            <div className="flex justify-between items-baseline mb-0.5">
                              <span className="font-medium text-sm text-neutral-300 truncate">{msg.convName}</span>
                              <span className="text-xs text-neutral-500 shrink-0">
                                {new Date(msg.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })}
                              </span>
                            </div>
                            <p className="text-sm text-neutral-400 break-words line-clamp-2">
                              {(() => {
                                if (!isSearchActive || !searchQuery.trim() || !msg.decryptedText) return msg.decryptedText;
                                const lowerText = msg.decryptedText.toLowerCase();
                                const lowerQuery = searchQuery.toLowerCase();
                                const matchIndex = lowerText.indexOf(lowerQuery);
                                if (matchIndex === -1) return msg.decryptedText;
                                return (
                                  <>
                                    {msg.decryptedText.substring(0, matchIndex)}
                                    <span className="bg-yellow-900/50 text-yellow-100 rounded-sm px-0.5">
                                      {msg.decryptedText.substring(matchIndex, matchIndex + searchQuery.length)}
                                    </span>
                                    {msg.decryptedText.substring(matchIndex + searchQuery.length)}
                                  </>
                                );
                              })()}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            )}
            </div>
            <AnimatePresence>
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={() => setShowAdd(!showAdd)}
                className="absolute bottom-4 right-6 w-14 h-14 bg-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-indigo-400 transition-colors z-40"
                title="New Chat"
              >
                <Pencil className="w-6 h-6 fill-current" />
              </motion.button>
            </AnimatePresence>
          </>
        ) : activeTab === "calls" ? (
            <div className="flex-1 flex flex-col min-h-0 bg-neutral-950 overflow-hidden">
              <CallsTab 
                 conversations={conversations.filter(c => c.id !== myId)} 
                 onStartCall={(userId, isVideo) => {
                    onSelectConv(userId);
                    // Slight delay to allow state to settle
                    setTimeout(() => startCallDialog(isVideo, userId), 50);
                 }}
                 onMenuClick={() => setShowChatMenu(!showChatMenu)}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-neutral-500 text-center">
              <CircleDashed className="w-12 h-12 mb-3 opacity-20" />
              <h3 className="text-lg font-medium text-neutral-200 mb-2">Stories</h3>
              <p className="text-sm">Stories and status updates coming soon.</p>
            </div>
          )}
        
        </div>
        {/* Bottom Tab Bar */}
        <div className="flex items-center justify-around border-t border-neutral-800 bg-neutral-900 shrink-0 z-30 pt-2 pb-4">
          <button
            onClick={() => setActiveTab("chats")}
            className={`flex flex-col items-center gap-1 w-full transition-colors ${activeTab === "chats" ? "text-indigo-400" : "text-neutral-500 hover:text-neutral-300"}`}
          >
            <div className={`px-4 py-1 rounded-full ${activeTab === "chats" ? "bg-indigo-500/15" : ""}`}>
              <MessageSquare className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-medium">Chats</span>
          </button>
          
          <button
            onClick={() => setActiveTab("calls")}
            className={`flex flex-col items-center gap-1 w-full transition-colors ${activeTab === "calls" ? "text-indigo-400" : "text-neutral-500 hover:text-neutral-300"}`}
          >
            <div className={`px-4 py-1 rounded-full ${activeTab === "calls" ? "bg-indigo-500/15" : ""}`}>
              <Phone className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-medium">Calls</span>
          </button>
          
          <button
            onClick={() => setActiveTab("stories")}
            className={`flex flex-col items-center gap-1 w-full transition-colors ${activeTab === "stories" ? "text-indigo-400" : "text-neutral-500 hover:text-neutral-300"}`}
          >
            <div className={`px-4 py-1 rounded-full ${activeTab === "stories" ? "bg-indigo-500/15" : ""}`}>
              <CircleDashed className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-medium">Stories</span>
          </button>
        </div>

        
      </div>

      {/* Main Chat Area */}
      <div
        className={`flex-1 flex flex-col bg-neutral-950 relative min-w-0 ${!activeConvId ? "hidden md:flex" : "flex"}`}
      >
        {activeConvId ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-neutral-800 flex items-center px-4 bg-neutral-900/80 backdrop-blur-md z-10 sticky top-0 shrink-0 justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  className="md:hidden p-2 -ml-2 text-neutral-400 shrink-0"
                  onClick={() => onSelectConv("")}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity min-w-0 flex-1"
                  onClick={() => setShowChatSettings(true)}
                >
                  <DecryptedAvatar 
                    photoUrl={activeConv?.photoUrl}
                    fallback={activeConv?.displayName && activeConv.displayName !== 'Unknown' ? activeConv.displayName.substring(0, 2).toUpperCase() : "?"}
                    className="w-10 h-10 rounded-full shrink-0 shadow-sm"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-neutral-100 truncate flex items-center gap-1.5">
                      {isNoteToSelf ? "Note to Self" : (activeConv?.displayName || "Unknown")}
                      {isNoteToSelf && <BadgeCheck className="w-4 h-4 text-indigo-400 shrink-0" />}
                    </h3>
                    <p className="text-xs text-neutral-500 mb-1 truncate">
                      {activeConv?.disappearDelay !== undefined && activeConv.disappearDelay > 0
                        ? `Disappearing in ${activeConv.disappearDelay}s`
                        : (activeConv?.disappearDelay === undefined || activeConv?.disappearDelay === -1) && globalDisappear > 0
                        ? `Default: Disappearing in ${globalDisappear}s`
                        : "Tap for chat settings"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {activeConv?.id !== myId && (
                  <>
                    <button
                      onClick={() => startCallDialog(false, activeConvId || undefined)}
                      className="p-2 bg-neutral-800 rounded-full hover:bg-neutral-700 text-neutral-400"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => startCallDialog(true, activeConvId || undefined)}
                      className="p-2 bg-neutral-800 rounded-full hover:bg-neutral-700 text-neutral-400"
                    >
                      <Video className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowQrModal(true)}
                  className="p-2 bg-neutral-800 rounded-full hover:bg-neutral-700 text-neutral-400"
                >
                  <QrCode className="w-4 h-4" />
                </button>
              </div>
            </div>

            {activeConv?.disappearDelay !== undefined && activeConv.disappearDelay > 0 ? (
              <div className="bg-indigo-600/10 border-b border-indigo-500/20 py-2 px-4 shadow-sm text-center text-[13px] font-medium text-indigo-300 flex justify-center items-center gap-2 shrink-0 z-0">
                <Clock className="w-3.5 h-3.5" />
                You set the disappear message timer for {activeConv.disappearDelay} seconds
              </div>
            ) : (activeConv?.disappearDelay === undefined || activeConv?.disappearDelay === -1) && globalDisappear > 0 ? (
              <div className="bg-indigo-600/10 border-b border-indigo-500/20 py-2 px-4 shadow-sm text-center text-[13px] font-medium text-indigo-300 flex justify-center items-center gap-2 shrink-0 z-0">
                <Clock className="w-3.5 h-3.5" />
                (Default) You set the disappear message timer for {globalDisappear} seconds
              </div>
            ) : null}

            {showChatSettings && (
              <div className="fixed inset-0 z-50 bg-neutral-950 flex flex-col text-neutral-100 overflow-y-auto">
                <div className="flex flex-col w-full max-w-2xl mx-auto min-h-screen p-4">
                  {chatSettingsView === "main" ? (
                    <>
                      <div className="flex items-center gap-4 mb-10 pt-4">
                        <button
                          onClick={() => setShowChatSettings(false)}
                          className="p-2 -ml-2 text-neutral-400 hover:text-white transition-colors"
                        >
                          <ArrowLeft className="w-6 h-6" />
                        </button>
                      </div>
                      
                      <div className="flex flex-col items-center mb-12">
                        <DecryptedAvatar 
                          photoUrl={activeConv?.photoUrl}
                          fallback={activeConv?.displayName && activeConv.displayName !== 'Unknown' ? activeConv.displayName.substring(0, 2).toUpperCase() : "?"}
                          className="w-32 h-32 rounded-full shadow-xl mb-6 text-2xl"
                        />
                        <h1 className="text-3xl font-medium flex items-center justify-center gap-2">
                          {activeConv?.displayName || "Unknown"}
                        </h1>
                      </div>

                      {activeConv?.about && (
                        <div className="px-4 mb-8">
                          <p className="text-neutral-500 text-sm font-medium mb-1">About</p>
                          <p className="text-neutral-200 text-lg">{activeConv.about}</p>
                        </div>
                      )}

                      <div className="flex-1 w-full border-t border-neutral-800">
                        <button
                          onClick={() => {
                            setTempDisappearDelay(activeConv?.disappearDelay === undefined ? -1 : activeConv.disappearDelay);
                            setChatSettingsView("disappear");
                          }}
                          className="w-full text-left py-4 px-4 flex items-center justify-between hover:bg-neutral-900 transition-colors border-b border-neutral-800"
                        >
                          <div className="flex items-center gap-4">
                            <Clock className="w-6 h-6 text-neutral-400 shrink-0" />
                            <div>
                              <p className="text-lg font-medium text-neutral-200">Disappearing messages</p>
                              <p className="text-sm text-neutral-400">
                                {activeConv?.disappearDelay === undefined || activeConv?.disappearDelay === -1
                                  ? `Use Global Setting (${globalDisappear === 0 ? "Off" : globalDisappear + "s"})`
                                  : activeConv.disappearDelay === 0
                                  ? "Off"
                                  : activeConv.disappearDelay >= 604800
                                  ? `${activeConv.disappearDelay / 604800} weeks`
                                  : activeConv.disappearDelay >= 86400
                                  ? `${activeConv.disappearDelay / 86400} days`
                                  : activeConv.disappearDelay >= 3600
                                  ? `${activeConv.disappearDelay / 3600} hours`
                                  : activeConv.disappearDelay >= 60
                                  ? `${activeConv.disappearDelay / 60} minutes`
                                  : `${activeConv.disappearDelay} seconds`}
                              </p>
                            </div>
                          </div>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-4 mb-6 pt-4 shrink-0">
                        <button
                          onClick={() => {
                            setChatSettingsView("main");
                            setTempDisappearDelay(-1);
                          }}
                          className="p-2 -ml-2 text-neutral-400 hover:text-white transition-colors"
                        >
                          <ArrowLeft className="w-6 h-6" />
                        </button>
                        <h1 className="text-2xl font-medium">Disappearing messages</h1>
                      </div>

                      <div className="flex-1 overflow-y-auto w-full">
                        <p className="text-neutral-400 mb-8 px-2 max-w-sm">
                          When enabled, new messages sent and received in this chat will disappear after they have been seen.
                        </p>

                        <div className="space-y-4 px-2 mb-8">
                          {[
                            { label: `Default`, value: -1 },
                            { label: "Off", value: 0 },
                            { label: "4 weeks", value: 2419200 },
                            { label: "1 week", value: 604800 },
                            { label: "1 day", value: 86400 },
                            { label: "8 hours", value: 28800 },
                            { label: "1 hour", value: 3600 },
                            { label: "5 minutes", value: 300 },
                            { label: "30 seconds", value: 30 },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => setTempDisappearDelay(opt.value)}
                              className="w-full flex items-center gap-4 py-2 hover:bg-neutral-900 rounded-xl transition-colors text-left"
                            >
                              <div className={`w-5 h-5 rounded-full border flex flex-shrink-0 items-center justify-center
                                ${tempDisappearDelay === opt.value
                                  ? "border-indigo-500" 
                                  : "border-neutral-600"}`}
                              >
                                {tempDisappearDelay === opt.value && (
                                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                                )}
                              </div>
                              <span className="text-lg text-neutral-200">{opt.label}</span>
                            </button>
                          ))}
                          
                          <button
                            onClick={() => setShowCustomTimeModal(true)}
                            className="w-full flex items-center gap-4 py-2 hover:bg-neutral-900 rounded-xl transition-colors text-left"
                          >
                            <div className={`w-5 h-5 rounded-full border flex flex-shrink-0 items-center justify-center
                              ${tempDisappearDelay > 0 && ![-1, 0, 2419200, 604800, 86400, 28800, 3600, 300, 30].includes(tempDisappearDelay)
                                ? "border-indigo-500" 
                                : "border-neutral-600"}`}
                            >
                              {tempDisappearDelay > 0 && ![-1, 0, 2419200, 604800, 86400, 28800, 3600, 300, 30].includes(tempDisappearDelay) && (
                                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-lg text-neutral-200">Custom time</span>
                              {tempDisappearDelay > 0 && ![-1, 0, 2419200, 604800, 86400, 28800, 3600, 300, 30].includes(tempDisappearDelay) && (
                                <span className="text-sm text-neutral-400">
                                  {tempDisappearDelay % 604800 === 0 ? `${tempDisappearDelay / 604800} weeks` :
                                   tempDisappearDelay % 86400 === 0 ? `${tempDisappearDelay / 86400} days` :
                                   tempDisappearDelay % 3600 === 0 ? `${tempDisappearDelay / 3600} hours` :
                                   tempDisappearDelay % 60 === 0 ? `${tempDisappearDelay / 60} minutes` :
                                   `${tempDisappearDelay} seconds`}
                                </span>
                              )}
                            </div>
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-end p-4 shrink-0 -mx-4 -mb-4 pt-6 pb-8 border-t border-neutral-900">
                        <button
                          disabled={tempDisappearDelay === (activeConv?.disappearDelay === undefined ? -1 : activeConv.disappearDelay)}
                          onClick={() => {
                            if (onUpdateConversation) {
                              onUpdateConversation(activeConvId, {
                                disappearDelay: tempDisappearDelay === -1 ? undefined : tempDisappearDelay,
                              });
                              setChatSettingsView("main");
                            }
                          }}
                          className={`px-8 py-3 rounded-[32px] font-medium transition-colors text-lg ${
                            tempDisappearDelay === (activeConv?.disappearDelay === undefined ? -1 : activeConv.disappearDelay)
                              ? "bg-neutral-800 text-neutral-400"
                              : "bg-indigo-400 text-black shadow-lg shadow-indigo-500/20"
                          }`}
                        >
                          Save
                        </button>
                      </div>

                      {showCustomTimeModal && (
                        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
                          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 w-full max-w-sm flex flex-col shadow-2xl">
                            <h2 className="text-2xl font-medium mb-8 text-neutral-100">Custom time</h2>
                            
                            <div className="flex gap-4 mb-10 justify-center items-center">
                              <input 
                                type="number"
                                value={customTimeValue}
                                onChange={(e) => setCustomTimeValue(e.target.value)}
                                className="bg-transparent border-b-2 border-indigo-500 text-2xl text-center w-24 outline-none pb-2 text-neutral-100 px-2"
                              />
                              <select
                                value={customTimeUnit}
                                onChange={(e) => setCustomTimeUnit(e.target.value)}
                                className="bg-transparent border-b-2 border-indigo-500 text-xl w-32 outline-none pb-2 text-neutral-100 px-2 appearance-none cursor-pointer"
                              >
                                <option value="seconds">seconds</option>
                                <option value="minutes">minutes</option>
                                <option value="hours">hours</option>
                                <option value="days">days</option>
                                <option value="weeks">weeks</option>
                              </select>
                            </div>

                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setShowCustomTimeModal(false)}
                                className="text-indigo-400 font-medium px-6 py-2.5 rounded-full hover:bg-neutral-800 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => {
                                  const val = parseInt(customTimeValue);
                                  let multiplier = 1;
                                  if (customTimeUnit === "minutes") multiplier = 60;
                                  if (customTimeUnit === "hours") multiplier = 3600;
                                  if (customTimeUnit === "days") multiplier = 86400;
                                  if (customTimeUnit === "weeks") multiplier = 604800;
                                  if (!isNaN(val) && val > 0) {
                                    setTempDisappearDelay(val * multiplier);
                                  }
                                  setShowCustomTimeModal(false);
                                }}
                                className="text-indigo-400 font-medium px-6 py-2.5 rounded-full hover:bg-neutral-800 transition-colors"
                              >
                                Set
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="py-6 flex flex-col items-center">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20 mb-3">
                  <Key className="w-5 h-5 text-indigo-400" />
                </div>
                <p className="text-sm text-neutral-400 max-w-sm text-center">
                  Messages are End-to-end encrypted
                </p>
              </div>
              {!isNoteToSelf && (!activeConv?.displayName || activeConv.displayName === 'Unknown') && (
                <div className="flex flex-col items-center justify-center mb-10 px-4 mt-4 w-full">
                  <div className="bg-neutral-900 shadow-lg p-5 rounded-3xl w-full max-w-md border border-neutral-800 flex flex-col items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mb-1">
                       <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="w-7 h-7"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="22" y1="11" x2="16" y2="11"></line></svg>
                    </div>
                    <div className="text-center space-y-1">
                      <h3 className="text-lg font-medium text-neutral-100">Unknown Sender</h3>
                      <p className="text-[13px] text-neutral-400 max-w-[250px] mx-auto">
                        This contact is not in your address book. Save them to see their profile photo and details.
                      </p>
                    </div>
                    <div className="flex gap-2 w-full mt-2">
                       <input 
                         type="text" 
                         value={contactNameInput}
                         onChange={(e) => setContactNameInput(e.target.value)}
                         placeholder="Enter contact name..."
                         className="flex-1 bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 text-sm outline-none text-neutral-200 focus:border-indigo-500 transition-colors"
                       />
                    </div>
                    <div className="flex gap-3 w-full">
                       <button 
                         className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-2xl text-[15px] font-medium transition-colors"
                       >
                         Block
                       </button>
                       <button 
                         disabled={!contactNameInput.trim()}
                         onClick={() => {
                            if (contactNameInput.trim() && onSaveContact && activeConv) {
                               onSaveContact(activeConv.id, contactNameInput.trim());
                               setContactNameInput("");
                            }
                         }}
                         className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-2xl text-white text-[15px] font-medium transition-colors"
                       >
                         Save Contact
                       </button>
                    </div>
                  </div>
                </div>
              )}

              {isNoteToSelf && (
                <div className="flex flex-col items-center justify-center my-8 text-center px-4">
                  <div className="bg-neutral-800/50 p-6 rounded-[32px] max-w-sm w-full border border-neutral-700 shadow-sm flex flex-col items-center">
                    <div className="flex items-center gap-1.5 justify-center mb-3">
                      <h2 className="text-2xl font-medium text-neutral-100">Note to Self</h2>
                      <BadgeCheck className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div className="bg-indigo-500/20 text-indigo-300 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1 mb-4">
                      <BadgeCheck className="w-3.5 h-3.5" />
                      Official chat
                    </div>
                    <p className="text-neutral-400 text-[15px] leading-relaxed">
                      You can add notes for yourself in this chat. If your account has any linked devices, new notes will be synced.
                    </p>
                  </div>
                </div>
              )}

              {visibleMessages.map((msg) => {
                const isScheduled = msg.status === "scheduled";
                return (
                  <div
                    key={msg.id}
                    id={`msg-${msg.id}`}
                    className={`relative w-full mb-1 flex items-center overflow-visible transition-colors duration-1000 ${highlightMsgId === msg.id ? 'bg-indigo-900/40 rounded-lg' : ''}`}
                  >
                    <div className="absolute left-4 opacity-0 text-neutral-400 transition-opacity flex items-center z-0" id={`reply-icon-${msg.id}`}>
                       <Reply className="w-5 h-5" />
                    </div>

                    <motion.div
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={{ left: 0, right: 0.15 }}
                      onDrag={(e, info) => {
                        const icon = document.getElementById(`reply-icon-${msg.id}`);
                        if (icon) {
                          const progress = Math.min(Math.max(info.offset.x / 50, 0), 1);
                          icon.style.opacity = progress.toString();
                          if (progress === 1) {
                            icon.classList.add('text-indigo-400');
                            icon.classList.remove('text-neutral-400');
                          } else {
                            icon.classList.remove('text-indigo-400');
                            icon.classList.add('text-neutral-400');
                          }
                        }
                      }}
                      onDragEnd={(e, info) => {
                        const icon = document.getElementById(`reply-icon-${msg.id}`);
                        if (icon) {
                          icon.style.opacity = '0';
                          icon.classList.remove('text-indigo-400');
                          icon.classList.add('text-neutral-400');
                        }
                        if (info.offset.x > 50) {
                          setReplyingTo(msg);
                        }
                      }}
                      className={`flex flex-col w-full z-10 ${msg.isSelf ? "items-end" : "items-start"}`}
                    >
                      <div className={`flex items-center gap-2 max-w-[90%] ${msg.isSelf ? "flex-row-reverse" : "flex-row"}`}>
                      <div
                        className={`rounded-2xl px-3 py-1.5 ${msg.isSelf ? "bg-indigo-600 text-white rounded-tr-sm" : "bg-neutral-800 text-neutral-100 rounded-tl-sm"}`}
                      >
                        {msg.replyTo && (
                          <div 
                            className="mb-1.5 bg-black/20 rounded-lg p-2 border-l-2 border-indigo-400 text-sm flex flex-col gap-0.5 cursor-pointer hover:bg-black/30 transition-colors"
                            onClick={() => {
                              const el = document.getElementById(`msg-${msg.replyToId}`);
                              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                          >
                            <span className="font-semibold text-indigo-300 text-[11px] leading-tight truncate">
                              {msg.replyTo.isSelf ? "You" : (msg.replyTo.senderName || "Unknown")}
                            </span>
                            <span className={`truncate text-[12px] opacity-90 ${msg.isSelf ? 'text-indigo-100' : 'text-neutral-300'}`}>
                              {msg.replyTo.text || "Attachment"}
                            </span>
                          </div>
                        )}
                      {msg.isViewOnce ? (
                        <div className="flex flex-wrap items-end min-w-0 min-h-0 gap-x-3 gap-y-1">
                          <ViewOnceMessage msg={msg} onViewed={() => {
                            if (onViewOnceOpened) {
                              onViewOnceOpened(msg.id, msg.attachmentId);
                            }
                          }} />
                          <div className={`shrink-0 inline-flex items-center gap-1 ${msg.isSelf ? "text-indigo-300" : "text-neutral-500"}`}>
                            {!!msg.expireIn && <DisappearingClock expireIn={msg.expireIn} />}
                            {isScheduled && <Clock className="w-3 h-3" />}
                            <span className="text-[10px] uppercase font-medium tracking-wider">
                              {isScheduled
                                ? "Scheduled"
                                : Math.floor((Date.now() - new Date(msg.timestamp).getTime()) / 1000) < 60
                                ? "now"
                                : new Date(msg.timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                            </span>
                            {msg.isSelf && !isScheduled && (
                              <span className="ml-0.5 -mr-0.5">
                                {msg.status === "sending" && (
                                  <Clock className="w-3 h-3 opacity-50" />
                                )}
                                {msg.status === "sent" && (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                {msg.status === "delivered" && (
                                  <CheckCheck className="w-3.5 h-3.5" />
                                )}
                                {msg.status === "read" && (
                                  <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                                )}
                              </span>
                            )}
                            {msg.isSelf && isScheduled && msg.scheduledTime && (
                              <span className="ml-0.5 -mr-0.5">
                                <ScheduledClock scheduledTime={msg.scheduledTime} />
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <>
                          {msg.attachmentId && (
                            <AttachmentLoader
                              attachmentId={msg.attachmentId}
                              decryptionKey={msg.decryptionKey}
                            />
                          )}
                          <div className="whitespace-pre-wrap break-words min-w-0 text-[15px] leading-snug">
                            {msg.decryptedText}
                            <div
                              className={`float-right inline-flex items-center gap-1 ml-3 mt-1.5 translate-y-[3px] ${msg.isSelf ? "text-indigo-300" : "text-neutral-500"}`}
                            >
                              {!!msg.expireIn && <DisappearingClock expireIn={msg.expireIn} />}
                              {isScheduled && <Clock className="w-3 h-3" />}
                              <span className="text-[10px] uppercase font-medium tracking-wider">
                                {isScheduled
                                  ? "Scheduled"
                                  : Math.floor((Date.now() - new Date(msg.timestamp).getTime()) / 1000) < 60
                                  ? "now"
                                  : new Date(msg.timestamp).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                              </span>
                              {msg.isSelf && !isScheduled && (
                                <span className="ml-0.5 -mr-0.5">
                                  {msg.status === "sending" && (
                                    <Clock className="w-3 h-3 opacity-50" />
                                  )}
                                  {msg.status === "sent" && (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                  {msg.status === "delivered" && (
                                    <CheckCheck className="w-3.5 h-3.5" />
                                  )}
                                  {msg.status === "read" && (
                                    <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                                  )}
                                </span>
                              )}
                              {msg.isSelf && isScheduled && msg.scheduledTime && (
                                <span className="ml-0.5 -mr-0.5">
                                  <ScheduledClock scheduledTime={msg.scheduledTime} />
                                </span>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                      </div>
                    </motion.div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {scheduledMessages.length > 0 && (
              <div 
                className="bg-neutral-800 border-t border-neutral-700/50 py-3 px-4 flex items-center justify-between cursor-pointer hover:bg-neutral-800/80 transition-colors z-20 shrink-0"
                onClick={() => setShowScheduledModal(true)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-neutral-300 font-medium">
                    {scheduledMessages.length} message{scheduledMessages.length > 1 ? "s" : ""} scheduled
                  </span>
                </div>
                <span className="text-indigo-400 text-sm font-semibold hover:text-indigo-300 transition-colors">See all</span>
              </div>
            )}

            
            {replyingTo && (
              <div className="px-4 py-2 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between z-20 relative">
                <div className="flex-1 bg-neutral-800/50 rounded-lg p-2 border-l-2 border-indigo-500 relative min-w-0">
                  <div className="flex flex-col gap-0.5 max-w-full">
                    <span className="text-xs font-semibold text-indigo-400 truncate">
                      Replying to {replyingTo.isSelf ? "yourself" : (activeConv?.displayName || "Unknown")}
                    </span>
                    <span className="text-sm text-neutral-300 truncate">
                      {(() => {
  if (replyingTo.decryptedText) return replyingTo.decryptedText;
  if (replyingTo.attachmentId) {
    if (replyingTo.isViewOnce) return "💣 View once message";
    const mime = (replyingTo.decryptionKey || "").split("|")[1] || "";
    if (mime.startsWith("audio/")) return "🎤 Voice message";
    if (mime.startsWith("image/")) return "📷 Photo";
    if (mime.startsWith("video/")) return "🎥 Video";
    return "📎 Attachment";
  }
  return "";
})()}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setReplyingTo(null)} 
                  className="p-2 text-neutral-400 hover:text-neutral-200 transition-colors shrink-0 ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            
            {/* Input */}
            <div className="px-2 md:px-4 py-2 md:py-3 bg-neutral-900 relative z-20">
              {scheduleOpen && (
                <CustomDateTimePicker 
                  onSelect={(d) => { setScheduleOpen(false); handleSend(d); }} 
                  onClose={() => setScheduleOpen(false)} 
                />
              )}

              {attachment && !isRecording && (
                <div className="absolute bottom-[calc(100%+8px)] left-4 bg-neutral-800 p-3 rounded-xl border border-neutral-700 shadow-lg flex items-center gap-3">
                  <Paperclip className="w-4 h-4 text-neutral-400" />
                  <span className="text-sm text-neutral-300 max-w-[200px] truncate">
                    {attachment.name || "Attachment"}
                  </span>
                  <button
                    onClick={() => setAttachment(null)}
                    className="text-neutral-500 hover:text-neutral-300 p-1"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="flex items-end gap-1.5 md:gap-2 relative">
                
                <AnimatePresence>
                  {isRecording && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute inset-0 z-30 bg-neutral-900 flex items-center justify-between pr-0 rounded-3xl"
                    >
                       <button onClick={cancelVoiceRecording} className="p-3 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors ml-1" title="Cancel">
                          <Trash2 className="w-5 h-5" />
                       </button>
                       <div className="flex-1 flex items-center justify-center gap-1.5 px-2">
                          <div className="flex items-center justify-center gap-1.5 h-8">
                            <div className="w-1.5 bg-red-500/80 rounded-full animate-waveform h-4" />
                            <div className="w-1.5 bg-red-500/90 rounded-full animate-waveform h-6" style={{ animationDelay: '0.2s' }} />
                            <div className="w-1.5 bg-red-500 rounded-full animate-waveform h-8" style={{ animationDelay: '0.4s' }} />
                            <div className="w-1.5 bg-red-500/90 rounded-full animate-waveform h-5" style={{ animationDelay: '0.6s' }} />
                            <div className="w-1.5 bg-red-500/80 rounded-full animate-waveform h-3" style={{ animationDelay: '0.8s' }} />
                          </div>
                          <span className="ml-2 text-red-500 font-medium font-mono text-sm tracking-widest">
                            {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                          </span>
                       </div>
                       <button onClick={stopVoiceRecordingAndSend} className="w-[46px] h-[46px] shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 z-40">
                          <Send className="w-5 h-5 -ml-0.5" />
                       </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <input
                  type="file"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setAttachment(e.target.files[0]);
                    }
                  }}
                />
                
                <div className="flex-1 bg-neutral-800/80 rounded-3xl flex items-end min-h-[44px] transition-all border border-neutral-800 focus-within:border-neutral-700 relative">
                  <button
                    onClick={() => setIsViewOnce(!isViewOnce)}
                    className={`p-2 shrink-0 ${isViewOnce ? "text-indigo-400 font-bold" : "text-neutral-500 font-medium"} hover:bg-neutral-700/50 rounded-full ml-1 mb-1 transition-colors`}
                    title="View Once"
                  >
                    <span className="w-[22px] h-[22px] flex items-center justify-center rounded-full border-[1.5px] border-current text-[10px] leading-none">1</span>
                  </button>

                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Message"
                    className="flex-1 bg-transparent text-neutral-100 placeholder-neutral-500 resize-none py-2.5 px-2 focus:outline-none min-h-[44px] rounded-3xl overflow-y-auto leading-tight"
                  />
                  
                  <div className="relative w-9 shrink-0 h-[44px] self-end rounded-full overflow-hidden mr-1">
                    <button
                      onClick={startVoiceRecording}
                      className={`absolute inset-0 flex items-center justify-center text-neutral-400 hover:text-neutral-200 transition-all duration-300 transform ${
                        (!text.trim() && !attachment && !isRecording) ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
                      }`}
                      title="Voice Message"
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={`absolute inset-0 flex items-center justify-center text-neutral-400 hover:text-neutral-200 transition-all duration-300 transform ${
                        (text.trim() || attachment) && !isRecording ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"
                      }`}
                      title="Attach File"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="relative w-11 h-11 shrink-0">
                  {/* Plus button (empty state) */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`absolute inset-0 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 rounded-full flex items-center justify-center transition-all duration-300 transform ${
                      (!text.trim() && !attachment && !isRecording) ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-50 pointer-events-none"
                    }`}
                    title="Attach File"
                  >
                    <Plus className="w-[22px] h-[22px]" />
                  </button>

                  {/* Send button */}
                  <button
                    onPointerDown={() => {
                        schedulePressTimer.current = window.setTimeout(() => {
                            setScheduleOpen(true);
                        }, 500);
                    }}
                    onPointerUp={() => {
                        if (schedulePressTimer.current) {
                            clearTimeout(schedulePressTimer.current);
                            schedulePressTimer.current = null;
                        }
                    }}
                    onPointerLeave={() => {
                        if (schedulePressTimer.current) {
                            clearTimeout(schedulePressTimer.current);
                            schedulePressTimer.current = null;
                        }
                    }}
                    onClick={() => {
                        if (!scheduleOpen) {
                            handleSend();
                        }
                    }}
                    className={`absolute inset-0 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-md focus:outline-none transition-all duration-300 transform ${
                        (text.trim() || attachment) ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-50 pointer-events-none"
                    }`}
                  >
                    <Send className="w-5 h-5 -ml-0.5" />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 px-4">
            <div className="w-24 h-24 mb-6 rounded-3xl bg-neutral-900 border flex items-center justify-center border-neutral-800 shadow-2xl">
              <Zap className="w-10 h-10 text-neutral-700" />
            </div>
            <h2 className="text-xl font-medium text-neutral-300 mb-2">
              Securely Message
            </h2>
            <p className="text-sm max-w-xs text-center">
              Select an active conversation or add a new contact with their
              Securely ID.
            </p>
          </div>
        )}
      </div>

      {/* Reschedule Picker Modal */}
      {rescheduleMsgId && (
        <CustomDateTimePicker 
          onSelect={(d) => {
            socket.emit("reschedule_message", { messageId: rescheduleMsgId, deliverAt: d.toISOString() });
            onUpdateConversation(activeConvId!, {
              messages: activeConv!.messages.map(m =>
                m.id === rescheduleMsgId
                  ? { ...m, scheduledTime: d }
                  : m
              )
            });
            setRescheduleMsgId(null);
          }} 
          onClose={() => setRescheduleMsgId(null)} 
        />
      )}
      
      {/* Scheduled Messages Modal */}
      <AnimatePresence>
        {showScheduledModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[60] flex flex-col justify-end"
            onClick={() => setShowScheduledModal(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="bg-neutral-900 w-full md:w-[480px] md:mx-auto rounded-t-3xl h-[70vh] flex flex-col overflow-hidden border border-neutral-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-neutral-800 shrink-0 bg-neutral-900 z-10 relative">
                <div className="flex-1" />
                <h2 className="text-lg font-medium text-neutral-100 flex-1 text-center whitespace-nowrap">Scheduled Messages</h2>
                <div className="flex-1 flex justify-end">
                  <button
                    onClick={() => setShowScheduledModal(false)}
                    className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-full text-neutral-400 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 pb-48 space-y-4 bg-neutral-950 relative">
                {scheduledMessages.map((msg) => (
                  <div key={msg.id} className="flex flex-col items-end w-full relative">
                    <div className="flex items-center gap-2 max-w-[85%] relative">
                      <div className="relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenScheduleMenuId(openScheduleMenuId === msg.id ? null : msg.id);
                          }}
                          className="p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>
                        <AnimatePresence>
                          {openScheduleMenuId === msg.id && (
                             <motion.div 
                               initial={{ opacity: 0, scale: 0.95 }}
                               animate={{ opacity: 1, scale: 1 }}
                               exit={{ opacity: 0, scale: 0.95 }}
                               transition={{ duration: 0.1 }}
                               className="absolute right-0 top-full mt-2 w-48 bg-neutral-100 dark:bg-neutral-800 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden z-[100]"
                             >
                                <button onClick={(e) => { e.stopPropagation(); setRescheduleMsgId(msg.id); setOpenScheduleMenuId(null); }} className="w-full px-4 py-3 text-left flex items-center gap-3 text-sm font-medium text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                                   <Calendar className="w-4 h-4" /> Reschedule
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); socket.emit("send_scheduled_message_now", { messageId: msg.id }); onUpdateConversation(activeConvId!, { messages: activeConv!.messages.map(m => m.id === msg.id ? { ...m, status: "sending", timestamp: new Date(), scheduledTime: undefined } : m) }); setOpenScheduleMenuId(null); }} className="w-full px-4 py-3 text-left flex items-center gap-3 text-sm font-medium text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                                   <Send className="w-4 h-4" /> Send now
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(msg.decryptedText || ""); setOpenScheduleMenuId(null); }} className="w-full px-4 py-3 text-left flex items-center gap-3 text-sm font-medium text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                                   <Copy className="w-4 h-4" /> Copy
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); socket.emit("delete_scheduled_message", { messageId: msg.id }); onUpdateConversation(activeConvId!, { messages: activeConv!.messages.filter(m => m.id !== msg.id) }); setOpenScheduleMenuId(null); }} className="w-full px-4 py-3 text-left flex items-center gap-3 text-sm font-medium text-red-500 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                                   <Trash2 className="w-4 h-4" /> Delete
                                </button>
                             </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="rounded-2xl px-3 py-1.5 bg-blue-600 text-white rounded-tr-sm relative group shadow-sm">
                        <div className="whitespace-pre-wrap break-words min-w-0 text-[15px] leading-snug">
                          {msg.decryptedText}
                        </div>
                        <div className="flex items-center justify-end gap-1 mt-1 opacity-70">
                          {msg.scheduledTime && (
                            <span className="text-[11px] font-medium flex items-center gap-1">
                              {new Date(msg.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
