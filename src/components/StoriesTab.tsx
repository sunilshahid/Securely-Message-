import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Camera, 
  Type, 
  Video,
  Lock,
  X, 
  Trash2, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Sparkles,
  Send,
  MoreVertical,
  Check,
  Volume2,
  VolumeX,
  ChevronUp,
  UserCheck
} from "lucide-react";
import { Story, Conversation } from "../types";
import { toast } from "./Toast";
import { DecryptedAvatar } from "./DecryptedAvatar";

interface StoriesTabProps {
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  conversations: Conversation[];
  socket?: any;
}

const GRADIENTS = [
  { name: "Purple", class: "from-indigo-600 to-purple-800" },
  { name: "Emerald", class: "from-emerald-600 to-teal-800" },
  { name: "Rose", class: "from-rose-600 to-pink-700" },
  { name: "Amber", class: "from-amber-600 to-orange-700" },
  { name: "Ocean", class: "from-blue-600 to-cyan-800" },
  { name: "Midnight", class: "from-neutral-900 via-neutral-800 to-black" },
];

export default function StoriesTab({
  currentUserId,
  currentUserName,
  currentUserAvatar,
  conversations,
  socket,
}: StoriesTabProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMode, setCreateMode] = useState<"text" | "image" | "video">("text");

  // Privacy Lock settings
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [privacyType, setPrivacyType] = useState<"contacts" | "selected">(() => {
    return (localStorage.getItem("story_privacy_type") as any) || "contacts";
  });
  const [allowedContactIds, setAllowedContactIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("story_privacy_allowed") || "[]");
    } catch {
      return [];
    }
  });

  // Viewer state
  const [viewingUserStories, setViewingUserStories] = useState<{
    userId: string;
    userName: string;
    userAvatar?: string;
    stories: Story[];
  } | null>(null);
  const [viewerStoryIndex, setViewerStoryIndex] = useState(0);

  // Fetch all active stories from backend
  const fetchStories = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/stories");
      if (res.ok) {
        const data = await res.json();
        setStories(data.stories || []);
      }
    } catch {
      // Quiet fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleNewStory = ({ story }: { story: Story }) => {
      setStories((prev) => {
        const filtered = prev.filter((s) => s.id !== story.id);
        return [story, ...filtered];
      });
    };

    const handleStoryDeleted = ({ storyId }: { storyId: string }) => {
      setStories((prev) => prev.filter((s) => s.id !== storyId));
      if (viewingUserStories) {
        const updated = viewingUserStories.stories.filter((s) => s.id !== storyId);
        if (updated.length === 0) {
          setViewingUserStories(null);
        } else {
          setViewingUserStories({ ...viewingUserStories, stories: updated });
          setViewerStoryIndex((idx) => Math.min(idx, updated.length - 1));
        }
      }
    };

    const handleStoryViewed = ({
      storyId,
      viewer,
    }: {
      storyId: string;
      viewer: { userId: string; displayName: string; viewedAt: string };
    }) => {
      setStories((prev) =>
        prev.map((s) => {
          if (s.id !== storyId) return s;
          const viewers = s.viewers || [];
          if (viewers.some((v) => v.userId === viewer.userId)) return s;
          return { ...s, viewers: [...viewers, viewer] };
        })
      );
    };

    socket.on("new_story", handleNewStory);
    socket.on("story_deleted", handleStoryDeleted);
    socket.on("story_viewed", handleStoryViewed);

    return () => {
      socket.off("new_story", handleNewStory);
      socket.off("story_deleted", handleStoryDeleted);
      socket.off("story_viewed", handleStoryViewed);
    };
  }, [socket, viewingUserStories]);

  // Handle local viewing immediately so story moves from Recent to Viewed
  const handleLocalStoryViewed = (storyId: string) => {
    setStories((prev) =>
      prev.map((s) => {
        if (s.id !== storyId) return s;
        const viewers = s.viewers || [];
        if (viewers.some((v) => v.userId === currentUserId)) return s;
        return {
          ...s,
          viewers: [
            ...viewers,
            {
              userId: currentUserId,
              displayName: currentUserName || "You",
              viewedAt: new Date().toISOString(),
            },
          ],
        };
      })
    );
  };

  // Group stories by userId and filter by privacy
  const myStories = stories.filter((s) => s.userId === currentUserId);
  const otherStories = stories.filter((s) => {
    if (s.userId === currentUserId) return false;
    // Privacy filter: if restricted to selected contacts
    if (s.privacyType === "selected" && s.allowedUserIds && !s.allowedUserIds.includes(currentUserId)) {
      return false;
    }
    return true;
  });

  // Group other users' stories
  const userStoryGroups: Record<
    string,
    { userId: string; userName: string; userAvatar?: string; stories: Story[] }
  > = {};

  otherStories.forEach((s) => {
    if (!userStoryGroups[s.userId]) {
      const conv = conversations.find((c) => c.id === s.userId);
      userStoryGroups[s.userId] = {
        userId: s.userId,
        userName: conv?.displayName || s.userName,
        userAvatar: conv?.photoUrl || s.userAvatar,
        stories: [],
      };
    }
    userStoryGroups[s.userId].stories.push(s);
  });

  // Split into unviewed vs viewed
  const recentUpdates: Array<{
    userId: string;
    userName: string;
    userAvatar?: string;
    stories: Story[];
  }> = [];

  const viewedUpdates: Array<{
    userId: string;
    userName: string;
    userAvatar?: string;
    stories: Story[];
  }> = [];

  Object.values(userStoryGroups).forEach((group) => {
    group.stories.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const hasUnviewed = group.stories.some(
      (s) => !s.viewers?.some((v) => v.userId === currentUserId)
    );
    if (hasUnviewed) {
      recentUpdates.push(group);
    } else {
      viewedUpdates.push(group);
    }
  });

  const handleOpenViewer = (group: {
    userId: string;
    userName: string;
    userAvatar?: string;
    stories: Story[];
  }) => {
    let startIdx = 0;
    if (group.userId !== currentUserId) {
      const unviewedIdx = group.stories.findIndex(
        (s) => !s.viewers?.some((v) => v.userId === currentUserId)
      );
      if (unviewedIdx >= 0) startIdx = unviewedIdx;
    }
    setViewingUserStories(group);
    setViewerStoryIndex(startIdx);
  };

  const formatTimeAgo = (dateInput: string | Date) => {
    const d = new Date(dateInput);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-neutral-100 overflow-y-auto select-none">
      {/* Header */}
      <div className="px-5 py-4 border-b border-neutral-800 bg-neutral-900/60 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Stories
            <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              24h Status
            </span>
          </h2>
          <p className="text-xs text-neutral-400">Share ephemeral updates with your contacts</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Privacy Lock */}
          <button
            onClick={() => setShowPrivacyModal(true)}
            title="Status Privacy (Contacts & Selected)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-medium transition-colors"
          >
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Privacy</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* ================= MY STATUS SECTION ================= */}
        <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div
              onClick={() => {
                if (myStories.length > 0) {
                  handleOpenViewer({
                    userId: currentUserId,
                    userName: "My Status",
                    userAvatar: currentUserAvatar,
                    stories: myStories,
                  });
                } else {
                  setCreateMode("text");
                  setShowCreateModal(true);
                }
              }}
              className="flex items-center gap-3.5 cursor-pointer flex-1 min-w-0 group"
            >
              <div className="relative shrink-0">
                <div
                  className={`w-13 h-13 rounded-full p-[2.5px] transition-transform group-hover:scale-105 ${
                    myStories.length > 0
                      ? "bg-gradient-to-tr from-indigo-500 via-purple-500 to-emerald-400"
                      : "bg-neutral-800"
                  }`}
                >
                  <div className="w-full h-full rounded-full bg-neutral-900 overflow-hidden flex items-center justify-center font-bold text-indigo-300">
                    {currentUserAvatar ? (
                      <DecryptedAvatar
                        photoUrl={currentUserAvatar}
                        fallback={currentUserName.substring(0, 2).toUpperCase()}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      currentUserName.substring(0, 2).toUpperCase()
                    )}
                  </div>
                </div>

                {myStories.length === 0 ? (
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-indigo-600 border-2 border-neutral-950 flex items-center justify-center text-white">
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : (
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-emerald-500 border-2 border-neutral-950 flex items-center justify-center text-white text-[10px] font-bold">
                    {myStories.length}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">
                  My Status
                </h3>
                <p className="text-xs text-neutral-400 truncate mt-0.5">
                  {myStories.length > 0
                    ? `${myStories.length} active update${
                        myStories.length !== 1 ? "s" : ""
                      } · ${formatTimeAgo(myStories[myStories.length - 1].createdAt)}`
                    : "Tap to add status update"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => {
                  setCreateMode("text");
                  setShowCreateModal(true);
                }}
                className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                title="Add Text Status"
              >
                <Type className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setCreateMode("image");
                  setShowCreateModal(true);
                }}
                className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                title="Add Photo Status"
              >
                <Camera className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setCreateMode("video");
                  setShowCreateModal(true);
                }}
                className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                title="Add Video Status"
              >
                <Video className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ================= RECENT UPDATES ================= */}
        {recentUpdates.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-1">
              Recent updates
            </h4>
            <div className="space-y-2">
              {recentUpdates.map((group) => {
                const latestStory = group.stories[group.stories.length - 1];
                return (
                  <div
                    key={group.userId}
                    onClick={() => handleOpenViewer(group)}
                    className="flex items-center gap-3.5 p-3 rounded-2xl bg-neutral-900/30 hover:bg-neutral-900/70 border border-neutral-800/60 cursor-pointer transition-colors group"
                  >
                    <div className="relative shrink-0">
                      <div className="w-13 h-13 rounded-full p-[2.5px] bg-gradient-to-tr from-emerald-500 via-indigo-500 to-purple-500 group-hover:scale-105 transition-transform">
                        <div className="w-full h-full rounded-full bg-neutral-900 overflow-hidden flex items-center justify-center font-bold text-neutral-300">
                          {group.userAvatar ? (
                            <DecryptedAvatar
                              photoUrl={group.userAvatar}
                              fallback={group.userName.substring(0, 2).toUpperCase()}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            group.userName.substring(0, 2).toUpperCase()
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-neutral-200 group-hover:text-indigo-300 transition-colors truncate">
                          {group.userName}
                        </h4>
                        <span className="text-[11px] text-neutral-500 font-mono shrink-0">
                          {formatTimeAgo(latestStory.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 truncate mt-0.5">
                        {latestStory.type === "image"
                          ? latestStory.caption || "📷 Photo story"
                          : latestStory.type === "video"
                          ? latestStory.caption || "🎥 Video story"
                          : latestStory.content}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= VIEWED UPDATES ================= */}
        {viewedUpdates.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider px-1">
              Viewed updates
            </h4>
            <div className="space-y-2 opacity-80">
              {viewedUpdates.map((group) => {
                const latestStory = group.stories[group.stories.length - 1];
                return (
                  <div
                    key={group.userId}
                    onClick={() => handleOpenViewer(group)}
                    className="flex items-center gap-3.5 p-3 rounded-2xl bg-neutral-900/20 hover:bg-neutral-900/50 border border-neutral-800/40 cursor-pointer transition-colors group"
                  >
                    <div className="relative shrink-0">
                      <div className="w-13 h-13 rounded-full p-[2px] bg-neutral-700">
                        <div className="w-full h-full rounded-full bg-neutral-900 overflow-hidden flex items-center justify-center font-bold text-neutral-400">
                          {group.userAvatar ? (
                            <DecryptedAvatar
                              photoUrl={group.userAvatar}
                              fallback={group.userName.substring(0, 2).toUpperCase()}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            group.userName.substring(0, 2).toUpperCase()
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-neutral-300 truncate">
                          {group.userName}
                        </h4>
                        <span className="text-[11px] text-neutral-500 font-mono shrink-0">
                          {formatTimeAgo(latestStory.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 truncate mt-0.5">
                        {latestStory.type === "image"
                          ? latestStory.caption || "📷 Photo story"
                          : latestStory.type === "video"
                          ? latestStory.caption || "🎥 Video story"
                          : latestStory.content}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {recentUpdates.length === 0 && viewedUpdates.length === 0 && (
          <div className="text-center py-12 px-4 space-y-3">
            <div className="w-14 h-14 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-500 shadow-inner">
              <Clock className="w-6 h-6 opacity-40" />
            </div>
            <h4 className="text-sm font-semibold text-neutral-300">No Recent Contact Stories</h4>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto">
              Status updates posted by your contacts will disappear after 24 hours and will appear here.
            </p>
          </div>
        )}
      </div>

      {/* ================= STATUS PRIVACY MODAL ================= */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">Status Privacy</h3>
              </div>
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              Choose who can see your ephemeral status updates. Changes apply to future status updates.
            </p>

            <div className="space-y-3">
              {/* Option 1: My Contacts */}
              <label 
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-colors ${
                  privacyType === "contacts"
                    ? "bg-indigo-600/10 border-indigo-500/50"
                    : "bg-neutral-800/40 border-neutral-800 hover:bg-neutral-800/70"
                }`}
                onClick={() => setPrivacyType("contacts")}
              >
                <input
                  type="radio"
                  name="privacy"
                  checked={privacyType === "contacts"}
                  onChange={() => setPrivacyType("contacts")}
                  className="mt-1 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <h4 className="text-sm font-semibold text-white">My Contacts</h4>
                  <p className="text-xs text-neutral-400 mt-0.5">All contacts you chat with will see your updates</p>
                </div>
              </label>

              {/* Option 2: Only Share With... */}
              <label 
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-colors ${
                  privacyType === "selected"
                    ? "bg-indigo-600/10 border-indigo-500/50"
                    : "bg-neutral-800/40 border-neutral-800 hover:bg-neutral-800/70"
                }`}
                onClick={() => setPrivacyType("selected")}
              >
                <input
                  type="radio"
                  name="privacy"
                  checked={privacyType === "selected"}
                  onChange={() => setPrivacyType("selected")}
                  className="mt-1 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-white">Only Share With...</h4>
                  <p className="text-xs text-neutral-400 mt-0.5">Only specific contacts chosen below will see your updates</p>
                </div>
              </label>
            </div>

            {/* Selected contacts list */}
            {privacyType === "selected" && (
              <div className="space-y-2 pt-2 border-t border-neutral-800">
                <h5 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Select Contacts ({allowedContactIds.length} selected)
                </h5>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                  {conversations
                    .filter((c) => !c.isGroup && c.id !== currentUserId)
                    .map((conv) => {
                      const isSelected = allowedContactIds.includes(conv.id);
                      return (
                        <div
                          key={conv.id}
                          onClick={() => {
                            setAllowedContactIds((prev) =>
                              prev.includes(conv.id)
                                ? prev.filter((id) => id !== conv.id)
                                : [...prev, conv.id]
                            );
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-indigo-500/15 border-indigo-500/40 text-white"
                              : "bg-neutral-800/30 border-neutral-800/60 text-neutral-300 hover:bg-neutral-800"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <DecryptedAvatar
                              photoUrl={conv.photoUrl}
                              fallback={(conv.displayName || "U").substring(0, 2).toUpperCase()}
                              className="w-7 h-7 rounded-full text-[10px]"
                            />
                            <span className="text-xs font-medium truncate">{conv.displayName || conv.id.slice(0, 8)}</span>
                          </div>
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                            isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-neutral-600"
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  localStorage.setItem("story_privacy_type", privacyType);
                  localStorage.setItem("story_privacy_allowed", JSON.stringify(allowedContactIds));
                  setShowPrivacyModal(false);
                  toast("Status privacy updated", "success");
                }}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-md shadow-indigo-600/30"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CREATE STORY MODAL ================= */}
      <CreateStoryModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        initialMode={createMode}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserAvatar={currentUserAvatar}
        privacyType={privacyType}
        allowedUserIds={allowedContactIds}
        onStoryCreated={(newStory) => {
          setStories((prev) => {
            const exists = prev.some((s) => s.id === newStory.id);
            if (exists) return prev;
            return [newStory, ...prev];
          });
          setShowCreateModal(false);
          toast("Status updated!", "success");
        }}
      />

      {/* ================= FULLSCREEN STORY VIEWER ================= */}
      {viewingUserStories && (
        <StoryViewerModal
          isOpen={!!viewingUserStories}
          onClose={() => setViewingUserStories(null)}
          userGroup={viewingUserStories}
          initialIndex={viewerStoryIndex}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          onStoryViewed={handleLocalStoryViewed}
          onDeleteStory={async (storyId) => {
            try {
              const res = await fetch(`/api/v1/stories/${storyId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: currentUserId }),
              });
              if (res.ok) {
                setStories((prev) => prev.filter((s) => s.id !== storyId));
                toast("Story deleted", "info");
              }
            } catch {
              toast("Failed to delete story", "error");
            }
          }}
        />
      )}
    </div>
  );
}

// ================= CREATE STORY MODAL =================
function CreateStoryModal({
  isOpen,
  onClose,
  initialMode,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  privacyType,
  allowedUserIds,
  onStoryCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialMode: "text" | "image" | "video";
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  privacyType: "contacts" | "selected";
  allowedUserIds: string[];
  onStoryCreated: (story: Story) => void;
}) {
  const [mode, setMode] = useState<"text" | "image" | "video">(initialMode);
  const [textContent, setTextContent] = useState("");
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[0].class);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMode(initialMode);
    setTextContent("");
    setImagePreview(null);
    setVideoPreview(null);
    setSelectedFile(null);
    setCaption("");
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast("Image must be under 20MB", "error");
      return;
    }
    setSelectedFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast("Video must be under 50MB", "error");
      return;
    }
    setSelectedFile(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const handlePost = async () => {
    if (mode === "text" && !textContent.trim()) {
      toast("Please enter your status text", "error");
      return;
    }
    if (mode !== "text" && !selectedFile) {
      toast(`Please select a ${mode === "image" ? "photo" : "video"}`, "error");
      return;
    }

    setSubmitting(true);
    try {
      let finalContent = "";
      if (mode === "text") {
        finalContent = textContent.trim();
      } else if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const uploadRes = await fetch("/api/v1/attachments", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) {
          throw new Error("Failed to upload status media");
        }
        const { attachmentId } = await uploadRes.json();
        finalContent = `/api/v1/attachments/${attachmentId}`;
      }

      const res = await fetch("/api/v1/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          userName: currentUserName,
          userAvatar: currentUserAvatar || "",
          type: mode,
          content: finalContent,
          caption: mode !== "text" ? caption.trim() : "",
          bgGradient: selectedGradient,
          privacyType,
          allowedUserIds,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onStoryCreated(data.story);
      } else {
        const errData = await res.json().catch(() => ({}));
        toast(errData.error || "Failed to post status", "error");
      }
    } catch (err: any) {
      toast(err.message || "Error posting status", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-md bg-neutral-950 sm:border border-neutral-800 sm:rounded-3xl rounded-none shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-900/80 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode("text")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                mode === "text"
                  ? "bg-indigo-600 text-white"
                  : "bg-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              Text
            </button>
            <button
              onClick={() => setMode("image")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                mode === "image"
                  ? "bg-indigo-600 text-white"
                  : "bg-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              Photo
            </button>
            <button
              onClick={() => setMode("video")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                mode === "video"
                  ? "bg-indigo-600 text-white"
                  : "bg-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              Video
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Story Canvas */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {mode === "text" ? (
            <div
              className={`flex-1 flex items-center justify-center p-8 bg-gradient-to-tr ${selectedGradient} transition-all duration-300`}
            >
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Type a status update..."
                maxLength={400}
                autoFocus
                className="w-full bg-transparent text-white text-center text-2xl font-bold placeholder-white/50 border-none outline-none resize-none leading-relaxed drop-shadow-md"
                rows={5}
              />
            </div>
          ) : mode === "image" ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-neutral-900 p-4 relative overflow-hidden">
              {imagePreview ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-full max-w-full object-contain rounded-xl"
                  />
                  <button
                    onClick={() => setImagePreview(null)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => imageInputRef.current?.click()}
                  className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-700 hover:border-indigo-500 rounded-2xl w-full h-full max-h-72 cursor-pointer transition-colors text-neutral-400 hover:text-neutral-200"
                >
                  <Camera className="w-10 h-10 mb-2 opacity-50" />
                  <p className="text-sm font-semibold">Choose photo</p>
                  <p className="text-xs text-neutral-500 mt-1">Tap to browse images</p>
                </div>
              )}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-neutral-900 p-4 relative overflow-hidden">
              {videoPreview ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <video
                    src={videoPreview}
                    controls
                    className="max-h-full max-w-full rounded-xl"
                  />
                  <button
                    onClick={() => setVideoPreview(null)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => videoInputRef.current?.click()}
                  className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-700 hover:border-indigo-500 rounded-2xl w-full h-full max-h-72 cursor-pointer transition-colors text-neutral-400 hover:text-neutral-200"
                >
                  <Video className="w-10 h-10 mb-2 opacity-50" />
                  <p className="text-sm font-semibold">Choose video</p>
                  <p className="text-xs text-neutral-500 mt-1">Tap to browse video clips (up to 50MB)</p>
                </div>
              )}
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Bottom Palette / Caption Bar */}
          <div className="p-4 bg-neutral-900/90 border-t border-neutral-800 shrink-0 space-y-3">
            {mode === "text" ? (
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">Color gradient</span>
                <div className="flex items-center gap-1.5">
                  {GRADIENTS.map((g) => (
                    <button
                      key={g.name}
                      onClick={() => setSelectedGradient(g.class)}
                      className={`w-6 h-6 rounded-full bg-gradient-to-tr ${g.class} transition-transform ${
                        selectedGradient === g.class
                          ? "ring-2 ring-white scale-110"
                          : "hover:scale-105"
                      }`}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption..."
                maxLength={120}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
              />
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-neutral-500 font-mono">
                {privacyType === "selected" ? "🔒 Selected contacts" : "👥 Contacts only"} · 24h
              </span>
              <button
                disabled={submitting}
                onClick={handlePost}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/30"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? "Posting..." : "Share Story"}</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ================= FULLSCREEN STORY VIEWER =================
function StoryViewerModal({
  isOpen,
  onClose,
  userGroup,
  initialIndex,
  currentUserId,
  currentUserName,
  onStoryViewed,
  onDeleteStory,
}: {
  isOpen: boolean;
  onClose: () => void;
  userGroup: {
    userId: string;
    userName: string;
    userAvatar?: string;
    stories: Story[];
  };
  initialIndex: number;
  currentUserId: string;
  currentUserName?: string;
  onStoryViewed: (storyId: string) => void;
  onDeleteStory: (storyId: string) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showViewersDrawer, setShowViewersDrawer] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const stories = userGroup.stories;
  const currentStory = stories[currentIndex];
  const isMine = userGroup.userId === currentUserId;
  const durationMs = 5000; // 5s for photo/text; video uses video duration

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setProgress(0);
    setShowViewersDrawer(false);
  }, [initialIndex, userGroup]);

  // Mark current story as viewed and notify backend & local state
  useEffect(() => {
    if (!currentStory) return;
    if (userGroup.userId !== currentUserId) {
      onStoryViewed(currentStory.id);
      fetch(`/api/v1/stories/${currentStory.id}/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewerId: currentUserId, displayName: currentUserName }),
      }).catch(console.error);
    }
  }, [currentStory?.id, currentUserId, userGroup.userId]);

  // Pause / resume video element
  useEffect(() => {
    if (currentStory?.type === "video" && videoRef.current) {
      if (isPaused || showViewersDrawer) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isPaused, showViewersDrawer, currentStory]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((idx) => idx + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((idx) => idx - 1);
      setProgress(0);
    }
  };

  // Progress timer for photo and text stories
  useEffect(() => {
    if (isPaused || showViewersDrawer || currentStory?.type === "video") return;

    const intervalTime = 50;
    const step = (intervalTime / durationMs) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex((idx) => idx + 1);
            return 0;
          } else {
            clearInterval(timer);
            onClose();
            return 100;
          }
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [currentIndex, isPaused, showViewersDrawer, currentStory?.type, stories.length, onClose]);

  if (!isOpen || !currentStory) return null;

  const formatViewerTime = (timeStr: string) => {
    const d = new Date(timeStr);
    const now = new Date();
    const isSameDay = d.toDateString() === now.toDateString();
    const timeFormatted = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return isSameDay ? `Today at ${timeFormatted}` : `${d.toLocaleDateString()} at ${timeFormatted}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none overflow-hidden">
      <div
        className="relative w-full h-full max-w-md flex flex-col justify-between bg-neutral-950 overflow-hidden"
        onMouseDown={() => !showViewersDrawer && setIsPaused(true)}
        onMouseUp={() => !showViewersDrawer && setIsPaused(false)}
        onTouchStart={() => !showViewersDrawer && setIsPaused(true)}
        onTouchEnd={() => !showViewersDrawer && setIsPaused(false)}
      >
        {/* ================= TOP SEGMENTED PROGRESS BARS ================= */}
        <div className="absolute top-0 inset-x-0 z-30 p-3 pt-4 bg-gradient-to-b from-black/80 to-transparent space-y-2">
          <div className="flex items-center gap-1.5 w-full">
            {stories.map((st, idx) => {
              const fill =
                idx < currentIndex ? 100 : idx === currentIndex ? progress : 0;
              return (
                <div
                  key={st.id}
                  className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
                >
                  <div
                    className="h-full bg-white transition-all duration-75"
                    style={{ width: `${fill}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* User Profile Bar */}
          <div className="flex items-center justify-between text-white pt-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-neutral-800 overflow-hidden flex items-center justify-center font-bold text-xs text-white">
                {userGroup.userAvatar ? (
                  <DecryptedAvatar
                    photoUrl={userGroup.userAvatar}
                    fallback={userGroup.userName.substring(0, 2).toUpperCase()}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  userGroup.userName.substring(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <h4 className="text-xs font-bold leading-tight drop-shadow">
                  {userGroup.userName}
                </h4>
                <p className="text-[10px] text-white/70 font-mono">
                  {new Date(currentStory.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentStory.type === "video" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMuted(!isMuted);
                  }}
                  className="p-1.5 rounded-full bg-black/40 hover:bg-neutral-800 text-white transition-colors"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              )}
              {isMine && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Delete this story?")) {
                      onDeleteStory(currentStory.id);
                    }
                  }}
                  className="p-1.5 rounded-full bg-black/40 hover:bg-rose-600/80 text-white transition-colors"
                  title="Delete Story"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="p-1.5 rounded-full bg-black/40 hover:bg-neutral-800 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* ================= STORY BODY ================= */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden">
          {currentStory.type === "image" ? (
            <div className="w-full h-full flex items-center justify-center bg-black">
              <img
                src={currentStory.content}
                alt="Story"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : currentStory.type === "video" ? (
            <div className="w-full h-full flex items-center justify-center bg-black">
              <video
                ref={videoRef}
                src={currentStory.content}
                autoPlay
                playsInline
                muted={isMuted}
                onEnded={handleNext}
                onTimeUpdate={() => {
                  if (videoRef.current && videoRef.current.duration) {
                    setProgress(
                      (videoRef.current.currentTime / videoRef.current.duration) * 100
                    );
                  }
                }}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            <div
              className={`w-full h-full flex items-center justify-center p-8 bg-gradient-to-tr ${
                currentStory.bgGradient || "from-indigo-600 to-purple-800"
              }`}
            >
              <p className="text-white text-center text-2xl font-bold whitespace-pre-wrap leading-relaxed drop-shadow-md max-w-xs">
                {currentStory.content}
              </p>
            </div>
          )}

          {/* Left / Right Tap zones */}
          <div
            onClick={handlePrev}
            className="absolute left-0 top-0 bottom-0 w-1/3 z-10 cursor-pointer"
          />
          <div
            onClick={handleNext}
            className="absolute right-0 top-0 bottom-0 w-2/3 z-10 cursor-pointer"
          />
        </div>

        {/* ================= BOTTOM CAPTION / VIEWERS BAR ================= */}
        <div className="absolute bottom-0 inset-x-0 z-20 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
          {currentStory.caption && (
            <p className="text-sm text-white font-medium text-center drop-shadow pb-2">
              {currentStory.caption}
            </p>
          )}

          {isMine && (
            <div className="flex flex-col items-center justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPaused(true);
                  setShowViewersDrawer(true);
                }}
                className="flex items-center gap-1.5 text-xs text-white/90 font-mono py-1.5 px-4 bg-black/50 hover:bg-black/75 rounded-full border border-white/10 transition-colors cursor-pointer select-none"
              >
                <ChevronUp className="w-3.5 h-3.5 animate-bounce" />
                <Eye className="w-4 h-4" />
                <span>
                  {currentStory.viewers?.length || 0} view
                  {currentStory.viewers?.length !== 1 ? "s" : ""}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* ================= WHO HAVE SEEN (WHATSAPP-STYLE BOTTOM SHEET) ================= */}
        <AnimatePresence>
          {showViewersDrawer && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="absolute inset-x-0 bottom-0 z-40 bg-neutral-900 border-t border-neutral-800 rounded-t-3xl p-5 shadow-2xl max-h-[75vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag handle */}
              <div className="w-10 h-1 bg-neutral-700 rounded-full mx-auto mb-4" />

              <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-white text-base">
                    Viewed by {currentStory.viewers?.length || 0}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowViewersDrawer(false);
                    setIsPaused(false);
                  }}
                  className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Viewers list */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
                {currentStory.viewers && currentStory.viewers.length > 0 ? (
                  currentStory.viewers.map((viewer, idx) => (
                    <div
                      key={viewer.userId + idx}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-neutral-800/40 border border-neutral-800/80"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <DecryptedAvatar
                          fallback={(viewer.displayName || "U").substring(0, 2).toUpperCase()}
                          className="w-10 h-10 rounded-full text-xs font-bold"
                        />
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-white truncate">
                            {viewer.displayName || "Contact"}
                          </h4>
                          <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                            {formatViewerTime(viewer.viewedAt)}
                          </p>
                        </div>
                      </div>
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 space-y-2">
                    <Eye className="w-8 h-8 text-neutral-600 mx-auto" />
                    <p className="text-xs text-neutral-400 font-medium">No views yet</p>
                    <p className="text-[11px] text-neutral-500 max-w-xs mx-auto">
                      Contacts who view your status update within 24 hours will appear here.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
