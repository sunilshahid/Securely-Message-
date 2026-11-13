
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
  ShieldCheck,
  Lock,
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
  ChevronRight,
  Edit2,
  Play,
  Pause,
  Maximize2,
  Download,
  AlertCircle,
  Info,
  Inbox
} from "lucide-react";
import { Conversation, ChatMessage, CallLog } from "../types";

import { decryptFile } from "../crypto";
import { DisappearingClock } from "./DisappearingClock";
import { ScheduledClock } from "./ScheduledClock";
import { DecryptedAvatar } from "./DecryptedAvatar";
import { CallScreen, CallState } from "./CallScreen";
import { CallsTab } from "./CallsTab";
import { toast } from "./Toast";
import { SettingsModal } from "./SettingsModal";
import { MessageInfoModal } from "./MessageInfoModal";
import GroupAdminModal from "./GroupAdminModal";
import RequestsModal from "./RequestsModal";
import StoriesTab from "./StoriesTab";

declare global {
  interface Window {
    __pendingOffer: any;
    __pendingCandidates: any[];
  }
}

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
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-neutral-900 w-full max-w-[420px] max-h-[90vh] rounded-3xl flex flex-col overflow-hidden border border-neutral-800 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-neutral-800">
          <h3 className="text-lg font-medium text-neutral-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            Schedule Message
          </h3>
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

