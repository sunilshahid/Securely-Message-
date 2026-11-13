import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Socket } from "socket.io-client";
import { Conversation, GroupMember } from "../types";
import { toast } from "./Toast";

interface GroupAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation;
  currentUserId: string;
  currentUserName: string;
  onUpdateConversation: (convId: string, updates: Partial<Conversation>) => void;
  onLeaveGroup: (groupId: string) => void;
  socket?: Socket | null;
}

export default function GroupAdminModal({
  isOpen,
  onClose,
  conversation,
  currentUserId,
  currentUserName,
  onUpdateConversation,
  onLeaveGroup,
  socket,
}: GroupAdminModalProps) {
  const [activeTab, setActiveTab] = useState<"info" | "settings" | "members" | "requests">("info");
  const [isEditingName, setIsEditingName] = useState(false);
  const [groupName, setGroupName] = useState(conversation.displayName || "");
  const [groupDesc, setGroupDesc] = useState(conversation.groupDescription || "");
  const [inviteContactInput, setInviteContactInput] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const cleanGroupId = conversation.id.replace(/^group_/, "");
  const members = conversation.groupMembers || [];
  const currentMember = members.find((m) => m.userId === currentUserId);
  const isAdmin = currentMember?.role === "admin" || conversation.groupMembers?.length === 1;
  const pendingRequests = conversation.pendingRequests || [];

  const inviteLink =
    conversation.groupInviteLink || `${window.location.origin}/?group=${cleanGroupId}`;

  useEffect(() => {
    setGroupName(conversation.displayName || "");
    setGroupDesc(conversation.groupDescription || "");
  }, [conversation]);

  useEffect(() => {
    if (isOpen && cleanGroupId) {
      fetch(`/api/v1/groups/${cleanGroupId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.group) {
            onUpdateConversation(conversation.id, {
              displayName: data.group.name,
              groupDescription: data.group.description,
              groupMembers: data.group.members,
              requireAdminApproval: data.group.requireAdminApproval,
              onlyAdminsCanPost: data.group.onlyAdminsCanPost,
              pendingRequests: data.group.pendingRequests,
            });
          }
        })
        .catch(console.error);
    }
  }, [isOpen, cleanGroupId]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    toast("Invite link copied to clipboard!", "success");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSaveInfo = async () => {
    if (!groupName.trim()) return;
    try {
      const res = await fetch(`/api/v1/groups/${cleanGroupId}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: currentUserId,
          name: groupName.trim(),
          description: groupDesc.trim(),
        }),
      });
      if (res.ok) {
        onUpdateConversation(conversation.id, {
          displayName: groupName.trim(),
          groupDescription: groupDesc.trim(),
        });
        setIsEditingName(false);
        toast("Group details updated", "success");
      } else {
        toast("Failed to update group details", "error");
      }
    } catch {
      toast("Network error updating group", "error");
    }
  };

  const handleToggleSetting = async (
    setting: "requireAdminApproval" | "onlyAdminsCanPost",
    val: boolean
  ) => {
    try {
      const payload: any = { adminId: currentUserId };
      payload[setting] = val;

      const res = await fetch(`/api/v1/groups/${cleanGroupId}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        onUpdateConversation(conversation.id, { [setting]: val });
        toast("Group setting updated", "success");
      } else {
        toast("Failed to update setting", "error");
      }
    } catch {
      toast("Network error updating setting", "error");
    }
  };

  const handleToggleMemberRole = async (targetUserId: string, currentRole: "admin" | "member") => {
    const newRole = currentRole === "admin" ? "member" : "admin";
    try {
      const res = await fetch(`/api/v1/groups/${cleanGroupId}/member_role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: currentUserId,
          targetUserId,
          role: newRole,
        }),
      });
      if (res.ok) {
        const updatedMembers = members.map((m) =>
          m.userId === targetUserId ? { ...m, role: newRole as "admin" | "member" } : m
        );
        onUpdateConversation(conversation.id, { groupMembers: updatedMembers });
        toast(newRole === "admin" ? "Promoted to Group Admin" : "Dismissed as admin", "success");
      } else {
        toast("Failed to update member role", "error");
      }
    } catch {
      toast("Error changing role", "error");
    }
  };

  const handleRemoveMember = async (targetUserId: string, targetName: string) => {
    if (!confirm(`Are you sure you want to remove ${targetName} from this group?`)) return;
    try {
      const res = await fetch(`/api/v1/groups/${cleanGroupId}/remove_member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: currentUserId,
          targetUserId,
        }),
      });
      if (res.ok) {
        const updatedMembers = members.filter((m) => m.userId !== targetUserId);
        onUpdateConversation(conversation.id, { groupMembers: updatedMembers });
        toast(`Removed ${targetName} from group`, "info");
      } else {
        toast("Failed to remove member", "error");
      }
    } catch {
      toast("Network error removing member", "error");
    }
  };

  const handleApproveRequest = async (targetUserId: string) => {
    setLoadingAction(`approve_${targetUserId}`);
    try {
      const res = await fetch(`/api/v1/groups/${cleanGroupId}/approve_request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: currentUserId,
          targetUserId,
        }),
      });
      if (res.ok) {
        const targetReq = pendingRequests.find((r) => r.userId === targetUserId);
        const updatedRequests = pendingRequests.filter((r) => r.userId !== targetUserId);
        const newMember: GroupMember = {
          userId: targetUserId,
          displayName: targetReq?.displayName || "Member",
          role: "member",
          joinedAt: new Date().toISOString(),
        };
        onUpdateConversation(conversation.id, {
          pendingRequests: updatedRequests,
          groupMembers: [...members, newMember],
        });
        toast("Participant approved and added!", "success");
      } else {
        toast("Failed to approve request", "error");
      }
    } catch {
      toast("Error approving request", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRejectRequest = async (targetUserId: string) => {
    setLoadingAction(`reject_${targetUserId}`);
    try {
      const res = await fetch(`/api/v1/groups/${cleanGroupId}/reject_request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: currentUserId,
          targetUserId,
        }),
      });
      if (res.ok) {
        const updatedRequests = pendingRequests.filter((r) => r.userId !== targetUserId);
        onUpdateConversation(conversation.id, { pendingRequests: updatedRequests });
        toast("Join request rejected", "info");
      } else {
        toast("Failed to reject request", "error");
      }
    } catch {
      toast("Error rejecting request", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleInviteDirect = async () => {
    const target = inviteContactInput.trim();
    if (!target) return;
    setIsInviting(true);
    try {
      const res = await fetch(`/api/v1/groups/${cleanGroupId}/invite_member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromUserId: currentUserId,
          fromUserName: currentUserName || "Admin",
          toUserId: target,
        }),
      });
      if (res.ok) {
        toast(`Invite request sent to ${target} (silent alert)`, "success");
        setInviteContactInput("");
      } else {
        const data = await res.json();
        toast(data.error || "Failed to send invite", "error");
      }
    } catch {
      toast("Network error sending invite", "error");
    } finally {
      setIsInviting(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm("Are you sure you want to leave this group?")) return;
    try {
      await fetch(`/api/v1/groups/${cleanGroupId}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId }),
      });
      if (socket) {
        socket.emit("leave_group", { groupId: cleanGroupId });
      }
      onLeaveGroup(conversation.id);
      onClose();
      toast("You left the group", "info");
    } catch {
      toast("Failed to leave group", "error");
    }
  };

  const handleDeleteGroup = async () => {
    if (
      !confirm(
        `Are you sure you want to permanently delete "${conversation.displayName || "this group"}"? All members will be removed and this action cannot be undone.`
      )
    ) {
      return;
    }
    setLoadingAction("delete_group");
    try {
      const res = await fetch(`/api/v1/groups/${cleanGroupId}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: currentUserId }),
      });
      if (res.ok) {
        toast("Group deleted successfully", "success");
        onClose();
        onLeaveGroup(conversation.id);
      } else {
        const data = await res.json();
        toast(data.error || "Failed to delete group", "error");
      }
    } catch {
      toast("Error deleting group", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-lg bg-neutral-900 sm:border border-neutral-800 sm:rounded-2xl rounded-none shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600/30 text-indigo-400 font-bold flex items-center justify-center border border-indigo-500/20">
              {conversation.displayName?.substring(0, 2).toUpperCase() || "GP"}
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
                {conversation.displayName || "Group Chat"}
                {isAdmin && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                    Admin
                  </span>
                )}
              </h2>
              <p className="text-xs text-neutral-400">
                {members.length} member{members.length !== 1 ? "s" : ""}
                {pendingRequests.length > 0 && isAdmin && (
                  <span className="ml-2 text-amber-400 font-medium">
                    · {pendingRequests.length} pending request{pendingRequests.length !== 1 ? "s" : ""}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-800 px-4 bg-neutral-900/50">
          <button
            onClick={() => setActiveTab("info")}
            className={`py-3 px-4 text-xs font-medium border-b-2 transition-colors ${
              activeTab === "info"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`py-3 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "members"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Members ({members.length})
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab("settings")}
              className={`py-3 px-4 text-xs font-medium border-b-2 transition-colors ${
                activeTab === "settings"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Group Settings
            </button>
          )}
          {isAdmin && pendingRequests.length > 0 && (
            <button
              onClick={() => setActiveTab("requests")}
              className={`py-3 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === "requests"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Requests
              <span className="px-1.5 py-0.2 text-[10px] bg-amber-500/20 text-amber-300 font-bold rounded-full border border-amber-500/30">
                {pendingRequests.length}
              </span>
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "info" && (
            <div className="space-y-5">
              {/* Name & Description */}
              <div className="bg-neutral-800/40 border border-neutral-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Group Information
                  </span>
                  {isAdmin && !isEditingName && (
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {isEditingName ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-neutral-400 block mb-1">Group Name</label>
                      <input
                        type="text"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-400 block mb-1">Description</label>
                      <textarea
                        value={groupDesc}
                        onChange={(e) => setGroupDesc(e.target.value)}
                        placeholder="Add group description..."
                        rows={2}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setIsEditingName(false)}
                        className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveInfo}
                        className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg shadow-sm"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-neutral-100">{groupName}</h3>
                    <p className="text-sm text-neutral-400">
                      {groupDesc || <span className="italic text-neutral-500">No description provided</span>}
                    </p>
                  </div>
                )}
              </div>

              {/* Invite Link Box */}
              <div className="bg-neutral-800/40 border border-neutral-800 rounded-xl p-4 space-y-3">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                  Invite via Link
                </span>
                <p className="text-xs text-neutral-400">
                  Anyone with this link can {conversation.requireAdminApproval ? "request to join" : "join"} this group.
                </p>
                <div className="flex items-center gap-2 bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-800">
                  <input
                    type="text"
                    readOnly
                    value={inviteLink}
                    className="flex-1 bg-transparent text-xs text-neutral-300 outline-none select-all font-mono truncate"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-medium shrink-0 transition-colors"
                  >
                    {copiedLink ? "Copied!" : "Copy Link"}
                  </button>
                </div>
              </div>

              {/* Direct Invite */}
              {isAdmin && (
                <div className="bg-neutral-800/40 border border-neutral-800 rounded-xl p-4 space-y-3">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                    Invite Participant Directly
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter Securely ID..."
                      value={inviteContactInput}
                      onChange={(e) => setInviteContactInput(e.target.value)}
                      className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      disabled={isInviting || !inviteContactInput.trim()}
                      onClick={handleInviteDirect}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors shrink-0"
                    >
                      {isInviting ? "Sending..." : "Send Invite"}
                    </button>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Sends a silent request to the user without audible alert.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "members" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
                <span>{members.length} Participants</span>
                {isAdmin && (
                  <span className="text-[11px] text-indigo-400">You have admin rights</span>
                )}
              </div>

              <div className="space-y-2">
                {members.map((member) => {
                  const isUserAdmin = member.role === "admin";
                  const isCurrent = member.userId === currentUserId;

                  return (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between p-3 bg-neutral-800/40 border border-neutral-800/80 rounded-xl hover:bg-neutral-800/70 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-neutral-700 flex items-center justify-center font-bold text-sm text-neutral-200 shrink-0">
                          {member.displayName?.substring(0, 2).toUpperCase() || "U"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-neutral-200 truncate">
                              {member.displayName}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded">
                                You
                              </span>
                            )}
                            {isUserAdmin && (
                              <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                Admin
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-neutral-500 font-mono truncate block">
                            {member.userId}
                          </span>
                        </div>
                      </div>

                      {isAdmin && !isCurrent && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleToggleMemberRole(member.userId, member.role)}
                            className="px-2.5 py-1 text-[11px] rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium transition-colors"
                          >
                            {isUserAdmin ? "Dismiss Admin" : "Make Admin"}
                          </button>
                          <button
                            onClick={() => handleRemoveMember(member.userId, member.displayName)}
                            className="px-2.5 py-1 text-[11px] rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-medium transition-colors"
                          >
                            Kick
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "settings" && isAdmin && (
            <div className="space-y-4">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                Admin Controls & Permissions
              </span>

              {/* Only admins can post */}
              <div className="flex items-center justify-between p-4 bg-neutral-800/40 border border-neutral-800 rounded-xl">
                <div className="pr-4">
                  <h4 className="text-sm font-medium text-neutral-200">Only Admins Can Send Messages</h4>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Restrict messaging so only designated group admins can post announcements.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleToggleSetting("onlyAdminsCanPost", !conversation.onlyAdminsCanPost)
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    conversation.onlyAdminsCanPost ? "bg-indigo-600" : "bg-neutral-700"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      conversation.onlyAdminsCanPost ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Approve new participants */}
              <div className="flex items-center justify-between p-4 bg-neutral-800/40 border border-neutral-800 rounded-xl">
                <div className="pr-4">
                  <h4 className="text-sm font-medium text-neutral-200">Approve New Participants</h4>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Require an admin to approve any person who tries to join using the invite link.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleToggleSetting("requireAdminApproval", !conversation.requireAdminApproval)
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    conversation.requireAdminApproval ? "bg-indigo-600" : "bg-neutral-700"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      conversation.requireAdminApproval ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {activeTab === "requests" && isAdmin && (
            <div className="space-y-4">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                Pending Join Requests ({pendingRequests.length})
              </span>

              {pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 text-sm">
                  No pending join requests
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.userId}
                      className="flex items-center justify-between p-3.5 bg-neutral-800/40 border border-neutral-800 rounded-xl"
                    >
                      <div className="min-w-0 pr-3">
                        <span className="text-sm font-medium text-neutral-200 block truncate">
                          {req.displayName}
                        </span>
                        <span className="text-xs text-neutral-500 font-mono block truncate">
                          {req.userId}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          disabled={!!loadingAction}
                          onClick={() => handleRejectRequest(req.userId)}
                          className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          disabled={!!loadingAction}
                          onClick={() => handleApproveRequest(req.userId)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-900/80 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {isAdmin && (
              <button
                disabled={!!loadingAction}
                onClick={handleDeleteGroup}
                className="text-xs font-semibold text-rose-500 hover:text-rose-400 hover:underline transition-colors flex items-center gap-1.5"
              >
                <span>🗑️</span>
                <span>{loadingAction === "delete_group" ? "Deleting..." : "Delete Group"}</span>
              </button>
            )}
            <button
              onClick={handleLeaveGroup}
              className="text-xs font-medium text-neutral-400 hover:text-rose-300 hover:underline transition-colors"
            >
              Exit Group
            </button>
          </div>
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
