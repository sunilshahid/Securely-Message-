import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GroupInviteRequestItem, AdminPendingApproval, Conversation } from "../types";
import { toast } from "./Toast";
import { DecryptedAvatar } from "./DecryptedAvatar";

interface RequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserName: string;
  onAcceptInvite: (group: any) => void;
  onRequestsCountChange?: (count: number) => void;
  conversations?: Conversation[];
  onAcceptMessageRequest?: (convId: string) => void;
  onDeclineMessageRequest?: (convId: string) => void;
}

export default function RequestsModal({
  isOpen,
  onClose,
  currentUserId,
  currentUserName,
  onAcceptInvite,
  onRequestsCountChange,
  conversations = [],
  onAcceptMessageRequest,
  onDeclineMessageRequest,
}: RequestsModalProps) {
  const [activeTab, setActiveTab] = useState<"invites" | "approvals" | "messages">("invites");
  const [invites, setInvites] = useState<GroupInviteRequestItem[]>([]);
  const [adminApprovals, setAdminApprovals] = useState<AdminPendingApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const messageRequests = conversations.filter((c) => c.isRequest === true);

  const fetchRequests = useCallback(async () => {
    if (!currentUserId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/users/${currentUserId}/requests`);
      if (res.ok) {
        const data = await res.json();
        const fetchedInvites = data.invites || [];
        const fetchedApprovals = data.adminApprovals || [];
        setInvites(fetchedInvites);
        setAdminApprovals(fetchedApprovals);
        if (onRequestsCountChange) {
          onRequestsCountChange(
            fetchedInvites.length + fetchedApprovals.length + messageRequests.length
          );
        }
      }
    } catch {
      // Quietly fail without noisy notifications
    } finally {
      setLoading(false);
    }
  }, [currentUserId, onRequestsCountChange, messageRequests.length]);

  useEffect(() => {
    if (isOpen) {
      fetchRequests();
    }
  }, [isOpen, fetchRequests]);

  if (!isOpen) return null;

  const handleRespondInvite = async (requestId: string, action: "accept" | "decline") => {
    setActionLoading(`invite_${requestId}`);
    try {
      const res = await fetch(`/api/v1/requests/${requestId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          displayName: currentUserName || "Member",
          action,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const updatedInvites = invites.filter((inv) => inv.id !== requestId);
        setInvites(updatedInvites);
        if (onRequestsCountChange) {
          onRequestsCountChange(
            updatedInvites.length + adminApprovals.length + messageRequests.length
          );
        }

        if (action === "accept" && data.group) {
          onAcceptInvite(data.group);
          toast(`Joined group "${data.group.name}"!`, "success");
        } else {
          toast("Invitation declined", "info");
        }
      } else {
        toast("Failed to respond to invite", "error");
      }
    } catch {
      toast("Error responding to invite", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveAdminRequest = async (groupId: string, targetUserId: string) => {
    setActionLoading(`appr_${groupId}_${targetUserId}`);
    try {
      const res = await fetch(`/api/v1/groups/${groupId}/approve_request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: currentUserId,
          targetUserId,
        }),
      });

      if (res.ok) {
        const updatedApprovals = adminApprovals.filter(
          (a) => !(a.groupId === groupId && a.user.userId === targetUserId)
        );
        setAdminApprovals(updatedApprovals);
        if (onRequestsCountChange) {
          onRequestsCountChange(
            invites.length + updatedApprovals.length + messageRequests.length
          );
        }
        toast("User approved to join group!", "success");
      } else {
        toast("Failed to approve request", "error");
      }
    } catch {
      toast("Error approving request", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectAdminRequest = async (groupId: string, targetUserId: string) => {
    setActionLoading(`rej_${groupId}_${targetUserId}`);
    try {
      const res = await fetch(`/api/v1/groups/${groupId}/reject_request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: currentUserId,
          targetUserId,
        }),
      });
      if (res.ok) {
        const updatedApprovals = adminApprovals.filter(
          (a) => !(a.groupId === groupId && a.user.userId === targetUserId)
        );
        setAdminApprovals(updatedApprovals);
        if (onRequestsCountChange) {
          onRequestsCountChange(
            invites.length + updatedApprovals.length + messageRequests.length
          );
        }
        toast("Join request rejected", "info");
      } else {
        toast("Failed to reject request", "error");
      }
    } catch {
      toast("Error rejecting request", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const totalCount = invites.length + adminApprovals.length + messageRequests.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-lg bg-neutral-900 sm:border border-neutral-800 sm:rounded-2xl rounded-none shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-neutral-800 bg-neutral-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center border border-indigo-500/30">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
                Pending Requests
                {totalCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-600 text-white rounded-full">
                    {totalCount}
                  </span>
                )}
              </h2>
              <p className="text-xs text-neutral-400">Silent invites, approvals & message requests</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-neutral-800 px-3 sm:px-4 bg-neutral-900/50 shrink-0 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("invites")}
            className={`py-3 px-3 sm:px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === "invites"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Group Invites
            {invites.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] bg-indigo-500/20 text-indigo-300 font-bold rounded-full">
                {invites.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("approvals")}
            className={`py-3 px-3 sm:px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === "approvals"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Admin Approvals
            {adminApprovals.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] bg-amber-500/20 text-amber-300 font-bold rounded-full">
                {adminApprovals.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("messages")}
            className={`py-3 px-3 sm:px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === "messages"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Message Requests
            {messageRequests.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] bg-emerald-500/20 text-emerald-300 font-bold rounded-full">
                {messageRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {loading ? (
            <div className="text-center py-10 text-neutral-500 text-sm">
              Loading requests...
            </div>
          ) : activeTab === "invites" ? (
            invites.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <div className="w-12 h-12 rounded-full bg-neutral-800/80 flex items-center justify-center mx-auto text-neutral-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="text-sm font-medium text-neutral-300">No Pending Invitations</h4>
                <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                  When someone invites you to a group directly, it will appear here silently.
                </p>
              </div>
            ) : (
              invites.map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 bg-neutral-800/40 border border-neutral-800 rounded-xl space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-semibold tracking-wider text-indigo-400 uppercase block mb-0.5">
                        Group Invitation
                      </span>
                      <h4 className="text-sm font-semibold text-neutral-100">{inv.groupName}</h4>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Invited by <span className="text-neutral-200">{inv.fromUserName}</span>
                      </p>
                    </div>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {new Date(inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      disabled={!!actionLoading}
                      onClick={() => handleRespondInvite(inv.id, "decline")}
                      className="flex-1 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors"
                    >
                      Decline
                    </button>
                    <button
                      disabled={!!actionLoading}
                      onClick={() => handleRespondInvite(inv.id, "accept")}
                      className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm"
                    >
                      Join Group
                    </button>
                  </div>
                </div>
              ))
            )
          ) : activeTab === "approvals" ? (
            adminApprovals.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <div className="w-12 h-12 rounded-full bg-neutral-800/80 flex items-center justify-center mx-auto text-neutral-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h4 className="text-sm font-medium text-neutral-300">No Approvals Needed</h4>
                <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                  When new users request to join groups where you are admin, they will appear here.
                </p>
              </div>
            ) : (
              adminApprovals.map((appr, idx) => (
                <div
                  key={`${appr.groupId}_${appr.user.userId}_${idx}`}
                  className="p-4 bg-neutral-800/40 border border-neutral-800 rounded-xl space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-semibold tracking-wider text-indigo-400 uppercase block mb-0.5">
                        {appr.groupName}
                      </span>
                      <h4 className="text-sm font-semibold text-neutral-100">{appr.user.displayName}</h4>
                      <p className="text-xs text-neutral-500 font-mono mt-0.5">{appr.user.userId.substring(0, 20)}...</p>
                    </div>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {new Date(appr.user.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      disabled={!!actionLoading}
                      onClick={() => handleRejectAdminRequest(appr.groupId, appr.user.userId)}
                      className="flex-1 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      disabled={!!actionLoading}
                      onClick={() => handleApproveAdminRequest(appr.groupId, appr.user.userId)}
                      className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))
            )
          ) : (
            /* Message Requests Tab */
            messageRequests.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <div className="w-12 h-12 rounded-full bg-neutral-800/80 flex items-center justify-center mx-auto text-neutral-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h4 className="text-sm font-medium text-neutral-300">No Message Requests</h4>
                <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                  Messages from unknown contacts not in your address book will wait here safely.
                </p>
              </div>
            ) : (
              messageRequests.map((conv) => {
                const lastMsg = conv.messages[conv.messages.length - 1];
                return (
                  <div
                    key={conv.id}
                    className="p-4 bg-neutral-800/40 border border-neutral-800 rounded-xl space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center shrink-0">
                        {conv.photoUrl ? (
                          <DecryptedAvatar photoUrl={conv.photoUrl} fallback={(conv.displayName || conv.id).substring(0, 2).toUpperCase()} className="w-10 h-10 rounded-full" />
                        ) : (
                          (conv.displayName || conv.id).substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-neutral-100 truncate">
                            {conv.displayName || `User ${conv.id.substring(0, 12)}...`}
                          </h4>
                          <span className="text-[10px] text-neutral-500 font-mono shrink-0 ml-2">
                            {lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 truncate mt-0.5">
                          {lastMsg ? lastMsg.decryptedText : "Direct message request"}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => {
                          if (onDeclineMessageRequest) onDeclineMessageRequest(conv.id);
                          toast("Message request declined", "info");
                        }}
                        className="flex-1 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-rose-400 hover:text-rose-300 text-xs font-medium transition-colors"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => {
                          if (onAcceptMessageRequest) onAcceptMessageRequest(conv.id);
                          toast("Message request accepted", "success");
                          onClose();
                        }}
                        className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm"
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-neutral-800 bg-neutral-900/80 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