function VoiceMessagePlayer({ 
  url, 
  isSelf, 
  isHeard,
  onPlayed,
  footer,
}: { 
  url: string; 
  isSelf?: boolean; 
  isHeard?: boolean;
  onPlayed?: () => void;
  footer?: React.ReactNode;
  key?: React.Key;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
      setHasPlayed(true);
      onPlayed?.();
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const cur = audioRef.current.currentTime;
    const dur = audioRef.current.duration || 0;
    setCurrentTime(cur);
    setProgress(dur > 0 ? (cur / dur) * 100 : 0);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    const dur = audioRef.current.duration;
    if (dur && isFinite(dur)) setDuration(dur);
  };

  const cycleRate = () => {
    if (!audioRef.current) return;
    const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextRate);
    audioRef.current.playbackRate = nextRate;
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickPos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = clickPos * (duration || audioRef.current.duration || 0);
    audioRef.current.currentTime = newTime;
    setProgress(clickPos * 100);
  };

  const formatTime = (sec: number) => {
    if (!sec || isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const isListenComplete = isSelf ? Boolean(isHeard) : Boolean(isHeard || hasPlayed);

  return (
    <div className="flex items-center gap-2.5 w-[230px] sm:w-[260px] select-none py-0.5">
      <audio
        ref={audioRef}
        src={url}
        onPlay={() => {
          setIsPlaying(true);
          setHasPlayed(true);
          onPlayed?.();
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setProgress(0);
          setCurrentTime(0);
        }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />

      <div className="relative shrink-0">
        <button
          onClick={togglePlay}
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-transform active:scale-90 ${
            isSelf 
              ? "bg-white text-indigo-600 hover:bg-neutral-100" 
              : "bg-emerald-500 text-white hover:bg-emerald-400"
          }`}
          title={isPlaying ? "Pause" : "Play voice message"}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        {/* Incoming Unplayed Audio Badge (Disappears once listened) */}
        {!isSelf && !isListenComplete && (
          <span 
            className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-neutral-900 shadow-[0_0_6px_rgba(52,211,153,0.85)]" 
            title="Unplayed voice note"
          />
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
        <div
          onClick={seek}
          className="relative h-6 flex items-center gap-[2.5px] cursor-pointer group py-1"
          title="Seek audio"
        >
          {/* Waveform Bars */}
          {[35, 60, 25, 80, 40, 95, 55, 30, 85, 45, 70, 35, 75, 50, 25, 90, 55, 40, 65, 30, 55].map((h, i) => {
            const barPercent = (i / 20) * 100;
            const isFilled = progress >= barPercent;
            return (
              <span
                key={i}
                style={{ height: `${h}%` }}
                className={`flex-1 rounded-full transition-colors duration-150 ${
                  isFilled
                    ? isListenComplete
                      ? "bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.6)]"
                      : isSelf
                      ? "bg-white"
                      : "bg-neutral-200"
                    : isSelf
                    ? "bg-indigo-300/40"
                    : "bg-neutral-600/60"
                } group-hover:opacity-90`}
              />
            );
          })}

          {/* Audio time scroll scrubber dot (thumb) that slides along the track */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full transition-all duration-75 pointer-events-none shadow-sm ${
              isListenComplete
                ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] ring-2 ring-emerald-500/40"
                : isSelf
                ? "bg-neutral-300 ring-2 ring-white/20"
                : "bg-neutral-400 ring-2 ring-neutral-600/40"
            }`}
            style={{ left: `calc(${Math.min(Math.max(progress, 0), 100)}% - 6px)` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono leading-none">
          <div className="flex items-center gap-1.5">
            <span className={isSelf ? "text-indigo-100" : "text-neutral-400"}>
              {formatTime(isPlaying ? currentTime : duration || currentTime)}
            </span>
            <button
              onClick={cycleRate}
              className={`text-[9px] px-1 py-0.5 rounded font-sans font-medium transition-colors ${
                isSelf ? "bg-indigo-800/50 hover:bg-indigo-800/70 text-indigo-200" : "bg-neutral-700/60 hover:bg-neutral-700 text-neutral-300"
              }`}
              title="Playback speed"
            >
              {playbackRate}x
            </button>
          </div>
          {footer && (
            <div className={`flex items-center gap-1 ${isSelf ? "text-indigo-200" : "text-neutral-400"}`}>
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AttachmentLoader({
  attachmentId,
  decryptionKey,
  isSelf,
  isHeard,
  onPlayed,
  footer,
  onImageClick,
}: {
  attachmentId: string;
  decryptionKey?: string;
  isSelf?: boolean;
  isHeard?: boolean;
  onPlayed?: () => void;
  footer?: React.ReactNode;
  onImageClick?: (url: string) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [type, setType] = useState<string>("");
  const [error, setError] = useState(false);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

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
        const objUrl = URL.createObjectURL(decrypted);
        setUrl(objUrl);
      })
      .catch((err) => {
        console.error("Attachment decrypt error", err);
        setError(true);
      });
  }, [attachmentId, decryptionKey]);

  if (error) {
    return (
      <div className="p-3 bg-neutral-900 border border-rose-500/50 rounded-2xl text-xs flex items-center gap-2.5 text-white font-medium shadow-md shadow-rose-950/30">
        <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
        <span className="text-white font-semibold">Failed to decrypt attachment</span>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="p-2.5 bg-black/20 rounded-xl text-xs flex items-center gap-2 text-neutral-400">
        <Clock className="w-3.5 h-3.5 animate-spin text-indigo-400" />
        <span>Decrypting...</span>
      </div>
    );
  }

  if (type.startsWith("image/")) {
    return (
      <div 
        onClick={() => onImageClick?.(url)}
        className="relative max-w-[260px] sm:max-w-[290px] max-h-[260px] rounded-2xl overflow-hidden cursor-pointer group shadow-sm bg-neutral-950/40"
      >
        <img 
          src={url} 
          alt="Attachment" 
          className="w-full h-auto max-h-[260px] object-cover rounded-2xl transition-transform duration-300 group-hover:scale-[1.01]" 
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <Maximize2 className="w-5 h-5 text-white drop-shadow-md" />
        </div>
        {footer && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-medium flex items-center gap-1 shadow-sm select-none pointer-events-none z-10">
            {footer}
          </div>
        )}
      </div>
    );
  }
  if (type.startsWith("video/")) {
    return (
      <div className="relative max-w-[270px] sm:max-w-[320px] max-h-[320px] rounded-2xl overflow-hidden shadow-sm bg-black/50">
        <video src={url} controls className="w-full h-full max-h-[320px] object-cover rounded-2xl" />
        {footer && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-medium flex items-center gap-1 shadow-sm select-none pointer-events-none z-10">
            {footer}
          </div>
        )}
      </div>
    );
  }
  if (type.startsWith("audio/")) {
    return <VoiceMessagePlayer url={url} isSelf={isSelf} isHeard={isHeard} onPlayed={onPlayed} footer={footer} />;
  }

  return (
    <div className="flex flex-col gap-1">
      <a
        href={url}
        download={`attachment-${attachmentId}`}
        className="p-2.5 bg-black/20 rounded-xl text-xs flex items-center gap-2 hover:bg-black/30 border border-white/5 transition-colors"
      >
        <Paperclip className="w-4 h-4 text-indigo-400" />
        <span className="truncate">Download Attachment</span>
      </a>
      {footer && <div className="self-end text-[10px] opacity-75">{footer}</div>}
    </div>
  );
}

function MediaGridLoader({
  items,
  isSelf,
  isHeard,
  onPlayed,
  footer,
  onImageClick,
}: {
  items: Array<{ attachmentId: string; decryptionKey: string }>;
  isSelf?: boolean;
  isHeard?: boolean;
  onPlayed?: () => void;
  footer?: React.ReactNode;
  onImageClick?: (url: string, index: number, allUrls: string[]) => void;
}) {
  const [loadedMedia, setLoadedMedia] = useState<Array<{ id: string; url: string; type: string } | null>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const objectUrls: string[] = [];

    const loadAll = async () => {
      setLoading(true);
      const results: Array<{ id: string; url: string; type: string } | null> = [];

      for (const item of items) {
        try {
          const parts = (item.decryptionKey || "").split("|");
          const keyHex = parts[0];
          const mimeOverride = parts[1];

          const res = await fetch(`/api/v1/attachments/${item.attachmentId}`);
          if (!res.ok) throw new Error("Missing");
          const mimeType = mimeOverride || res.headers.get("content-type") || "application/octet-stream";
          const blob = await res.blob();
          const decrypted = await decryptFile(blob, keyHex, mimeType);
          const objUrl = URL.createObjectURL(decrypted);
          objectUrls.push(objUrl);
          results.push({ id: item.attachmentId, url: objUrl, type: decrypted.type });
        } catch (e) {
          console.error("Failed to load attachment item", e);
          results.push(null);
        }
      }

      if (isMounted) {
        setLoadedMedia(results);
        setLoading(false);
      }
    };

    loadAll();

    return () => {
      isMounted = false;
      objectUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [items]);

  if (loading) {
    return (
      <div className="p-2.5 bg-black/20 rounded-xl text-xs flex items-center gap-2 text-neutral-400">
        <Clock className="w-3.5 h-3.5 animate-spin text-indigo-400" />
        <span>Decrypting media ({items.length})...</span>
      </div>
    );
  }

  const validItems = loadedMedia.filter((m): m is { id: string; url: string; type: string } => !!m);
  if (validItems.length === 0) {
    return (
      <div className="p-3 bg-neutral-900 border border-rose-500/50 rounded-2xl text-xs flex items-center gap-2.5 text-white font-medium shadow-md shadow-rose-950/30">
        <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
        <span className="text-white font-semibold">Media attachment unavailable</span>
      </div>
    );
  }

  const images = validItems.filter((m) => m.type.startsWith("image/"));
  const nonImages = validItems.filter((m) => !m.type.startsWith("image/"));
  const imageUrls = images.map((m) => m.url);

  return (
    <div className="space-y-1.5">
      {images.length > 0 && (
        <div className="relative rounded-2xl overflow-hidden shadow-sm">
          {images.length === 1 && (
            <div 
              onClick={() => onImageClick?.(images[0].url, 0, imageUrls)}
              className="relative max-w-[260px] sm:max-w-[290px] max-h-[260px] rounded-2xl overflow-hidden cursor-pointer group bg-neutral-950/40"
            >
              <img 
                src={images[0].url} 
                alt="Photo" 
                className="w-full h-auto max-h-[260px] object-cover rounded-2xl transition-transform duration-300 group-hover:scale-[1.01]" 
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <Maximize2 className="w-5 h-5 text-white drop-shadow-md" />
              </div>
            </div>
          )}

          {images.length === 2 && (
            <div className="grid grid-cols-2 gap-1 max-w-[270px] sm:max-w-[320px] rounded-2xl overflow-hidden">
              {images.map((img, idx) => (
                <div 
                  key={img.id}
                  onClick={() => onImageClick?.(img.url, idx, imageUrls)}
                  className="aspect-square relative cursor-pointer group bg-neutral-950/50 overflow-hidden"
                >
                  <img src={img.url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                </div>
              ))}
            </div>
          )}

          {images.length === 3 && (
            <div className="grid grid-cols-2 grid-rows-2 gap-1 max-w-[270px] sm:max-w-[320px] h-[250px] sm:h-[270px] rounded-2xl overflow-hidden">
              <div 
                onClick={() => onImageClick?.(images[0].url, 0, imageUrls)}
                className="col-span-1 row-span-2 relative cursor-pointer group bg-neutral-950/50 overflow-hidden"
              >
                <img src={images[0].url} alt="Photo 1" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              </div>
              <div 
                onClick={() => onImageClick?.(images[1].url, 1, imageUrls)}
                className="col-span-1 row-span-1 relative cursor-pointer group bg-neutral-950/50 overflow-hidden"
              >
                <img src={images[1].url} alt="Photo 2" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              </div>
              <div 
                onClick={() => onImageClick?.(images[2].url, 2, imageUrls)}
                className="col-span-1 row-span-1 relative cursor-pointer group bg-neutral-950/50 overflow-hidden"
              >
                <img src={images[2].url} alt="Photo 3" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              </div>
            </div>
          )}

          {images.length === 4 && (
            <div className="grid grid-cols-2 gap-1 max-w-[270px] sm:max-w-[320px] rounded-2xl overflow-hidden">
              {images.map((img, idx) => (
                <div 
                  key={img.id}
                  onClick={() => onImageClick?.(img.url, idx, imageUrls)}
                  className="aspect-square relative cursor-pointer group bg-neutral-950/50 overflow-hidden"
                >
                  <img src={img.url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                </div>
              ))}
            </div>
          )}

          {images.length >= 5 && (
            <div className="grid grid-cols-2 gap-1 max-w-[270px] sm:max-w-[320px] rounded-2xl overflow-hidden">
              {images.slice(0, 3).map((img, idx) => (
                <div 
                  key={img.id}
                  onClick={() => onImageClick?.(img.url, idx, imageUrls)}
                  className="aspect-square relative cursor-pointer group bg-neutral-950/50 overflow-hidden"
                >
                  <img src={img.url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                </div>
              ))}
              <div 
                onClick={() => onImageClick?.(images[3].url, 3, imageUrls)}
                className="aspect-square relative cursor-pointer group bg-neutral-950/50 overflow-hidden"
              >
                <img src={images[3].url} alt="More photos" className="w-full h-full object-cover blur-[1px] brightness-50" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center font-bold text-white text-xl drop-shadow-md">
                  +{images.length - 3}
                </div>
              </div>
            </div>
          )}

          {footer && nonImages.length === 0 && (
            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-medium flex items-center gap-1 shadow-sm select-none pointer-events-none z-10">
              {footer}
            </div>
          )}
        </div>
      )}

      {nonImages.map((m) => {
        if (m.type.startsWith("audio/")) {
          return <VoiceMessagePlayer key={m.id} url={m.url} isSelf={isSelf} isHeard={isHeard} onPlayed={onPlayed} footer={footer} />;
        }
        if (m.type.startsWith("video/")) {
          return (
            <div key={m.id} className="relative max-w-[270px] sm:max-w-[320px] max-h-[320px] rounded-2xl overflow-hidden bg-black/50">
              <video src={m.url} controls className="w-full h-full max-h-[320px] object-cover rounded-2xl" />
              {footer && (
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-medium flex items-center gap-1 shadow-sm select-none pointer-events-none z-10">
                  {footer}
                </div>
              )}
            </div>
          );
        }
        return (
          <div key={m.id} className="flex flex-col gap-1">
            <a
              href={m.url}
              download={`attachment-${m.id}`}
              className="p-2.5 bg-black/20 rounded-xl text-xs flex items-center gap-2 hover:bg-black/30 border border-white/5 transition-colors"
            >
              <Paperclip className="w-4 h-4 text-indigo-400" />
              <span className="truncate">Download Attachment</span>
            </a>
            {footer && <div className="self-end text-[10px] opacity-75">{footer}</div>}
          </div>
        );
      })}
    </div>
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
        const objUrl = URL.createObjectURL(decrypted);
        setUrl(objUrl);
        setIsViewing(true);
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
  myPhoneNumber?: string;
  myPhoto?: string;
  myAbout?: string;
  myRegistrationId?: number;
  identity?: any;
  conversations: Conversation[];
  activeConvId: string | null;
  onSelectConv: (id: string) => void;
  onSendMessage: (
    text: string,
    scheduledTime?: Date,
    attachment?: File | File[],
    expireIn?: number,
    isViewOnce?: boolean,
    replyToId?: string,
    replyTo?: { text: string; senderName: string; senderId?: string; isSelf: boolean; }
  ) => void;
  onViewOnceOpened: (msgId: string, attachmentId?: string) => void;
  onAddContact: (id: string, name?: string, photoUrl?: string, about?: string) => void;
  onSaveContact: (id: string, name: string) => Promise<void>;
  onUpdateProfile: (updates: any) => void;
  onUpdateConversation?: (convId: string, updates: any) => void;
  onDeleteConversation?: (convId: string) => void;
  onDeleteMessage?: (convId: string, messageIds: string[], deleteForEveryone?: boolean) => void;
  onEditMessage?: (convId: string, messageId: string, newText: string) => void;
  onLogout?: () => void;
};

function formatMessageDateDivider(dateInput: Date | string): string {
  const date = new Date(dateInput);
  const now = new Date();
  
  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  if (isSameDay(date, now)) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return "Yesterday";

  const diffDays = Math.round((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7 && diffDays > 0) {
    return date.toLocaleDateString(undefined, { weekday: "long" });
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getSenderColor(senderId?: string): string {
  if (!senderId) return "#10b981";
  const colors = [
    "#38bdf8", // sky
    "#4ade80", // emerald
    "#fb923c", // orange
    "#c084fc", // purple
    "#f472b6", // pink
    "#34d399", // teal
    "#facc15", // amber
    "#818cf8", // indigo
    "#f87171", // rose
    "#22d3ee", // cyan
  ];
  let hash = 0;
  for (let i = 0; i < senderId.length; i++) {
    hash = senderId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function ChatLayout({
  socket,
  myId,
  myName,
  myUsername,
  myPhoneNumber,
  myPhoto,
  myAbout,
  myRegistrationId,
  identity,
  conversations,
  activeConvId,
  onSelectConv,
  onSendMessage,
  onViewOnceOpened,
  onAddContact,
  onSaveContact,
  onUpdateProfile,
  onUpdateConversation,
  onDeleteConversation,
  onDeleteMessage,
  onEditMessage,
  onLogout,
}: ChatLayoutProps) {
  const [newContactId, setNewContactId] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [text, setText] = useState("");
  const [selectedMsgIds, setSelectedMsgIds] = useState<string[]>([]);
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const longPressTimerRef = useRef<{ [msgId: string]: any }>({});
  const didLongPressMsgRef = useRef<{ [msgId: string]: boolean }>({});
  const lastMsgLongPressTimeRef = useRef<number>(0);

  useEffect(() => {
    setSelectedMsgIds([]);
    setEditingMsg(null);
    setShowDeleteMenu(false);
  }, [activeConvId]);
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
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [verifiedContacts, setVerifiedContacts] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("verified_contacts") || "{}");
    } catch {
      return {};
    }
  });
  const [customTimeValue, setCustomTimeValue] = useState("30");
  const [customTimeUnit, setCustomTimeUnit] = useState("seconds");
  const [globalCustomDisappearInput, setGlobalCustomDisappearInput] = useState("");

  const [attachments, setAttachments] = useState<File[]>([]);
  const attachment = attachments[0] || null;
  const setAttachment = (f: File | null) => setAttachments(f ? [f] : []);
  const [lightboxState, setLightboxState] = useState<{ isOpen: boolean; urls: string[]; activeIndex: number }>({
    isOpen: false,
    urls: [],
    activeIndex: 0,
  });
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
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [messageInfoTarget, setMessageInfoTarget] = useState<ChatMessage | null>(null);
  const [filterUnread, setFilterUnread] = useState(false);
  const [showArchivedView, setShowArchivedView] = useState(false);
  const [groupInvitePrompt, setGroupInvitePrompt] = useState<{
    groupId: string;
    groupName?: string;
    description?: string;
    membersCount?: number;
    requireAdminApproval?: boolean;
  } | null>(null);
  const [activeNotifProfile, setActiveNotifProfile] = useState(() => localStorage.getItem("active_notif_profile") || "default");
  const [showGroupAdmin, setShowGroupAdmin] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [requireApprovalOnCreate, setRequireApprovalOnCreate] = useState(false);
  const [groupInviteContactsInput, setGroupInviteContactsInput] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupLink, setGroupLink] = useState("");

  const refreshRequestsCount = useCallback(async () => {
    if (!myId) return;
    try {
      const res = await fetch(`/api/v1/users/${myId}/requests`);
      if (res.ok) {
        const data = await res.json();
        const total = (data.invites?.length || 0) + (data.adminApprovals?.length || 0);
        setPendingRequestsCount(total);
      }
    } catch {}
  }, [myId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const grp = params.get("group");
    if (grp) {
      const cleanId = grp.replace(/^group_/, "");
      fetch(`/api/v1/groups/${cleanId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.group) {
            setGroupInvitePrompt({
              groupId: cleanId,
              groupName: data.group.name,
              description: data.group.description,
              membersCount: data.group.members?.length || 1,
              requireAdminApproval: data.group.requireAdminApproval,
            });
          } else {
            setGroupInvitePrompt({ groupId: cleanId, groupName: `Group #${cleanId.slice(0, 8)}` });
          }
        })
        .catch(() => {
          setGroupInvitePrompt({ groupId: cleanId, groupName: `Group #${cleanId.slice(0, 8)}` });
        });
    }

    refreshRequestsCount();
    const handleRequestsUpdate = () => {
      refreshRequestsCount();
    };
    window.addEventListener("securely_requests_updated", handleRequestsUpdate);
    const interval = setInterval(refreshRequestsCount, 20000);
    return () => {
      window.removeEventListener("securely_requests_updated", handleRequestsUpdate);
      clearInterval(interval);
    };
  }, [refreshRequestsCount]);
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
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<any[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const callStartTimeRef = useRef<number | null>(null);
  const callIsIncomingRef = useRef(false);
  const highlightTimeoutRef = useRef<any>(null);

  // Real Call Logs
  const [callLogs, setCallLogs] = useState<CallLog[]>(() => {
    try {
      const saved = localStorage.getItem(`signal_call_logs_${myId}`);
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  const addCallLog = (log: Omit<CallLog, "id" | "timestamp">) => {
    const entry: CallLog = {
      ...log,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
    };
    setCallLogs((prev) => {
      const next = [entry, ...prev.slice(0, 99)];
      try {
        localStorage.setItem(`signal_call_logs_${myId}`, JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  const clearCallLogs = () => {
    setCallLogs([]);
    try {
      localStorage.removeItem(`signal_call_logs_${myId}`);
    } catch (_) {}
  };

  // Cleanup WebRTC
  const cleanupCall = () => {
    callStartTimeRef.current = null;
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch (e) {
        console.error("Error closing peer connection", e);
      }
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (e) {
          console.error("Error stopping localStreamRef track", e);
        }
      });
      localStreamRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (e) {
          console.error("Error stopping localStream track", e);
        }
      });
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallState("idle");
    setCallingUserId(null);
    setIsIncomingCall(false);
    setIsMuted(false);
    setIsVideoOff(false);
    window.__pendingOffer = null;
    window.__pendingCandidates = [];
    pendingCandidatesRef.current = [];
  };

  useEffect(() => {
    return () => {
      cleanupCall();
    };
  }, []);

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
      localStreamRef.current = stream;
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
      if (!callStartTimeRef.current) {
        callStartTimeRef.current = Date.now();
      }
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
    callIsIncomingRef.current = false;
    callStartTimeRef.current = null;
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
          // Send busy signal back to caller
          socket.emit("call_signaling", {
            recipientId: senderId,
            payload: { type: "end", reason: "busy" }
          });
          return;
        }
        setCallingUserId(senderId);
        setCallIsVideo(payload.isVideo);
        setIsIncomingCall(true);
        callIsIncomingRef.current = true;
        callStartTimeRef.current = null;
        setCallState("ringing");

        window.__pendingOffer = payload.offer;
        window.__pendingCandidates = [];
      }
      else if (payload.type === "answer") {
        if (peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
            if (!callStartTimeRef.current) {
              callStartTimeRef.current = Date.now();
            }
            const queued = [...pendingCandidatesRef.current, ...(window.__pendingCandidates || [])];
            pendingCandidatesRef.current = [];
            window.__pendingCandidates = [];
            for (const cand of queued) {
              if (cand && peerConnectionRef.current) {
                try {
                  await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(cand));
                } catch (e) {
                  console.warn("Could not add queued ICE candidate:", e);
                }
              }
            }
          } catch (e) {
            console.error("Error setting remote description on answer:", e);
          }
        }
      }
      else if (payload.type === "candidate") {
        if (payload.candidate) {
          if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription && peerConnectionRef.current.remoteDescription.type) {
            try {
              await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch(e) {
              console.error("Error adding candidate:", e);
            }
          } else {
            pendingCandidatesRef.current.push(payload.candidate);
            if (!window.__pendingCandidates) window.__pendingCandidates = [];
            window.__pendingCandidates.push(payload.candidate);
          }
        }
      }
      else if (payload.type === "end") {
        const otherId = senderId || callingUserId;
        const conv = otherId ? conversations.find(c => c.id === otherId) : null;
        const reason = payload.reason;

        if (callStateRef.current === "ringing") {
          // Callee was ringing and caller canceled or timed out -> MISSED CALL!
          if (otherId) {
            addCallLog({
              userId: otherId,
              displayName: conv?.displayName,
              photoUrl: conv?.photoUrl,
              type: "missed",
              isVideo: callIsVideo,
            });
            toast(`Missed ${callIsVideo ? "video" : "voice"} call from ${conv?.displayName || "contact"}`, "error");
          }
        } else if (callStateRef.current === "calling" && reason === "rejected") {
          // Caller was calling and callee rejected -> DECLINED!
          if (otherId) {
            addCallLog({
              userId: otherId,
              displayName: conv?.displayName,
              photoUrl: conv?.photoUrl,
              type: "rejected",
              isVideo: callIsVideo,
            });
            toast(`Call declined by ${conv?.displayName || "contact"}`, "info");
          }
        } else if (callStateRef.current === "connected" && callStartTimeRef.current) {
          // Normal end of connected call
          const duration = Math.round((Date.now() - callStartTimeRef.current) / 1000);
          if (otherId) {
            addCallLog({
              userId: otherId,
              displayName: conv?.displayName,
              photoUrl: conv?.photoUrl,
              type: callIsIncomingRef.current ? "incoming" : "outgoing",
              isVideo: callIsVideo,
              duration,
            });
          }
        }
        cleanupCall();
      }
    };

    if (socket) {
      socket.on("receive_call_signaling", onCallSignaling);
      return () => {
        socket.off("receive_call_signaling", onCallSignaling);
      };
    }
  }, [socket, conversations, callIsVideo]);

  const acceptCall = async () => {
    if (!callingUserId || !window.__pendingOffer) return;
    setCallState("connecting");
    callStartTimeRef.current = Date.now();
    
    const stream = await initLocalStream(callIsVideo);
    if (!stream) {
      sendCallSignaling({ type: "end", reason: "error" });
      cleanupCall();
      return;
    }
    
    const pc = createPeerConnection(callingUserId, stream);
    
    try {
      await pc.setRemoteDescription(window.__pendingOffer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      sendCallSignaling({ type: "answer", answer });

      const queued = [...pendingCandidatesRef.current, ...(window.__pendingCandidates || [])];
      pendingCandidatesRef.current = [];
      window.__pendingCandidates = [];
      for (const cand of queued) {
        if (cand) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch (e) {
            console.warn("Could not add queued candidate on accept:", e);
          }
        }
      }
    } catch(e) {
      cleanupCall();
    }
  };

  const rejectCall = () => {
    if (callingUserId) {
      const conv = conversations.find(c => c.id === callingUserId);
      addCallLog({
        userId: callingUserId,
        displayName: conv?.displayName,
        photoUrl: conv?.photoUrl,
        type: "rejected",
        isVideo: callIsVideo,
      });
      sendCallSignaling({ type: "end", reason: "rejected" });
      toast("Call declined", "info");
    }
    cleanupCall();
  };

  const hangupCall = () => {
    if (callingUserId) {
      const conv = conversations.find(c => c.id === callingUserId);
      const wasConnected = callStateRef.current === "connected" && callStartTimeRef.current !== null;
      const duration = wasConnected ? Math.round((Date.now() - callStartTimeRef.current!) / 1000) : 0;
      
      if (wasConnected) {
        addCallLog({
          userId: callingUserId,
          displayName: conv?.displayName,
          photoUrl: conv?.photoUrl,
          type: callIsIncomingRef.current ? "incoming" : "outgoing",
          isVideo: callIsVideo,
          duration,
        });
      } else if (!callIsIncomingRef.current) {
        // Outgoing call canceled before answer
        addCallLog({
          userId: callingUserId,
          displayName: conv?.displayName,
          photoUrl: conv?.photoUrl,
          type: "outgoing",
          isVideo: callIsVideo,
          duration: 0,
        });
      }
      sendCallSignaling({ type: "end", reason: wasConnected ? "normal" : "canceled" });
    }
    cleanupCall();
  };

  const toggleMute = () => {
    const stream = localStreamRef.current || localStream;
    if (stream) {
      stream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    const stream = localStreamRef.current || localStream;
    if (stream) {
      stream.getVideoTracks().forEach(t => t.enabled = !t.enabled);
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
    let list = conversations;
    if (showArchivedView) {
      list = list.filter((c) => Boolean(c.isArchived));
    } else {
      list = list.filter((c) => !c.isArchived);
    }
    if (filterUnread) {
      list = list.filter(
        (c) => (c.unreadCount && c.unreadCount > 0) || c.messages.some((m) => !m.isSelf && m.status !== "read")
      );
    }
    if (!searchQuery.trim() || !isSearchActive) return list;
    const lowerQuery = searchQuery.toLowerCase();
    
    return list.filter(conv => {
      if (conv.displayName?.toLowerCase().includes(lowerQuery) || conv.id.toLowerCase().includes(lowerQuery)) return true;
      return false;
    });
  }, [conversations, searchQuery, isSearchActive, showArchivedView, filterUnread]);

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
  const visibleMessages = useMemo(() => {
    if (!activeConv) return [];
    const seen = new Set<string>();
    return activeConv.messages.filter((m) => {
      if (m.status === "scheduled") return false;
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [activeConv]);
  const scheduledMessages = useMemo(() => {
    if (!activeConv) return [];
    const seen = new Set<string>();
    return activeConv.messages.filter((m) => {
      if (m.status !== "scheduled") return false;
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [activeConv]);
  
  const [showScheduledModal, setShowScheduledModal] = useState(false);
  const [openScheduleMenuId, setOpenScheduleMenuId] = useState<string | null>(null);
  const isSendingRef = useRef(false);
  const didLongPressRef = useRef(false);

  const startVoiceRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast("Audio recording requires a Secure Context (HTTPS or localhost).", "error");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let mimeType = "";
      if (typeof MediaRecorder.isTypeSupported === "function") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
          mimeType = "audio/ogg";
        }
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      cancelRecordingRef.current = false;
      sendAfterRecordingRef.current = false;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        
        if (cancelRecordingRef.current) {
          cancelRecordingRef.current = false;
          audioChunksRef.current = [];
          return;
        }

        const actualType = mediaRecorder.mimeType || mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: actualType });
        if (audioBlob.size === 0) return;

        const ext = actualType.includes("mp4") ? "m4a" : actualType.includes("ogg") ? "ogg" : "webm";
        const audioFile = new File([audioBlob], `voice-${Date.now()}.${ext}`, {
          type: actualType,
        });
        
        if (sendAfterRecordingRef.current) {
          sendAfterRecordingRef.current = false;
          const expireValue = activeConv?.disappearDelay !== undefined ? activeConv.disappearDelay : globalDisappear;
          onSendMessage(
            "", 
            undefined, 
            audioFile, 
            (expireValue && expireValue > 0) ? expireValue : undefined, 
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
              senderId: replyingTo.senderId,
              isSelf: replyingTo.isSelf
            } : undefined
          );
          setReplyingTo(null);
          setAttachments([]);
        } else {
          setAttachments(prev => [...prev, audioFile]);
        }
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err: any) {
      console.error("Microphone error", err);
      toast(err.message || "Microphone access denied. Please grant permission.", "error");
      setIsRecording(false);
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

  const handleSend = (overrideScheduleTime?: Date, overrideAttachment?: File | File[]) => {
    if (editingMsg) {
      if (text.trim() && onEditMessage && activeConv) {
        onEditMessage(activeConv.id, editingMsg.id, text.trim());
      }
      setEditingMsg(null);
      setText("");
      return;
    }
    if (isSendingRef.current) return;
    let finalAttachments: File[] = [];
    if (overrideAttachment) {
      finalAttachments = Array.isArray(overrideAttachment) ? overrideAttachment : [overrideAttachment];
    } else if (attachments.length > 0) {
      finalAttachments = attachments;
    } else if (attachment) {
      finalAttachments = [attachment];
    }

    if (!text.trim() && finalAttachments.length === 0) return;
    isSendingRef.current = true;
    setTimeout(() => {
      isSendingRef.current = false;
    }, 400);

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

    onSendMessage(
      text,
      sTime,
      finalAttachments.length > 0 ? finalAttachments : undefined,
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
        senderId: replyingTo.senderId,
        isSelf: replyingTo.isSelf
      } : undefined
    );
    setReplyingTo(null);

    setText("");
    setAttachments([]);
    setIsViewOnce(false);
    setScheduleOpen(false);
    setScheduleTime("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleMarkAllRead = () => {
    setShowChatMenu(false);
    let markedAny = false;
    conversations.forEach((conv) => {
      const unreadMsgs = conv.messages.filter((m) => !m.isSelf && m.status !== "read");
      if (unreadMsgs.length > 0 || (conv.unreadCount && conv.unreadCount > 0)) {
        markedAny = true;
        unreadMsgs.forEach((m) => {
          socket.emit("message_receipt", {
            messageId: m.id,
            recipientId: conv.id,
            status: "read",
            readAt: new Date().toISOString(),
          });
        });
        if (onUpdateConversation) {
          onUpdateConversation(conv.id, {
            unreadCount: 0,
            messages: conv.messages.map((m) => (!m.isSelf ? { ...m, status: "read" } : m)),
          });
        }
      }
    });
    toast(markedAny ? "All conversations marked as read" : "All conversations already read", "success");
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

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-neutral-800 flex items-center justify-center shrink-0 text-neutral-400">
                    <Users className="w-7 h-7 text-indigo-400" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <input 
                      type="text" 
                      placeholder="Group name (required)" 
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="w-full bg-transparent border-b border-neutral-700 pb-1 outline-none text-white text-base placeholder-neutral-500 focus:border-indigo-500"
                      autoFocus
                    />
                    <input 
                      type="text" 
                      placeholder="Group description (optional)" 
                      value={groupDesc}
                      onChange={(e) => setGroupDesc(e.target.value)}
                      className="w-full bg-transparent border-b border-neutral-800 pb-1 outline-none text-neutral-300 text-xs placeholder-neutral-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Approve new participants toggle */}
                <div className="flex items-center justify-between p-3.5 bg-neutral-900 border border-neutral-800 rounded-2xl">
                  <div className="pr-3">
                    <h4 className="text-sm font-medium text-neutral-200">Approve New Participants</h4>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Admins must approve users before they can join via invite link.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRequireApprovalOnCreate(!requireApprovalOnCreate)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      requireApprovalOnCreate ? "bg-indigo-600" : "bg-neutral-800"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        requireApprovalOnCreate ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Direct invites / requests input */}
                <div className="space-y-1.5 p-3.5 bg-neutral-900 border border-neutral-800 rounded-2xl">
                  <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block">
                    Invite Contacts Directly
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Securely IDs (comma-separated)..."
                    value={groupInviteContactsInput}
                    onChange={(e) => setGroupInviteContactsInput(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <p className="text-[11px] text-neutral-500">
                    Contacts will receive a silent request in their Requests tab (no loud chime).
                  </p>
                </div>

                {groupLink && (
                  <div className="p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-2xl space-y-2">
                    <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Group Invite Link</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-300 truncate flex-1 font-mono">{groupLink}</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(groupLink);
                          toast("Link copied to clipboard!", "success");
                        }}
                        className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
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
                      setGroupDesc("");
                      setGroupInviteContactsInput("");
                    }}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-full transition-colors text-sm"
                  >
                    Done
                  </button>
                ) : (
                  <button
                    disabled={!groupName.trim() || isCreatingGroup}
                    onClick={async () => {
                      if (!groupName.trim() || isCreatingGroup) return;
                      setIsCreatingGroup(true);
                      const id = (crypto.randomUUID ? crypto.randomUUID().split("-")[0] : Math.random().toString(36).substring(7));
                      const fullLink = `${window.location.origin}/?group=${id}`;
                      const newGroupId = `group_${id}`;

                      const invitedList = groupInviteContactsInput
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);

                      try {
                        const res = await fetch("/api/v1/groups", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            groupId: id,
                            name: groupName.trim(),
                            description: groupDesc.trim(),
                            creatorId: myId,
                            creatorName: myName || myUsername || "Admin",
                            requireAdminApproval: requireApprovalOnCreate,
                            onlyAdminsCanPost: false,
                            invitedUserIds: invitedList,
                          }),
                        });

                        if (res.ok) {
                          socket?.emit("join_group", { groupId: id, user: { userId: myId, name: myName || myUsername || "You" } });
                          onAddContact(newGroupId, groupName.trim());
                          if (onUpdateConversation) {
                            onUpdateConversation(newGroupId, {
                              id: newGroupId,
                              displayName: groupName.trim(),
                              groupDescription: groupDesc.trim(),
                              isGroup: true,
                              requireAdminApproval: requireApprovalOnCreate,
                              onlyAdminsCanPost: false,
                              groupMembers: [
                                {
                                  userId: myId,
                                  displayName: myName || myUsername || "You",
                                  role: "admin",
                                  joinedAt: new Date().toISOString()
                                }
                              ],
                              groupInviteLink: fullLink,
                              messages: [
                                {
                                  id: "sys_" + Date.now(),
                                  senderId: "system",
                                  isSelf: false,
                                  decryptedText: `Group "${groupName.trim()}" created. You are the group admin.`,
                                  timestamp: new Date(),
                                  status: "read",
                                  isPostQuantum: true
                                }
                              ],
                              unreadCount: 0
                            });
                          }
                          setGroupLink(fullLink);
                          onSelectConv(newGroupId);
                          if (invitedList.length > 0) {
                            toast(`Group created! Silent invites sent to ${invitedList.length} contact(s).`, "success");
                          } else {
                            toast(`Group "${groupName.trim()}" created!`, "success");
                          }
                        } else {
                          toast("Failed to create group on server", "error");
                        }
                      } catch {
                        toast("Error creating group", "error");
                      } finally {
                        setIsCreatingGroup(false);
                      }
                    }}
                    className="px-6 py-2.5 bg-indigo-600 disabled:bg-neutral-800 text-white disabled:text-neutral-500 font-medium rounded-full transition-colors text-sm shadow-md"
                  >
                    {isCreatingGroup ? "Creating..." : "Create Group"}
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

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        myId={myId}
        myName={myName || "Me"}
        myUsername={myUsername}
        myPhoneNumber={myPhoneNumber}
        myPhoto={myPhoto}
        myAbout={myAbout}
        myRegistrationId={myRegistrationId}
        identity={identity}
        conversations={conversations}
        isDiscoverable={isDiscoverable}
        onToggleDiscoverable={setIsDiscoverable}
        globalDisappear={globalDisappear}
        onChangeGlobalDisappear={setGlobalDisappear}
        onUpdateProfile={onUpdateProfile}
        onLogout={onLogout}
      />

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
              <button 
                onClick={() => { setShowChatMenu(false); setShowRequestsModal(true); }}
                className="w-full text-left px-4 py-3 hover:bg-neutral-800 transition-colors flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-3">
                  <Inbox className="w-5 h-5 text-neutral-400" /> 
                  <span>Requests</span>
                </div>
                {pendingRequestsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-600 font-bold text-white shadow-sm">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
              <button 
                onClick={handleMarkAllRead}
                className="w-full text-left px-4 py-3 hover:bg-neutral-800 transition-colors flex items-center gap-3 text-sm"
              >
                <CheckSquare className="w-5 h-5 text-neutral-400" /> Mark all read
              </button>
              <button 
                onClick={() => { setShowChatMenu(false); setFilterUnread(!filterUnread); }}
                className={`w-full text-left px-4 py-3 hover:bg-neutral-800 transition-colors flex items-center justify-between text-sm ${filterUnread ? "text-indigo-400 font-semibold" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <Filter className="w-5 h-5 text-neutral-400" /> 
                  <span>{filterUnread ? "Show all chats" : "Filter unread chats"}</span>
                </div>
                {filterUnread && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
              </button>
              <button 
                onClick={() => { setShowChatMenu(false); setShowNotificationProfile(true); }}
                className="w-full text-left px-4 py-3 hover:bg-neutral-800 transition-colors flex items-center gap-3 text-sm"
              >
                <Bell className="w-5 h-5 text-neutral-400" /> Notification profile
              </button>
              <button 
                onClick={() => { setShowChatMenu(false); setShowArchivedView(!showArchivedView); }}
                className={`w-full text-left px-4 py-3 hover:bg-neutral-800 transition-colors flex items-center justify-between text-sm ${showArchivedView ? "text-indigo-400 font-semibold" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <Archive className="w-5 h-5 text-neutral-400" /> 
                  <span>{showArchivedView ? "Back to Inbox" : "Archived chats"}</span>
                </div>
                {conversations.filter(c => c.isArchived).length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-neutral-800 text-neutral-300">
                    {conversations.filter(c => c.isArchived).length}
                  </span>
                )}
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
                    onClick={() => setShowSettings(true)}
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
                      className="cursor-pointer hover:text-white transition-colors relative"
                    >
                      <MoreVertical className="w-6 h-6" />
                      {pendingRequestsCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-2 ring-neutral-900" />
                      )}
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
              {/* Unread Filter Banner */}
              {filterUnread && (
                <div className="mx-3 my-2 px-3.5 py-2 bg-indigo-500/15 border border-indigo-500/30 rounded-xl flex items-center justify-between text-xs text-indigo-300 shrink-0">
                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Filtering unread chats</span>
                  </div>
                  <button 
                    onClick={() => setFilterUnread(false)}
                    className="p-1 hover:text-white rounded-md transition-colors"
                    title="Clear filter"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Archived Chats Mode Banner */}
              {showArchivedView && (
                <div className="mx-3 my-2 px-3.5 py-2 bg-neutral-800/90 border border-neutral-700/80 rounded-xl flex items-center justify-between text-xs text-neutral-200 shrink-0">
                  <div className="flex items-center gap-2">
                    <Archive className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="font-medium">Archived Chats</span>
                  </div>
                  <button 
                    onClick={() => setShowArchivedView(false)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                  >
                    Back to Inbox
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto h-full w-full">
            {!isSearchActive || !searchQuery.trim() ? (
            filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 flex flex-col items-center justify-center h-full">
                <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">
                  {showArchivedView ? "No archived chats." : filterUnread ? "No unread chats." : "No active conversations."}
                </p>
                {filterUnread && (
                  <button
                    onClick={() => setFilterUnread(false)}
                    className="text-indigo-400 hover:text-indigo-300 text-sm mt-3 border border-indigo-500/30 px-4 py-1.5 rounded-full transition-colors"
                  >
                    Show all chats
                  </button>
                )}
                {!showArchivedView && !filterUnread && (
                  <button
                    onClick={() => setShowAdd(!showAdd)}
                    className="text-indigo-400 hover:text-indigo-300 text-sm mt-3 border border-indigo-500/30 px-4 py-1.5 rounded-full transition-colors"
                  >
                    Start a secure chat
                  </button>
                )}
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => onSelectConv(conv.id)}
                  className={`w-full p-3 flex items-center gap-3 transition-colors text-left border-b border-neutral-800/50 group ${activeConvId === conv.id ? "bg-neutral-800" : "hover:bg-neutral-800/50"}`}
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
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-500 shrink-0">
                          {conv.messages.length > 0 &&
                            new Date(
                              conv.messages[conv.messages.length - 1].timestamp,
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                        </span>
                        {showArchivedView ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onUpdateConversation) {
                                onUpdateConversation(conv.id, { isArchived: false });
                              }
                              toast("Conversation unarchived", "info");
                            }}
                            className="px-2 py-0.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 text-[11px] rounded transition-colors"
                            title="Unarchive chat"
                          >
                            Unarchive
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onUpdateConversation) {
                                onUpdateConversation(conv.id, { isArchived: true });
                              }
                              toast("Conversation archived", "info");
                            }}
                            className="opacity-0 group-hover:opacity-70 hover:!opacity-100 p-1 rounded hover:bg-neutral-700 text-neutral-400 hover:text-white transition-opacity"
                            title="Archive chat"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
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
                 callLogs={callLogs}
                 onClearCallLogs={clearCallLogs}
              />
            </div>
          ) : (
            <StoriesTab
              currentUserId={myId}
              currentUserName={myName || myUsername || "You"}
              currentUserAvatar={myPhoto}
              conversations={conversations}
              socket={socket}
            />
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
            {/* Chat Header or Selection Action Bar */}
            {selectedMsgIds.length > 0 ? (
              <div className="h-16 border-b border-indigo-500/40 bg-neutral-900/95 backdrop-blur-md z-30 sticky top-0 shrink-0 flex items-center justify-between px-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedMsgIds([]);
                      setShowDeleteMenu(false);
                    }}
                    className="p-2 -ml-1 text-neutral-300 hover:text-white rounded-full hover:bg-neutral-800 transition-colors"
                    title="Cancel selection"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <span className="text-base font-bold text-white select-none">
                    {selectedMsgIds.length}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 relative">
                  {/* Info button - if 1 message selected */}
                  {selectedMsgIds.length === 1 && (
                    <button
                      onClick={() => {
                        const target = activeConv?.messages.find((m) => m.id === selectedMsgIds[0]);
                        if (target) {
                          setMessageInfoTarget(target);
                          setShowInfoModal(true);
                        }
                      }}
                      className="p-2 text-neutral-300 hover:text-white rounded-full hover:bg-neutral-800 transition-colors"
                      title="Message info"
                    >
                      <Info className="w-5 h-5" />
                    </button>
                  )}

                  {/* Reply button - if 1 message selected */}
                  {selectedMsgIds.length === 1 && (
                    <button
                      onClick={() => {
                        const target = activeConv?.messages.find((m) => m.id === selectedMsgIds[0]);
                        if (target) {
                          setReplyingTo(target);
                          setSelectedMsgIds([]);
                        }
                      }}
                      className="p-2 text-neutral-300 hover:text-white rounded-full hover:bg-neutral-800 transition-colors"
                      title="Reply"
                    >
                      <Reply className="w-5 h-5" />
                    </button>
                  )}

                  {/* Copy button */}
                  <button
                    onClick={() => {
                      const texts = activeConv?.messages
                        .filter((m) => selectedMsgIds.includes(m.id) && m.decryptedText)
                        .map((m) => m.decryptedText)
                        .join("\n");
                      if (texts) {
                        navigator.clipboard.writeText(texts);
                        toast("Copied to clipboard", "success");
                      }
                      setSelectedMsgIds([]);
                    }}
                    className="p-2 text-neutral-300 hover:text-white rounded-full hover:bg-neutral-800 transition-colors"
                    title="Copy"
                  >
                    <Copy className="w-5 h-5" />
                  </button>

                  {/* Edit button - if 1 message selected and isSelf and not deleted */}
                  {(() => {
                    const single = selectedMsgIds.length === 1 ? activeConv?.messages.find((m) => m.id === selectedMsgIds[0]) : null;
                    if (single && single.isSelf && !single.isDeletedForEveryone && !single.attachmentId && (!single.attachments || single.attachments.length === 0)) {
                      return (
                        <button
                          onClick={() => {
                            setEditingMsg(single);
                            setText(single.decryptedText);
                            setSelectedMsgIds([]);
                          }}
                          className="p-2 text-neutral-300 hover:text-white rounded-full hover:bg-neutral-800 transition-colors"
                          title="Edit message"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                      );
                    }
                    return null;
                  })()}

                  {/* Delete button with Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowDeleteMenu(!showDeleteMenu)}
                      className="p-2 text-neutral-300 hover:text-rose-400 rounded-full hover:bg-neutral-800 transition-colors"
                      title="Delete options"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>

                    {showDeleteMenu && (
                      <div className="absolute right-0 top-full mt-2 w-52 bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                        <button
                          onClick={() => {
                            if (onDeleteMessage && activeConv) {
                              onDeleteMessage(activeConv.id, selectedMsgIds, false);
                            }
                            setSelectedMsgIds([]);
                            setShowDeleteMenu(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs font-medium text-neutral-200 hover:bg-neutral-800 flex items-center gap-2 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-neutral-400" />
                          Delete for me
                        </button>

                        {/* Delete for everyone - only if all selected messages are self */}
                        {activeConv?.messages
                          .filter((m) => selectedMsgIds.includes(m.id))
                          .every((m) => m.isSelf) && (
                          <button
                            onClick={() => {
                              if (onDeleteMessage && activeConv) {
                                onDeleteMessage(activeConv.id, selectedMsgIds, true);
                              }
                              setSelectedMsgIds([]);
                              setShowDeleteMenu(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-xs font-medium text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-rose-400" />
                            Delete for everyone
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
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
                    onClick={() => activeConv?.isGroup ? setShowGroupAdmin(true) : setShowChatSettings(true)}
                  >
                    <div
                      onClick={(e) => {
                        if (activeConv?.photoUrl) {
                          e.stopPropagation();
                          setLightboxState({ isOpen: true, urls: [activeConv.photoUrl], activeIndex: 0 });
                        }
                      }}
                      className="shrink-0"
                      title={activeConv?.photoUrl ? "View profile photo" : "Profile photo"}
                    >
                      <DecryptedAvatar 
                        photoUrl={activeConv?.photoUrl}
                        fallback={activeConv?.displayName && activeConv.displayName !== 'Unknown' ? activeConv.displayName.substring(0, 2).toUpperCase() : "?"}
                        className="w-10 h-10 rounded-full shrink-0 shadow-sm cursor-pointer hover:ring-2 hover:ring-indigo-500/50 transition-all"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-neutral-100 truncate flex items-center gap-1.5">
                        {isNoteToSelf ? "Note to Self" : (activeConv?.displayName || "Unknown")}
                        {isNoteToSelf && <BadgeCheck className="w-4 h-4 text-indigo-400 shrink-0" />}
                        {(activeConv?.isPostQuantum || isNoteToSelf) && (
                          <span
                            title="Secured with Signal PQXDH & Post-Quantum Double Ratchet (ML-KEM-768)"
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            PQXDH
                          </span>
                        )}
                        {activeConvId && verifiedContacts[activeConvId] && (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 bg-emerald-500/10 px-1 py-0.5 rounded">
                            <Check className="w-2.5 h-2.5" /> Verified
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-neutral-500 mb-1 truncate flex items-center gap-1">
                        {(activeConv?.isPostQuantum || isNoteToSelf) && (
                          <span className="text-emerald-400/90 font-mono text-[11px]">PQ · </span>
                        )}
                        {activeConv?.isGroup
                          ? `${activeConv.groupMembers?.length || 1} members · Tap for group info & settings`
                          : activeConv?.disappearDelay !== undefined && activeConv.disappearDelay > 0
                          ? `Disappearing in ${activeConv.disappearDelay}s`
                          : (activeConv?.disappearDelay === undefined || activeConv?.disappearDelay === -1) && globalDisappear > 0
                          ? `Default: Disappearing in ${globalDisappear}s`
                          : "Tap for security & chat settings"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activeConv?.isGroup ? (
                    <button
                      onClick={() => setShowGroupAdmin(true)}
                      className="p-2 bg-neutral-800 rounded-full hover:bg-neutral-700 text-neutral-400 transition-colors"
                      title="Group Info & Settings"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                  ) : activeConv?.id !== myId && (
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
            )}

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

            {activeConv?.isRequest && (
              <div className="bg-amber-500/10 border-b border-amber-500/20 py-2.5 px-4 text-center text-xs font-medium text-amber-200 flex flex-wrap justify-between items-center gap-2 shrink-0 z-10">
                <span className="flex items-center gap-1.5">
                  <span className="text-amber-400">🛡️</span>
                  <span>Message Request from unknown contact. Allow messages from this user?</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (onDeleteConversation) onDeleteConversation(activeConv.id);
                      toast("Message request declined", "info");
                    }}
                    className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-rose-300 rounded-lg text-xs transition-colors"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => {
                      if (onUpdateConversation) onUpdateConversation(activeConv.id, { isRequest: false });
                      toast("Message request accepted", "success");
                    }}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                  >
                    Accept
                  </button>
                </div>
              </div>
            )}

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

                        {/* Post-Quantum Encryption & Safety Section */}
                        <div className="py-4 px-4 border-b border-neutral-800 bg-neutral-900/40">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="w-5 h-5 text-emerald-400" />
                              <span className="font-medium text-neutral-100">Post-Quantum Security</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              ML-KEM-768
                            </span>
                          </div>

                          <div className="space-y-2 text-xs text-neutral-400 bg-neutral-950/60 p-3 rounded-xl border border-neutral-800">
                            <div className="flex justify-between items-center py-0.5 border-b border-neutral-800/60">
                              <span className="text-neutral-500">Protocol</span>
                              <span className="font-mono text-neutral-200">Signal PQXDH + Double Ratchet</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5 border-b border-neutral-800/60">
                              <span className="text-neutral-500">PQ Standard</span>
                              <span className="font-mono text-emerald-400">NIST FIPS 203 (ML-KEM-768)</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5 border-b border-neutral-800/60">
                              <span className="text-neutral-500">Classical Curve</span>
                              <span className="font-mono text-neutral-300">Curve25519 (X25519)</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5 border-b border-neutral-800/60">
                              <span className="text-neutral-500">KDF Derivation</span>
                              <span className="font-mono text-neutral-300">HKDF-SHA256 (Hybrid PQ)</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5">
                              <span className="text-neutral-500">Forward Secrecy</span>
                              <span className="text-emerald-400 flex items-center gap-1 font-medium">
                                <Check className="w-3.5 h-3.5" /> Break-in Recovery Active
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => setShowSafetyModal(true)}
                            className="mt-3 w-full py-3 px-4 bg-emerald-600/15 hover:bg-emerald-600/25 active:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                          >
                            <Key className="w-4 h-4" />
                            Verify Safety Number & QR Code
                          </button>
                        </div>
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
                <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 mb-3 shadow-lg shadow-emerald-500/5">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="flex items-center gap-1.5 justify-center mb-1">
                  <span className="text-sm font-semibold text-neutral-200">
                    Post-Quantum End-to-End Encrypted
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    ML-KEM-768
                  </span>
                </div>
                <p className="text-xs text-neutral-400 max-w-sm text-center">
                  Messages and calls are secured with Signal's PQXDH & Post-Quantum Double Ratchet. Protected against present and future quantum computers.
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

              {visibleMessages.map((msg, index) => {
                const isScheduled = msg.status === "scheduled";
                const prevMsg = index > 0 ? visibleMessages[index - 1] : null;
                const isNewDay = !prevMsg || new Date(msg.timestamp).toDateString() !== new Date(prevMsg.timestamp).toDateString();
                return (
                  <React.Fragment key={msg.id}>
                    {isNewDay && (
                      <div className="flex justify-center my-3 select-none">
                        <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-neutral-800/90 text-neutral-300 shadow-sm border border-neutral-700/50 backdrop-blur-md">
                          {formatMessageDateDivider(msg.timestamp)}
                        </span>
                      </div>
                    )}
                    <div
                      id={`msg-${msg.id}`}
                      className={`relative w-full mb-1 flex items-center overflow-visible transition-all duration-300 ${
                        highlightMsgId === msg.id 
                          ? 'scale-[1.02] ring-2 ring-indigo-400 ring-offset-2 ring-offset-neutral-950 rounded-2xl bg-indigo-500/25 shadow-[0_0_24px_rgba(99,102,241,0.5)]' 
                          : ''
                      }`}
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
                      {(() => {
                        const hasMedia = Boolean((msg.attachments && msg.attachments.length > 0) || msg.attachmentId);
                        const hasCaption = hasMedia && Boolean(msg.decryptedText && msg.decryptedText.trim().length > 0);
                        const isPureMedia = hasMedia && !hasCaption;
                        const isVoice = Boolean(
                          (msg.attachments && msg.attachments.some(a => (a.decryptionKey || '').includes('audio/'))) || 
                          (msg.decryptionKey && msg.decryptionKey.includes('audio/'))
                        );

                        const timestampNode = (
                          <div className={`inline-flex items-center gap-1 ${msg.isSelf ? "text-indigo-200" : "text-neutral-400"}`}>
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
                            {(msg.isPostQuantum || isNoteToSelf) && (
                              <span title="Protected by Signal PQXDH & Post-Quantum Double Ratchet (ML-KEM-768)" className="opacity-80">
                                <ShieldCheck className="w-2.5 h-2.5 text-emerald-300 inline" />
                              </span>
                            )}
                            {msg.isSelf && !isScheduled && (
                              <span className="ml-1 inline-flex items-center">
                                {msg.status === "sending" && (
                                  <Clock className="w-3.5 h-3.5 opacity-60 animate-pulse text-neutral-300" title="Sending..." />
                                )}
                                {msg.status === "sent" && (
                                  <span title="Sent to server (Recipient offline)" className="inline-flex items-center">
                                    <Check className="w-3.5 h-3.5 text-white/70" strokeWidth={2.2} />
                                  </span>
                                )}
                                {msg.status === "delivered" && (
                                  <span title="Delivered to recipient" className="inline-flex items-center">
                                    <CheckCheck className="w-3.5 h-3.5 text-white/85" strokeWidth={2.2} />
                                  </span>
                                )}
                                {msg.status === "read" && (
                                  <span title={isVoice ? (msg.isHeard ? "Voice Message Listened" : "Delivered (Not Listened)") : "Read / Seen"} className="inline-flex items-center">
                                    {isVoice && !msg.isHeard ? (
                                      <CheckCheck className="w-3.5 h-3.5 text-white/85" strokeWidth={2.2} />
                                    ) : (
                                      <CheckCheck className="w-3.5 h-3.5 text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.85)]" strokeWidth={2.5} />
                                    )}
                                  </span>
                                )}
                              </span>
                            )}
                            {msg.isSelf && isScheduled && msg.scheduledTime && (
                              <span className="ml-0.5 -mr-0.5">
                                <ScheduledClock scheduledTime={msg.scheduledTime} />
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMessageInfoTarget(msg);
                                setShowInfoModal(true);
                              }}
                              className="opacity-0 group-hover:opacity-75 hover:!opacity-100 p-0.5 ml-0.5 rounded transition-opacity"
                              title="Message Info / View who has seen"
                            >
                              <Info className="w-3 h-3 text-current" />
                            </button>
                          </div>
                        );

                        const isSelected = selectedMsgIds.includes(msg.id);
                        let bubbleStyle = msg.isSelf ? "bg-indigo-600 text-white rounded-tr-sm" : "bg-neutral-800 text-neutral-100 rounded-tl-sm";
                        if (isSelected) {
                          bubbleStyle += " ring-2 ring-indigo-400 ring-offset-2 ring-offset-neutral-950 shadow-md";
                        }
                        let bubblePadding = "px-3 py-1.5";

                        if (isPureMedia) {
                          if (isVoice) {
                            bubblePadding = "px-2.5 py-1.5";
                          } else {
                            bubblePadding = "p-0 overflow-hidden";
                          }
                        } else if (hasMedia) {
                          bubblePadding = "p-1 pb-1.5";
                        }

                        if (msg.isDeletedForEveryone) {
                          return (
                            <div 
                              onClick={(e) => {
                                if (selectedMsgIds.length > 0) {
                                  e.stopPropagation();
                                  setSelectedMsgIds((prev) =>
                                    prev.includes(msg.id) ? prev.filter((id) => id !== msg.id) : [...prev, msg.id]
                                  );
                                }
                              }}
                              className={`rounded-2xl shadow-sm ${bubbleStyle} px-3 py-2 group relative select-none`}
                            >
                              <div className="italic text-neutral-400 text-[13px] flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 opacity-60 text-neutral-400 shrink-0" />
                                <span>This message was deleted</span>
                                <div className={`float-right inline-flex items-center gap-1 ml-2 ${msg.isSelf ? "text-indigo-300" : "text-neutral-500"}`}>
                                  {timestampNode}
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div 
                            onClick={(e) => {
                              if (didLongPressMsgRef.current[msg.id] || Date.now() - lastMsgLongPressTimeRef.current < 600) {
                                didLongPressMsgRef.current[msg.id] = false;
                                e.stopPropagation();
                                return;
                              }
                              if (selectedMsgIds.length > 0) {
                                e.stopPropagation();
                                setSelectedMsgIds((prev) =>
                                  prev.includes(msg.id) ? prev.filter((id) => id !== msg.id) : [...prev, msg.id]
                                );
                              }
                            }}
                            onPointerDown={() => {
                              didLongPressMsgRef.current[msg.id] = false;
                              if (selectedMsgIds.length > 0) return;
                              longPressTimerRef.current[msg.id] = setTimeout(() => {
                                didLongPressMsgRef.current[msg.id] = true;
                                lastMsgLongPressTimeRef.current = Date.now();
                                setSelectedMsgIds([msg.id]);
                                setShowDeleteMenu(false);
                                if (window.navigator?.vibrate) window.navigator.vibrate(40);
                              }, 450);
                            }}
                            onPointerUp={() => {
                              if (longPressTimerRef.current[msg.id]) {
                                clearTimeout(longPressTimerRef.current[msg.id]);
                                delete longPressTimerRef.current[msg.id];
                              }
                            }}
                            onPointerLeave={() => {
                              if (longPressTimerRef.current[msg.id]) {
                                clearTimeout(longPressTimerRef.current[msg.id]);
                                delete longPressTimerRef.current[msg.id];
                              }
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              if (selectedMsgIds.length === 0) {
                                setSelectedMsgIds([msg.id]);
                              } else {
                                setSelectedMsgIds((prev) =>
                                  prev.includes(msg.id) ? prev.filter((id) => id !== msg.id) : [...prev, msg.id]
                                );
                              }
                            }}
                            className={`rounded-2xl shadow-sm ${bubbleStyle} ${bubblePadding} group relative`}
                          >
                            {activeConv?.isGroup && !msg.isSelf && (
                              <div 
                                className="text-[12px] font-semibold mb-1 px-1 tracking-tight select-none cursor-pointer"
                                style={{ color: getSenderColor(msg.senderId) }}
                              >
                                {msg.senderName || activeConv.groupMembers?.find((m) => m.userId === msg.senderId)?.displayName || conversations.find((c) => c.id === msg.senderId)?.displayName || msg.senderId.slice(0, 8)}
                              </div>
                            )}

                            {msg.replyTo && (
                              <div 
                                className="mb-2 mx-0.5 bg-black/35 backdrop-blur-md rounded-xl p-2.5 border-l-[3.5px] border-indigo-400 text-sm flex flex-col gap-0.5 cursor-pointer hover:bg-black/50 active:scale-[0.99] transition-all select-none shadow-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!msg.replyToId) return;
                                  const targetId = msg.replyToId;
                                  const el = document.getElementById(`msg-${targetId}`);
                                  if (el) {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    setHighlightMsgId(targetId);
                                    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
                                    highlightTimeoutRef.current = setTimeout(() => {
                                      setHighlightMsgId(null);
                                    }, 2000);
                                  } else {
                                    toast("Original message not found in this chat", "info");
                                  }
                                }}
                              >
                                <div className="flex items-center gap-1.5 font-semibold text-indigo-300 text-[11px] leading-tight">
                                  <Reply className="w-3 h-3 rotate-180 opacity-80 shrink-0" />
                                  <span className="truncate">
                                    {msg.replyTo.senderId === myId || (msg.isSelf && msg.replyTo.isSelf)
                                      ? "You" 
                                      : (msg.replyTo.senderName || "Unknown")}
                                  </span>
                                </div>
                                <span className={`truncate text-[12px] opacity-90 ${msg.isSelf ? 'text-indigo-100' : 'text-neutral-300'}`}>
                                  {msg.replyTo.text || "Attachment"}
                                </span>
                              </div>
                            )}

                            {msg.isViewOnce ? (
                              <div className="flex flex-wrap items-end min-w-0 min-h-0 gap-x-3 gap-y-1 p-2">
                                <ViewOnceMessage msg={msg} onViewed={() => {
                                  if (onViewOnceOpened) {
                                    onViewOnceOpened(msg.id, msg.attachmentId);
                                  }
                                }} />
                                <div className={`shrink-0 inline-flex items-center gap-1 ${msg.isSelf ? "text-indigo-300" : "text-neutral-500"}`}>
                                  {timestampNode}
                                </div>
                              </div>
                            ) : (
                              <>
                                {msg.attachments && msg.attachments.length > 0 ? (
                                  <MediaGridLoader
                                    items={msg.attachments}
                                    isSelf={msg.isSelf}
                                    isHeard={msg.isHeard}
                                    onPlayed={() => {
                                      if (!msg.isSelf) {
                                        const targetRecipient = activeConv?.isGroup ? activeConv.id : msg.senderId;
                                        socket.emit("message_receipt", {
                                          messageId: msg.id,
                                          recipientId: targetRecipient,
                                          status: "read",
                                          isHeard: true,
                                          readAt: new Date().toISOString(),
                                        });
                                        if (activeConv?.isGroup && msg.senderId && msg.senderId !== targetRecipient) {
                                          socket.emit("message_receipt", {
                                            messageId: msg.id,
                                            recipientId: msg.senderId,
                                            status: "read",
                                            isHeard: true,
                                            readAt: new Date().toISOString(),
                                          });
                                        }
                                        if (onUpdateConversation && activeConv) {
                                          onUpdateConversation(activeConv.id, {
                                            messages: activeConv.messages.map((m) =>
                                              m.id === msg.id ? { ...m, isHeard: true } : m
                                            ),
                                          });
                                        }
                                      }
                                    }}
                                    footer={isPureMedia ? timestampNode : undefined}
                                    onImageClick={(url, idx, allUrls) => {
                                      setLightboxState({ isOpen: true, urls: allUrls, activeIndex: idx });
                                    }}
                                  />
                                ) : msg.attachmentId ? (
                                  <AttachmentLoader
                                    attachmentId={msg.attachmentId}
                                    decryptionKey={msg.decryptionKey}
                                    isSelf={msg.isSelf}
                                    isHeard={msg.isHeard}
                                    onPlayed={() => {
                                      if (!msg.isSelf) {
                                        const targetRecipient = activeConv?.isGroup ? activeConv.id : msg.senderId;
                                        socket.emit("message_receipt", {
                                          messageId: msg.id,
                                          recipientId: targetRecipient,
                                          status: "read",
                                          isHeard: true,
                                          readAt: new Date().toISOString(),
                                        });
                                        if (activeConv?.isGroup && msg.senderId && msg.senderId !== targetRecipient) {
                                          socket.emit("message_receipt", {
                                            messageId: msg.id,
                                            recipientId: msg.senderId,
                                            status: "read",
                                            isHeard: true,
                                            readAt: new Date().toISOString(),
                                          });
                                        }
                                        if (onUpdateConversation && activeConv) {
                                          onUpdateConversation(activeConv.id, {
                                            messages: activeConv.messages.map((m) =>
                                              m.id === msg.id ? { ...m, isHeard: true } : m
                                            ),
                                          });
                                        }
                                      }
                                    }}
                                    footer={isPureMedia ? timestampNode : undefined}
                                    onImageClick={(url) => {
                                      setLightboxState({ isOpen: true, urls: [url], activeIndex: 0 });
                                    }}
                                  />
                                ) : null}

                                {hasCaption && (
                                  <div className="px-2 pt-1.5 whitespace-pre-wrap break-words min-w-0 text-[15px] leading-snug">
                                    {msg.decryptedText}
                                    {msg.isEdited && <span className="text-[10px] opacity-75 italic ml-1 select-none font-normal">(edited)</span>}
                                    <div className={`float-right inline-flex items-center gap-1 ml-3 mt-1.5 translate-y-[3px] ${msg.isSelf ? "text-indigo-300" : "text-neutral-500"}`}>
                                      {timestampNode}
                                    </div>
                                  </div>
                                )}

                                {!hasMedia && (
                                  <div className="whitespace-pre-wrap break-words min-w-0 text-[15px] leading-snug">
                                    {msg.decryptedText}
                                    {msg.isEdited && <span className="text-[10px] opacity-75 italic ml-1 select-none font-normal">(edited)</span>}
                                    <div className={`float-right inline-flex items-center gap-1 ml-3 mt-1.5 translate-y-[3px] ${msg.isSelf ? "text-indigo-300" : "text-neutral-500"}`}>
                                      {timestampNode}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })()}
                      </div>
                    </motion.div>
                  </div>
                </React.Fragment>
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
              <div className="px-3 py-2 bg-neutral-900/95 backdrop-blur-md border-t border-neutral-800/80 flex items-center justify-between z-20 relative animate-in slide-in-from-bottom-2 duration-200">
                <div className="flex-1 bg-neutral-800/60 backdrop-blur-md rounded-2xl p-2.5 px-3.5 border-l-[3.5px] border-indigo-400 relative min-w-0 flex items-center justify-between gap-3 shadow-inner">
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
                      <Reply className="w-3.5 h-3.5 rotate-180 opacity-80 shrink-0" />
                      <span className="truncate">
                        Replying to {replyingTo.isSelf ? "yourself" : (activeConv?.displayName || "Unknown")}
                      </span>
                    </div>
                    <span className="text-xs text-neutral-300 truncate opacity-90 pl-5">
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
                  <button 
                    onClick={() => setReplyingTo(null)} 
                    className="p-1.5 rounded-full hover:bg-neutral-700/60 text-neutral-400 hover:text-neutral-100 transition-colors shrink-0"
                    title="Cancel reply"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            
            {editingMsg && (
              <div className="px-3 py-2 bg-neutral-900/95 backdrop-blur-md border-t border-neutral-800 flex items-center justify-between z-20">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Edit2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-indigo-300">Editing message</div>
                    <div className="text-xs text-neutral-400 truncate">{editingMsg.decryptedText}</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setEditingMsg(null);
                    setText("");
                  }}
                  className="p-1 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            
            {/* Input */}
            <div className="px-2 md:px-4 pt-2 md:pt-2.5 pb-5 md:pb-4 bg-neutral-900/95 backdrop-blur-md relative z-20 border-t border-neutral-800/80">
              {attachments.length > 0 && !isRecording && (
                <div className="absolute bottom-[calc(100%+8px)] left-2 right-2 md:left-4 md:right-4 bg-neutral-900/95 backdrop-blur-md p-3 rounded-2xl border border-neutral-800 shadow-2xl flex flex-col gap-2 z-30">
                  <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
                    <span className="font-medium text-neutral-300">
                      {attachments.length} {attachments.length === 1 ? "file" : "files"} attached
                    </span>
                    <button
                      onClick={() => setAttachments([])}
                      className="text-neutral-400 hover:text-red-400 text-xs transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 max-h-[90px] scrollbar-thin">
                    {attachments.map((file, idx) => {
                      const isImg = file.type.startsWith("image/");
                      const isAud = file.type.startsWith("audio/");
                      const previewUrl = isImg ? URL.createObjectURL(file) : null;
                      return (
                        <div key={idx} className="relative group shrink-0 w-16 h-16 rounded-xl bg-neutral-800 border border-neutral-700 overflow-hidden flex items-center justify-center">
                          {isImg && previewUrl ? (
                            <img src={previewUrl} alt={file.name} className="w-full h-full object-cover" />
                          ) : isAud ? (
                            <div className="flex flex-col items-center justify-center p-1 text-center">
                              <Mic className="w-5 h-5 text-indigo-400" />
                              <span className="text-[9px] text-neutral-400 truncate max-w-[50px]">Voice</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center p-1 text-center">
                              <Paperclip className="w-5 h-5 text-neutral-400" />
                              <span className="text-[9px] text-neutral-400 truncate max-w-[50px]">{file.name.slice(-4)}</span>
                            </div>
                          )}
                          <button
                            onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs shadow-md transition-transform group-hover:scale-110"
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="shrink-0 w-16 h-16 rounded-xl border border-dashed border-neutral-700 hover:border-neutral-500 flex flex-col items-center justify-center text-neutral-400 hover:text-neutral-200 transition-colors"
                      title="Add more files"
                    >
                      <Plus className="w-5 h-5" />
                      <span className="text-[10px]">Add</span>
                    </button>
                  </div>
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
                  multiple
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      const selectedFiles = Array.from(e.target.files);
                      setAttachments((prev) => [...prev, ...selectedFiles]);
                      e.target.value = "";
                    }
                  }}
                />
                
                {(() => {
                  const isGroupAdmin = Boolean(activeConv?.isGroup && (
                    activeConv.groupMembers?.some((m) => m.userId === myId && m.role === "admin") ||
                    activeConv.groupMembers?.length === 1
                  ));
                  const isBlockedByAdminOnly = Boolean(activeConv?.isGroup && activeConv?.onlyAdminsCanPost && !isGroupAdmin);

                  if (isBlockedByAdminOnly) {
                    return (
                      <div className="flex-1 bg-neutral-800/90 rounded-2xl py-3 px-4 text-center text-xs text-neutral-400 font-medium border border-neutral-700/50 select-none">
                        Only admins can send messages to this group
                      </div>
                    );
                  }

                  return (
                    <>
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
                              if (e.nativeEvent.isComposing) return;
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
                              (!text.trim() && attachments.length === 0 && !isRecording) ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
                            }`}
                            title="Voice Message"
                          >
                            <Mic className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className={`absolute inset-0 flex items-center justify-center text-neutral-400 hover:text-neutral-200 transition-all duration-300 transform ${
                              (text.trim() || attachments.length > 0) && !isRecording ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"
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
                            (!text.trim() && attachments.length === 0 && !isRecording) ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-50 pointer-events-none"
                          }`}
                          title="Attach File"
                        >
                          <Plus className="w-[22px] h-[22px]" />
                        </button>

                        {/* Send button */}
                        <button
                          onPointerDown={() => {
                            didLongPressRef.current = false;
                            schedulePressTimer.current = window.setTimeout(() => {
                              didLongPressRef.current = true;
                              setScheduleOpen(true);
                            }, 750);
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
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setScheduleOpen(true);
                          }}
                          onClick={() => {
                            if (didLongPressRef.current) {
                              didLongPressRef.current = false;
                              return;
                            }
                            if (!scheduleOpen) {
                              handleSend();
                            }
                          }}
                          className={`absolute inset-0 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-md focus:outline-none transition-all duration-300 transform ${
                              (text.trim() || attachments.length > 0) ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-50 pointer-events-none"
                          }`}
                        >
                          <Send className="w-5 h-5 -ml-0.5" />
                        </button>
                      </div>
                    </>
                  );
                })()}
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

      {/* Schedule Message Modal */}
      {scheduleOpen && (
        <CustomDateTimePicker 
          onSelect={(d) => { setScheduleOpen(false); handleSend(d); }} 
          onClose={() => setScheduleOpen(false)} 
        />
      )}

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
      
      {/* Scheduled Messages Modal (Centered & Expanded) */}
      <AnimatePresence>
        {showScheduledModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[90] flex items-center justify-center p-4"
            onClick={() => setShowScheduledModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-neutral-900 w-full max-w-[560px] h-[520px] max-h-[85vh] rounded-3xl flex flex-col overflow-hidden border border-neutral-800 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/80 shrink-0 bg-neutral-900/95 backdrop-blur-md z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
                      Scheduled Messages
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-800 text-indigo-300 border border-neutral-700/60">
                        {scheduledMessages.length}
                      </span>
                    </h2>
                    <p className="text-[11px] text-neutral-400">
                      Auto-sent to recipient when due
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowScheduledModal(false)}
                  className="p-2 bg-neutral-800/80 hover:bg-neutral-700 rounded-full text-neutral-400 hover:text-neutral-100 transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Messages list */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-neutral-950/50 [scrollbar-width:thin] [scrollbar-color:#3f3f46_transparent]">
                {scheduledMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500">
                    <Clock className="w-12 h-12 mb-3 text-neutral-600 stroke-[1.5]" />
                    <p className="text-sm font-medium text-neutral-300 mb-1">No scheduled messages</p>
                    <p className="text-xs text-neutral-500 max-w-xs">
                      Long press or right-click the Send button in any chat to schedule a message for later.
                    </p>
                  </div>
                ) : (
                  scheduledMessages.map((msg) => {
                    const scheduledDate = msg.scheduledTime ? new Date(msg.scheduledTime) : null;
                    const dateLabel = scheduledDate
                      ? scheduledDate.toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Pending schedule";

                    return (
                      <div 
                        key={msg.id} 
                        className="bg-neutral-850 bg-neutral-900/90 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700/80 rounded-2xl p-4 flex flex-col gap-3 shadow-md transition-all group"
                      >
                        {/* Target delivery time badge */}
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-1 rounded-full">
                            <Clock className="w-3 h-3 text-indigo-400" />
                            <span>{dateLabel}</span>
                          </span>
                          <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 flex items-center gap-1 opacity-80">
                            <ShieldCheck className="w-3 h-3" />
                            ML-KEM-768
                          </span>
                        </div>

                        {/* Message content */}
                        <div className="bg-black/35 rounded-xl p-3 border border-white/5 text-sm text-neutral-100 whitespace-pre-wrap break-words leading-relaxed select-text">
                          {msg.decryptedText || (
                            <span className="italic text-neutral-400">Media attachment scheduled</span>
                          )}
                        </div>

                        {/* Card action buttons */}
                        <div className="flex items-center gap-2 pt-1 border-t border-neutral-800/60">
                          <button
                            onClick={() => {
                              socket.emit("send_scheduled_message_now", { messageId: msg.id });
                              onUpdateConversation(activeConvId!, {
                                messages: activeConv!.messages.map((m) =>
                                  m.id === msg.id
                                    ? { ...m, status: "sending", timestamp: new Date(), scheduledTime: undefined }
                                    : m
                                ),
                              });
                              toast("Sending message now...", "info");
                            }}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm active:scale-95"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Send now
                          </button>

                          <button
                            onClick={() => {
                              setRescheduleMsgId(msg.id);
                            }}
                            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700/60 transition-all active:scale-95"
                          >
                            <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                            Reschedule
                          </button>

                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(msg.decryptedText || "");
                              toast("Message copied to clipboard", "success");
                            }}
                            className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 border border-neutral-700/60 transition-all active:scale-95"
                            title="Copy message"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              socket.emit("delete_scheduled_message", { messageId: msg.id });
                              onUpdateConversation(activeConvId!, {
                                messages: activeConv!.messages.filter((m) => m.id !== msg.id),
                              });
                              toast("Scheduled message deleted", "info");
                            }}
                            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all ml-auto active:scale-95"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post-Quantum Safety Number Modal */}
      {showSafetyModal && activeConv && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 w-full max-w-md flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                <h3 className="text-lg font-semibold text-neutral-100">Verify Safety Number</h3>
              </div>
              <button
                onClick={() => setShowSafetyModal(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-400 mb-5 leading-relaxed">
              To verify post-quantum end-to-end security with <span className="font-semibold text-neutral-200">{activeConv.displayName || "this contact"}</span>, compare the numbers below with their device, or scan their QR code.
            </p>

            {/* QR Code Container */}
            <div className="bg-white p-4 rounded-2xl mx-auto mb-6 shadow-inner">
              <QRCode
                value={activeConv.safetyNumbers || (activeConv.id + ":" + myId)}
                size={180}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>

            {/* 60-digit number display */}
            <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 mb-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] text-neutral-500 uppercase tracking-wider font-semibold">
                  Post-Quantum Fingerprint (60 Digits)
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  ML-KEM-768 + X25519
                </span>
              </div>
              <div className="font-mono text-sm tracking-widest text-emerald-300 text-center select-all leading-loose break-words bg-black/40 p-2 rounded-xl">
                {activeConv.safetyNumbers || "31415 92653 58979 32384 62643 38327 95028 84197 16939 93751 05820 97494"}
              </div>
            </div>

            {/* Verification actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const num = activeConv.safetyNumbers || "31415 92653 58979 32384 62643 38327 95028 84197 16939 93751 05820 97494";
                  navigator.clipboard.writeText(num);
                  toast("Safety numbers copied to clipboard", "success");
                }}
                className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" /> Copy
              </button>
              <button
                onClick={() => {
                  const nextVerified = !verifiedContacts[activeConv.id];
                  const updated = { ...verifiedContacts, [activeConv.id]: nextVerified };
                  setVerifiedContacts(updated);
                  localStorage.setItem("verified_contacts", JSON.stringify(updated));
                  toast(nextVerified ? "Contact verified successfully" : "Verification cleared", "success");
                }}
                className={`flex-1 py-3 font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2 ${
                  verifiedContacts[activeConv.id]
                    ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                }`}
              >
                <Check className="w-4 h-4" />
                {verifiedContacts[activeConv.id] ? "Verified" : "Mark as Verified"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Fullscreen Lightbox Modal */}
      {lightboxState.isOpen && lightboxState.urls.length > 0 && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none animate-fadeIn"
          onClick={() => setLightboxState(prev => ({ ...prev, isOpen: false }))}
        >
          {/* Top Control Bar */}
          <div 
            className="absolute top-4 left-4 right-4 flex items-center justify-between text-white z-10"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-sm font-medium text-neutral-300 bg-neutral-900/80 px-3 py-1.5 rounded-full border border-neutral-800">
              {lightboxState.urls.length > 1 ? `${lightboxState.activeIndex + 1} / ${lightboxState.urls.length}` : "Photo"}
            </div>
            <div className="flex items-center gap-2">
              <a 
                href={lightboxState.urls[lightboxState.activeIndex]} 
                download={`securely-photo-${Date.now()}.png`}
                className="p-2.5 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-white border border-neutral-800 transition-colors shadow-lg"
                title="Download photo"
              >
                <Download className="w-5 h-5" />
              </a>
              <button 
                onClick={() => setLightboxState(prev => ({ ...prev, isOpen: false }))}
                className="p-2.5 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-white border border-neutral-800 transition-colors shadow-lg"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Arrows */}
          {lightboxState.urls.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxState(prev => ({
                    ...prev,
                    activeIndex: (prev.activeIndex - 1 + prev.urls.length) % prev.urls.length
                  }));
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-white border border-neutral-800 transition-all shadow-xl z-10 hover:scale-105 active:scale-95"
                title="Previous"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxState(prev => ({
                    ...prev,
                    activeIndex: (prev.activeIndex + 1) % prev.urls.length
                  }));
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-white border border-neutral-800 transition-all shadow-xl z-10 hover:scale-105 active:scale-95"
                title="Next"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Centered Image */}
          <div className="max-w-[90vw] max-h-[85vh] flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <img 
              src={lightboxState.urls[lightboxState.activeIndex]} 
              alt="Photo preview" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}

      {/* Message Info Modal ("View who has seen" / Delivered / Read breakdown) */}
      <MessageInfoModal
        isOpen={showInfoModal}
        onClose={() => {
          setShowInfoModal(false);
          setMessageInfoTarget(null);
        }}
        message={messageInfoTarget}
        conversation={activeConv}
        myId={myId}
      />

      {/* Group Invite Consent-based Modal */}
      <AnimatePresence>
        {groupInvitePrompt && (
          <div className="fixed inset-0 z-[140] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl flex flex-col items-center text-center space-y-4"
            >
              <div className="w-14 h-14 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {groupInvitePrompt.groupName || `Group #${groupInvitePrompt.groupId.slice(0, 8)}`}
                </h3>
                {groupInvitePrompt.description && (
                  <p className="text-xs text-neutral-300 mt-1 italic">
                    "{groupInvitePrompt.description}"
                  </p>
                )}
                <p className="text-xs text-neutral-400 mt-1">
                  {groupInvitePrompt.membersCount !== undefined && (
                    <span className="text-indigo-400 font-medium block mb-1">
                      {groupInvitePrompt.membersCount} participant{groupInvitePrompt.membersCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  {groupInvitePrompt.requireAdminApproval
                    ? "This group requires admin approval before participants can join."
                    : "In Securely, you are never added to groups without your explicit consent."}
                </p>
              </div>
              <div className="flex gap-2 w-full pt-2">
                <button
                  onClick={() => {
                    setGroupInvitePrompt(null);
                    window.history.replaceState({}, '', window.location.pathname);
                    toast("Group invite declined", "info");
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium text-sm transition-colors"
                >
                  Decline
                </button>
                <button
                  onClick={async () => {
                    const gid = groupInvitePrompt.groupId;
                    const cleanId = gid.replace(/^group_/, "");
                    const groupConvId = `group_${cleanId}`;

                    try {
                      const res = await fetch(`/api/v1/groups/${cleanId}/join`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          userId: myId,
                          displayName: myName || myUsername || "You",
                        }),
                      });

                      if (res.ok) {
                        const data = await res.json();
                        if (data.pendingApproval) {
                          toast(`Request sent to admins of "${groupInvitePrompt.groupName || cleanId}". You will be added once approved.`, "info");
                        } else {
                          socket?.emit("join_group", { groupId: cleanId, user: { userId: myId, name: myName || myUsername || "You" } });
                          const resolvedName = data.group?.name || groupInvitePrompt.groupName || `Group #${cleanId.slice(0, 8)}`;
                          onAddContact(groupConvId, resolvedName);
                          if (onUpdateConversation) {
                            onUpdateConversation(groupConvId, {
                              id: groupConvId,
                              displayName: resolvedName,
                              groupDescription: data.group?.description || groupInvitePrompt.description,
                              isGroup: true,
                              requireAdminApproval: data.group?.requireAdminApproval,
                              onlyAdminsCanPost: data.group?.onlyAdminsCanPost,
                              groupMembers: data.group?.members || [
                                {
                                  userId: myId,
                                  displayName: myName || myUsername || "You",
                                  role: "member",
                                  joinedAt: new Date().toISOString(),
                                }
                              ],
                              messages: [
                                {
                                  id: "sys_" + Date.now(),
                                  senderId: "system",
                                  isSelf: false,
                                  decryptedText: `You joined "${resolvedName}".`,
                                  timestamp: new Date(),
                                  status: "read",
                                  isPostQuantum: true
                                }
                              ]
                            });
                          }
                          onSelectConv(groupConvId);
                          toast("Joined group successfully!", "success");
                        }
                      } else {
                        toast("Failed to join group", "error");
                      }
                    } catch {
                      toast("Error joining group", "error");
                    } finally {
                      setGroupInvitePrompt(null);
                      window.history.replaceState({}, '', window.location.pathname);
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-md transition-colors"
                >
                  {groupInvitePrompt.requireAdminApproval ? "Request to Join" : "Join Group"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WhatsApp / Signal Group Admin Modal */}
      {showGroupAdmin && activeConv && (
        <GroupAdminModal
          isOpen={showGroupAdmin}
          onClose={() => setShowGroupAdmin(false)}
          conversation={activeConv}
          currentUserId={myId}
          currentUserName={myName || myUsername || "You"}
          onUpdateConversation={(convId, updates) => {
            if (onUpdateConversation) onUpdateConversation(convId, updates);
          }}
          onLeaveGroup={() => {
            onSelectConv("");
          }}
          socket={socket}
        />
      )}

      {/* Main Sidebar Requests Modal (Silent) */}
      <RequestsModal
        isOpen={showRequestsModal}
        onClose={() => {
          setShowRequestsModal(false);
          refreshRequestsCount();
        }}
        currentUserId={myId}
        currentUserName={myName || myUsername || "You"}
        conversations={conversations}
        onAcceptMessageRequest={(convId) => {
          if (onUpdateConversation) onUpdateConversation(convId, { isRequest: false });
          onSelectConv(convId);
        }}
        onDeclineMessageRequest={(convId) => {
          if (onDeleteConversation) onDeleteConversation(convId);
        }}
        onAcceptInvite={(group) => {
          const groupConvId = `group_${group.groupId}`;
          socket?.emit("join_group", { groupId: group.groupId, user: { userId: myId, name: myName || myUsername || "You" } });
          onAddContact(groupConvId, group.name);
          if (onUpdateConversation) {
            onUpdateConversation(groupConvId, {
              id: groupConvId,
              displayName: group.name,
              groupDescription: group.description,
              isGroup: true,
              requireAdminApproval: group.requireAdminApproval,
              onlyAdminsCanPost: group.onlyAdminsCanPost,
              groupMembers: group.members,
              messages: [
                {
                  id: "sys_" + Date.now(),
                  senderId: "system",
                  isSelf: false,
                  decryptedText: `You joined "${group.name}".`,
                  timestamp: new Date(),
                  status: "read",
                  isPostQuantum: true,
                },
              ],
            });
          }
          onSelectConv(groupConvId);
          refreshRequestsCount();
        }}
        onRequestsCountChange={setPendingRequestsCount}
      />
    </div>
  );
}
