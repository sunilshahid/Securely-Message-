import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, CheckCheck, ShieldCheck, Clock, Users, Eye, Radio, Mic } from "lucide-react";
import { ChatMessage, Conversation } from "../types";

interface MessageInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: ChatMessage | null;
  conversation?: Conversation;
  myId: string;
}

export function MessageInfoModal({
  isOpen,
  onClose,
  message,
  conversation,
  myId,
}: MessageInfoModalProps) {
  if (!isOpen || !message) return null;

  const isGroup = conversation?.isGroup;
  const isVoice = Boolean(
    (message.attachments && message.attachments.some(a => (a.decryptionKey || '').includes('audio/'))) || 
    (message.decryptionKey && message.decryptionKey.includes('audio/')) ||
    message.isHeard !== undefined
  );
  const sentDate = new Date(message.timestamp);
  const sentFormatted = sentDate.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const deliveredDate = message.deliveredAt ? new Date(message.deliveredAt) : null;
  const deliveredFormatted = deliveredDate
    ? deliveredDate.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : message.status === "delivered" || message.status === "read"
    ? "Delivered to device"
    : "Waiting for recipient to come online";

  const readDate = message.readAt ? new Date(message.readAt) : null;
  const readFormatted = readDate
    ? readDate.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : message.status === "read"
    ? "Read by contact"
    : "Not read yet";

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-neutral-900 w-full h-full sm:h-auto max-h-none sm:max-h-[85vh] sm:max-w-md sm:rounded-3xl rounded-none sm:border border-neutral-800 shadow-2xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-900/90">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Eye className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold text-white">Message Info</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Message Bubble Preview */}
            <div className="bg-neutral-950/70 p-3.5 rounded-2xl border border-neutral-800/80">
              <p className="text-xs text-neutral-400 uppercase tracking-wider font-semibold mb-1.5">
                Message Preview
              </p>
              <div className="p-3 bg-neutral-900 rounded-xl text-sm text-neutral-100 whitespace-pre-wrap break-words border border-white/5">
                {message.decryptedText || (
                  <span className="italic text-neutral-400">Attachment message</span>
                )}
              </div>
            </div>

            {/* Status Breakdown (WhatsApp / Signal Style) */}
            <div className="bg-neutral-950/70 rounded-2xl border border-neutral-800/80 divide-y divide-neutral-800/60 overflow-hidden">
              {/* Voice Note Played / Listened */}
              {isVoice && (
                <div className="p-4 flex items-start gap-3.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    message.isHeard
                      ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                      : "bg-neutral-800 border border-neutral-700 text-neutral-400"
                  }`}>
                    <Mic className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">Played / Listened</p>
                      <span className={`text-xs font-mono font-medium ${message.isHeard ? "text-emerald-400" : "text-neutral-500"}`}>
                        {message.isHeard ? "Listened" : "Not listened yet"}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {message.isHeard 
                        ? (message.readAt ? new Date(message.readAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Listened by contact")
                        : "Waiting for contact to play voice message"}
                    </p>
                  </div>
                </div>
              )}

              {/* Read / Seen */}
              <div className="p-4 flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCheck className="w-4 h-4 text-emerald-400" strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">Read</p>
                    <span className="text-xs font-mono text-emerald-400">
                      {message.status === "read" ? "Seen" : "Unread"}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {readFormatted}
                  </p>
                </div>
              </div>

              {/* Delivered */}
              <div className="p-4 flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCheck className="w-4 h-4 text-white/80" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">Delivered</p>
                    <span className="text-xs font-mono text-neutral-300">
                      {message.status === "delivered" || message.status === "read" ? "Delivered" : "Pending"}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {deliveredFormatted}
                  </p>
                </div>
              </div>

              {/* Sent */}
              <div className="p-4 flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-4 h-4 text-white/70" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">Sent</p>
                    <span className="text-xs font-mono text-neutral-400">Dispatched</span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {sentFormatted}
                  </p>
                </div>
              </div>
            </div>

            {/* Group Members Seen Breakdown (If Group) */}
            {isGroup && conversation.groupMembers && conversation.groupMembers.length > 0 && (
              <div className="bg-neutral-950/70 p-4 rounded-2xl border border-neutral-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-400" /> Group Read Receipts
                  </p>
                  <span className="text-[11px] text-neutral-400">
                    {conversation.groupMembers.length} members
                  </span>
                </div>

                <div className="space-y-2">
                  {conversation.groupMembers
                    .filter((m) => m.userId !== myId)
                    .map((m) => {
                      const receipt = message.receipts?.find((r) => r.userId === m.userId);
                      const isRead = receipt?.readAt || (message.status === "read");
                      const isDelivered = receipt?.deliveredAt || message.status === "delivered" || isRead;

                      return (
                        <div 
                          key={m.userId}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-900/60 border border-white/5 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-300 font-bold flex items-center justify-center text-[10px]">
                              {m.displayName.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-medium text-neutral-200">{m.displayName}</span>
                            {m.role === "admin" && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-indigo-500/20 text-indigo-300 font-semibold">
                                Admin
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isRead ? (
                              <span className="text-emerald-400 flex items-center gap-1 font-medium text-[11px]">
                                <CheckCheck className="w-3.5 h-3.5" /> Read
                              </span>
                            ) : isDelivered ? (
                              <span className="text-neutral-400 flex items-center gap-1 text-[11px]">
                                <CheckCheck className="w-3.5 h-3.5 text-white/70" /> Delivered
                              </span>
                            ) : (
                              <span className="text-neutral-500 flex items-center gap-1 text-[11px]">
                                <Clock className="w-3.5 h-3.5" /> Sent
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Cryptographic Blind Server Security Note */}
            <div className="p-3.5 rounded-2xl bg-indigo-950/25 border border-indigo-500/25 flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-neutral-300 leading-relaxed">
                <span className="font-semibold text-emerald-300 block mb-0.5">
                  Blind Server E2EE Verification
                </span>
                Protected by Signal PQXDH & Post-Quantum Double Ratchet (ML-KEM-768 + X25519). 
                The server relays encrypted packets blindly without collecting receipt logs or metadata.
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
