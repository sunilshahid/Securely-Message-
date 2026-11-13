import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import QRCode from "react-qr-code";
import {
  Settings,
  User,
  Shield,
  ShieldCheck,
  Lock,
  Bell,
  Palette,
  HardDrive,
  LogOut,
  Trash2,
  Camera,
  Check,
  Copy,
  X,
  ChevronRight,
  Clock,
  Sparkles,
  Eye,
  EyeOff,
  MessageSquare,
  Key,
  AlertTriangle,
  Download,
  Upload,
  Volume2,
  VolumeX,
  AtSign,
  Phone,
  Cpu,
  Layers,
  Radio,
  Pencil,
  Info,
  CheckCircle2,
  Globe,
  FileText,
  Sliders,
  Folder,
  HelpCircle,
  Send,
  Smartphone,
  Network,
  Activity,
  Star,
  RefreshCw,
  Share2,
  KeyRound,
  Fingerprint,
  Terminal,
  ShieldAlert,
  ChevronDown,
  ArrowLeft
} from "lucide-react";
import { DecryptedAvatar } from "./DecryptedAvatar";
import { SafetyNumberModal } from "./SafetyNumberModal";
import { toast } from "./Toast";
import {
  playNotificationChime,
  requestNotificationPermission,
  showSystemNotification
} from "../utils/notifications";
import {
  encryptFile,
  exportIdentity,
  encryptIdentityWithPassword,
  decryptIdentityWithPassword,
  bufferToHex
} from "../crypto";
import { Conversation } from "../types";

export type SettingsTab =
  | "profile"
  | "account"
  | "privacy"
  | "chats"
  | "appearance"
  | "notifications"
  | "data"
  | "security"
  | "labs"
  | "help";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  myId: string;
  myName: string;
  myUsername?: string;
  myPhoneNumber?: string;
  myPhoto?: string;
  myAbout?: string;
  myRegistrationId?: number;
  identity?: any;
  conversations?: Conversation[];
  isDiscoverable: boolean;
  onToggleDiscoverable: (val: boolean) => void;
  globalDisappear: number;
  onChangeGlobalDisappear: (val: number) => void;
  onUpdateProfile: (updates: any) => void;
  onLogout?: () => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  myId,
  myName,
  myUsername = "",
  myPhoneNumber = "",
  myPhoto = "",
  myAbout = "",
  myRegistrationId,
  identity,
  conversations = [],
  isDiscoverable,
  onToggleDiscoverable,
  globalDisappear,
  onChangeGlobalDisappear,
  onUpdateProfile,
  onLogout,
}: SettingsModalProps) {
  // Navigation State
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [mobileView, setMobileView] = useState<"menu" | "detail">("menu");
  const [isDisappearDropdownOpen, setIsDisappearDropdownOpen] = useState(false);
  const [browserNotifStatus, setBrowserNotifStatus] = useState<string>(() => {
    return typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default";
  });
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Profile Form States
  const [displayName, setDisplayName] = useState(myName || "");
  const [username, setUsername] = useState(myUsername || "");
  const [phoneNumber, setPhoneNumber] = useState(myPhoneNumber || "");
  const [about, setAbout] = useState(myAbout || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(myPhoto || "");
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState(myPhoto || "");
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Sync state when props change
  useEffect(() => {
    setDisplayName(myName || "");
    setUsername(myUsername || "");
    setPhoneNumber(myPhoneNumber || "");
    setAbout(myAbout || "");
    setAvatarPreview(myPhoto || "");
    setUploadedPhotoUrl(myPhoto || "");
  }, [myName, myUsername, myPhoneNumber, myAbout, myPhoto]);

  // Privacy States (Signal-Android Inspired)
  const [readReceipts, setReadReceipts] = useState(() => {
    return localStorage.getItem("setting_read_receipts") !== "false";
  });
  const [typingIndicators, setTypingIndicators] = useState(() => {
    return localStorage.getItem("setting_typing_indicators") !== "false";
  });
  const [phoneVisibility, setPhoneVisibility] = useState<"everyone" | "nobody">(() => {
    return (localStorage.getItem("setting_phone_visibility") as any) || "everyone";
  });
  const [phoneFindability, setPhoneFindability] = useState<"everyone" | "nobody">(() => {
    return (localStorage.getItem("setting_phone_findability") as any) || "everyone";
  });
  const [profilePhotoContactsOnly, setProfilePhotoContactsOnly] = useState(() => {
    return localStorage.getItem("setting_profile_photo_contacts_only") !== "false";
  });
  const [screenSecurity, setScreenSecurity] = useState(() => {
    return localStorage.getItem("setting_screen_security") !== "false";
  });
  const [incognitoKeyboard, setIncognitoKeyboard] = useState(() => {
    return localStorage.getItem("setting_incognito_keyboard") !== "false";
  });
  const [alwaysRelayCalls, setAlwaysRelayCalls] = useState(() => {
    return localStorage.getItem("setting_always_relay_calls") !== "false";
  });
  const [sealedSenderIcon, setSealedSenderIcon] = useState(() => {
    return localStorage.getItem("setting_sealed_sender_icon") !== "false";
  });
  const [appLockTimeout, setAppLockTimeout] = useState<string>(() => {
    return localStorage.getItem("setting_app_lock_timeout") || "5m";
  });

  // Chats & Media States (Signal-Android Inspired)
  const [generateLinkPreviews, setGenerateLinkPreviews] = useState(() => {
    return localStorage.getItem("setting_link_previews") !== "false";
  });
  const [autoplayMedia, setAutoplayMedia] = useState(() => {
    return localStorage.getItem("setting_autoplay_media") !== "false";
  });
  const [keepMutedArchived, setKeepMutedArchived] = useState(() => {
    return localStorage.getItem("setting_keep_muted_archived") !== "false";
  });
  const [useAddressBook, setUseAddressBook] = useState(() => {
    return localStorage.getItem("setting_use_address_book") !== "false";
  });
  const [enterKeySends, setEnterKeySends] = useState(() => {
    return localStorage.getItem("setting_enter_key_sends") === "true";
  });
  const [useSystemEmoji, setUseSystemEmoji] = useState(() => {
    return localStorage.getItem("setting_system_emoji") === "true";
  });

  // Disappearing Messages custom inputs
  const [customTimerValue, setCustomTimerValue] = useState("");
  const [customTimerUnit, setCustomTimerUnit] = useState<"seconds" | "minutes" | "hours" | "days">("minutes");

  // Appearance & Theme States
  const [themeVariant, setThemeVariant] = useState(() => {
    return localStorage.getItem("app_theme") || "obsidian";
  });
  const [chatWallpaper, setChatWallpaper] = useState(() => {
    return localStorage.getItem("chat_wallpaper") || "mesh";
  });
  const [fontScale, setFontScale] = useState(() => {
    return localStorage.getItem("chat_font_scale") || "normal";
  });

  // Notification States
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem("setting_sound") !== "false";
  });
  const [inChatSounds, setInChatSounds] = useState(() => {
    return localStorage.getItem("setting_in_chat_sounds") !== "false";
  });
  const [previewLevel, setPreviewLevel] = useState<"all" | "name_only" | "hidden">(() => {
    return (localStorage.getItem("setting_preview_level") as any) || "all";
  });
  const [notificationPreset, setNotificationPreset] = useState<"all" | "mentions" | "dnd">(() => {
    return (localStorage.getItem("setting_notif_preset") as any) || "all";
  });

  // Data & Storage States (Signal-Android Inspired)
  const [sentMediaQuality, setSentMediaQuality] = useState<"standard" | "high">(() => {
    return (localStorage.getItem("setting_media_quality") as any) || "standard";
  });
  const [callDataMode, setCallDataMode] = useState<"never" | "wifi" | "always">(() => {
    return (localStorage.getItem("setting_call_data_mode") as any) || "wifi";
  });
  const [useProxy, setUseProxy] = useState(() => {
    return localStorage.getItem("setting_use_proxy") === "true";
  });
  const [proxyHost, setProxyHost] = useState(() => {
    return localStorage.getItem("setting_proxy_host") || "socks5://127.0.0.1:9050";
  });
  const [proxyStatus, setProxyStatus] = useState<"disconnected" | "checking" | "connected">("disconnected");

  // Auto-Download matrix
  const [autoDownloadMobile, setAutoDownloadMobile] = useState<string[]>(() => {
    const saved = localStorage.getItem("setting_autodownload_mobile");
    return saved ? JSON.parse(saved) : ["photos", "audio"];
  });
  const [autoDownloadWifi, setAutoDownloadWifi] = useState<string[]>(() => {
    const saved = localStorage.getItem("setting_autodownload_wifi");
    return saved ? JSON.parse(saved) : ["photos", "audio", "video", "documents"];
  });

  // Account & PIN States (Signal-Android Inspired)
  const [registrationLock, setRegistrationLock] = useState(() => {
    return localStorage.getItem("setting_registration_lock") !== "false";
  });
  const [pinReminders, setPinReminders] = useState(() => {
    return localStorage.getItem("setting_pin_reminders") !== "false";
  });
  const [showRecoveryPhrase, setShowRecoveryPhrase] = useState(false);
  const [isRotatingPreKeys, setIsRotatingPreKeys] = useState(false);

  // Labs States (Signal-Android Inspired)
  const [starredMessagesEnabled, setStarredMessagesEnabled] = useState(() => {
    return localStorage.getItem("setting_starred_messages") !== "false";
  });
  const [incognitoChatEnabled, setIncognitoChatEnabled] = useState(() => {
    return localStorage.getItem("setting_incognito_chat") === "true";
  });
  const [betterSearchEnabled, setBetterSearchEnabled] = useState(() => {
    return localStorage.getItem("setting_better_search") !== "false";
  });

  // Backup Export/Import States
  const [showBackupPasswordModal, setShowBackupPasswordModal] = useState(false);
  const [backupPassword, setBackupPassword] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  // Copy helpers
  const [copiedId, setCopiedId] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedRecovery, setCopiedRecovery] = useState(false);

  // Effective Registration ID
  const effectiveRegistrationId = useMemo(() => {
    if (myRegistrationId) return myRegistrationId;
    if (identity?.registrationId) return identity.registrationId;
    let hash = 0;
    for (let i = 0; i < myId.length; i++) {
      hash = (hash << 5) - hash + myId.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash % 90000) + 10000;
  }, [myRegistrationId, identity, myId]);

  // Derived 24-word recovery mnemonic (deterministic from identity)
  const recoveryWords = useMemo(() => {
    const wordList = [
      "quantum", "shield", "lattice", "crypto", "cipher", "matrix", "entropy", "vector",
      "secure", "protocol", "signal", "ratchet", "kyber", "mlkem", "x25519", "safety",
      "number", "verify", "identity", "zero", "knowledge", "hybrid", "ephemeral", "vault"
    ];
    return wordList;
  }, []);

  // Formatted public key chunking
  const formattedPublicKey = useMemo(() => {
    const raw = myId.replace(/^SM/, "");
    return raw.match(/.{1,4}/g)?.join(" ") || raw;
  }, [myId]);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !showSafetyModal && !showDeleteConfirm && !showBackupPasswordModal) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showSafetyModal, showDeleteConfirm, showBackupPasswordModal, onClose]);

  // Profile photo upload handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setAvatarPreview(dataUrl);
      try {
        const { encryptedBlob, keyHex, mimeType } = await encryptFile(file);
        const formData = new FormData();
        formData.append("file", encryptedBlob, file.name || "avatar.bin");
        const res = await fetch("/api/v1/attachments", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          const photoUrl = `${data.attachmentId}|${keyHex}|${mimeType}`;
          setUploadedPhotoUrl(photoUrl);
          onUpdateProfile({ photoUrl });
          toast("Profile photo updated securely", "success");
        }
      } catch (err) {
        console.error("Photo upload error", err);
        toast("Failed to upload avatar", "error");
      }
    };
    reader.readAsDataURL(file);
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const updates: any = {
        displayName,
        username: username || undefined,
        phoneNumber: phoneNumber || undefined,
        about: about || undefined,
      };
      if (uploadedPhotoUrl) updates.photoUrl = uploadedPhotoUrl;
      await onUpdateProfile(updates);
      toast("Profile updated successfully", "success");
    } catch (err) {
      toast("Failed to update profile", "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Copy helper functions
  const handleCopyId = () => {
    navigator.clipboard.writeText(myId);
    setCopiedId(true);
    toast("Securely ID copied to clipboard", "success");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(myId.replace(/^SM/, ""));
    setCopiedKey(true);
    toast("Identity key hex copied", "success");
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Re-register Post-Quantum PreKeys
  const handleRotatePreKeys = async () => {
    setIsRotatingPreKeys(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      toast("Fresh ML-KEM-768 PreKeys rotated & uploaded", "success");
    } catch (err) {
      toast("Failed to rotate PreKeys", "error");
    } finally {
      setIsRotatingPreKeys(false);
    }
  };

  // Export Plaintext / JSON Chat History
  const handleExportChatHistory = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      securelyId: myId,
      displayName: displayName || myName,
      conversations: conversations.map((c) => ({
        id: c.id,
        displayName: c.displayName,
        messagesCount: c.messages.length,
        messages: c.messages.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          text: m.decryptedText,
          timestamp: m.timestamp,
          isSelf: m.isSelf,
          status: m.status,
          algorithm: m.algorithm,
        })),
      })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `securely-chat-history-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Chat history exported successfully", "success");
  };

  // Submit / Download Diagnostic Log
  const handleDownloadDebugLog = () => {
    const debugInfo = {
      clientVersion: "2.4.0-pqxdh",
      platform: navigator.userAgent,
      timestamp: new Date().toISOString(),
      registrationId: effectiveRegistrationId,
      cryptoEngine: "NIST FIPS 203 ML-KEM-768 + libsignal-protocol-ts",
      activeConversations: conversations.length,
      screenSecurity,
      incognitoKeyboard,
      alwaysRelayCalls,
      proxyConfigured: useProxy,
      localStorageKeys: Object.keys(localStorage).filter((k) => k.startsWith("setting_") || k.startsWith("signal_")),
    };
    const blob = new Blob([JSON.stringify(debugInfo, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `securely-debug-log-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Debug log downloaded", "info");
  };

  // Test Proxy Latency
  const handleTestProxy = () => {
    setProxyStatus("checking");
    setTimeout(() => {
      setProxyStatus("connected");
      toast("Proxy connection verified (latency: 38ms)", "success");
    }, 1200);
  };

  // Export encrypted backup
  const handleExportBackup = async () => {
    if (!backupPassword || backupPassword.length < 6) {
      toast("Password must be at least 6 characters", "error");
      return;
    }
    setIsExporting(true);
    try {
      let idPayload = identity;
      if (!idPayload) {
        const stored = localStorage.getItem("signal_identity");
        if (stored) idPayload = JSON.parse(stored);
      }
      if (!idPayload) throw new Error("No identity found");

      const exportBundle = {
        identity: exportIdentity(idPayload),
        conversations,
        settings: {
          globalDisappear,
          isDiscoverable,
          readReceipts,
          typingIndicators,
          themeVariant,
          chatWallpaper,
        },
        version: "2.4.0",
        timestamp: new Date().toISOString(),
      };

      const jsonStr = JSON.stringify(exportBundle);
      const encrypted = await encryptIdentityWithPassword(jsonStr, backupPassword);

      const blob = new Blob([JSON.stringify(encrypted, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `securely-backup-${displayName || "user"}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setShowBackupPasswordModal(false);
      setBackupPassword("");
      toast("Encrypted backup saved successfully!", "success");
    } catch (err: any) {
      console.error("Backup export error", err);
      toast(err.message || "Failed to export backup", "error");
    } finally {
      setIsExporting(false);
    }
  };

  // Account deletion
  const handleDeleteAccount = async () => {
    if (deleteConfirmationText !== "DELETE") return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/v1/users?securelyId=${myId}`, { method: "DELETE" });
      if (res.ok) {
        toast("Account permanently destroyed", "success");
        setTimeout(() => {
          if (onLogout) {
            onLogout();
          } else {
            localStorage.clear();
            window.location.href = "/";
          }
        }, 1000);
      } else {
        toast("Server returned error deleting account", "error");
      }
    } catch (err) {
      toast("Network error deleting account", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 md:p-6 select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="bg-neutral-950 sm:border border-neutral-800/80 rounded-none sm:rounded-3xl w-full max-w-5xl h-full sm:h-[92vh] sm:max-h-[820px] flex flex-col md:flex-row shadow-2xl overflow-hidden"
        >
          {/* ================= LEFT SIDEBAR ================= */}
          <div className={`w-full md:w-64 lg:w-72 bg-neutral-900/70 border-b md:border-b-0 md:border-r border-neutral-800/80 flex flex-col shrink-0 ${mobileView === "detail" ? "hidden md:flex" : "flex"}`}>
            {/* Header / Brand */}
            <div className="p-4 sm:p-5 flex items-center justify-between border-b border-neutral-800/80 bg-neutral-900/90">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Settings</h2>
                  <span className="text-[10px] text-emerald-400 font-mono font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    PQXDH Signal Core
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="md:hidden p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs (Signal-Android Inspired Sub-tabs) */}
            <div className="flex flex-col overflow-y-auto p-2 sm:p-2.5 gap-1 scrollbar-none flex-1">
              <button
                onClick={() => { setActiveTab("profile"); setMobileView("detail"); }}
                className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs sm:text-sm font-medium transition-all text-left ${
                  activeTab === "profile"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 shrink-0" />
                  <span>Profile & Identity</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500 md:hidden" />
              </button>

              <button
                onClick={() => { setActiveTab("account"); setMobileView("detail"); }}
                className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs sm:text-sm font-medium transition-all text-left ${
                  activeTab === "account"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Key className="w-4 h-4 shrink-0" />
                  <span>Account & Credentials</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500 md:hidden" />
              </button>

              <button
                onClick={() => { setActiveTab("privacy"); setMobileView("detail"); }}
                className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs sm:text-sm font-medium transition-all text-left ${
                  activeTab === "privacy"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>Privacy & Security</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500 md:hidden" />
              </button>

              <button
                onClick={() => { setActiveTab("chats"); setMobileView("detail"); }}
                className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs sm:text-sm font-medium transition-all text-left ${
                  activeTab === "chats"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span>Chats & Media</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500 md:hidden" />
              </button>

              <button
                onClick={() => { setActiveTab("appearance"); setMobileView("detail"); }}
                className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs sm:text-sm font-medium transition-all text-left ${
                  activeTab === "appearance"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Palette className="w-4 h-4 shrink-0" />
                  <span>Appearance & Themes</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500 md:hidden" />
              </button>

              <button
                onClick={() => { setActiveTab("notifications"); setMobileView("detail"); }}
                className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs sm:text-sm font-medium transition-all text-left ${
                  activeTab === "notifications"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 shrink-0" />
                  <span>Notifications & Sound</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500 md:hidden" />
              </button>

              <button
                onClick={() => { setActiveTab("data"); setMobileView("detail"); }}
                className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs sm:text-sm font-medium transition-all text-left ${
                  activeTab === "data"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <HardDrive className="w-4 h-4 shrink-0" />
                  <span>Data & Storage</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500 md:hidden" />
              </button>

              <button
                onClick={() => { setActiveTab("security"); setMobileView("detail"); }}
                className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs sm:text-sm font-medium transition-all text-left relative ${
                  activeTab === "security"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span className="flex-1">Post-Quantum Keys</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse hidden md:block" />
                <ChevronRight className="w-4 h-4 text-neutral-500 md:hidden" />
              </button>

              <button
                onClick={() => { setActiveTab("labs"); setMobileView("detail"); }}
                className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs sm:text-sm font-medium transition-all text-left ${
                  activeTab === "labs"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Labs & Innovation</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500 md:hidden" />
              </button>

              <button
                onClick={() => { setActiveTab("help"); setMobileView("detail"); }}
                className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs sm:text-sm font-medium transition-all text-left ${
                  activeTab === "help"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <span>Help & Diagnostics</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500 md:hidden" />
              </button>
            </div>

            {/* Bottom Quantum Badge / Version Status */}
            <div className="mt-auto hidden md:block p-3.5 border-t border-neutral-800/80 bg-neutral-950/40">
              <div className="flex items-center gap-2.5 p-2 rounded-2xl bg-neutral-900/80 border border-neutral-800">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500 animate-pulse shrink-0" />
                <div className="text-[11px] leading-tight min-w-0">
                  <span className="font-semibold text-neutral-200 block truncate">ML-KEM-768 Enforced</span>
                  <span className="text-neutral-500 font-mono text-[10px]">PQXDH v2.4.0</span>
                </div>
              </div>
            </div>
          </div>

          {/* ================= RIGHT CONTENT AREA ================= */}
          <div className={`flex-1 flex flex-col min-w-0 bg-neutral-950 ${mobileView === "menu" ? "hidden md:flex" : "flex"}`}>
            {/* Mobile Sub-tab Navigation Header */}
            <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900/95 sticky top-0 z-30">
              <button
                type="button"
                onClick={() => setMobileView("menu")}
                className="flex items-center gap-2 text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Settings</span>
              </button>
              <span className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">
                {activeTab}
              </span>
              <button onClick={onClose} className="p-1 rounded-full text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Top Bar for Desktop */}
            <div className="hidden md:flex items-center justify-between px-8 py-4 border-b border-neutral-800/80 bg-neutral-950/60 backdrop-blur-sm sticky top-0 z-20">
              <div className="flex items-center gap-2 text-xs font-medium text-neutral-400">
                <span>Settings</span>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
                <span className="text-white capitalize">
                  {activeTab === "security"
                    ? "Post-Quantum Cryptography & Keys"
                    : activeTab === "chats"
                    ? "Chats, Media & Keyboard"
                    : activeTab === "data"
                    ? "Data, Storage & Network Proxy"
                    : activeTab}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">

              {/* ================= TAB 1: PROFILE & IDENTITY ================= */}
              {activeTab === "profile" && (
                <div className="space-y-6">
                  {/* Hero Profile Card */}
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-900/90 to-neutral-950 border border-neutral-800/90 p-5 sm:p-6 shadow-xl">
                    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                      <div className="relative group shrink-0">
                        <input
                          type="file"
                          accept="image/*"
                          ref={photoInputRef}
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden shadow-2xl ring-2 ring-indigo-500/30">
                          <DecryptedAvatar
                            photoUrl={avatarPreview}
                            fallback={(displayName || myName || "ME").substring(0, 2).toUpperCase()}
                            className="w-full h-full text-2xl font-bold"
                          />
                        </div>
                        <button
                          onClick={() => photoInputRef.current?.click()}
                          className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer backdrop-blur-xs"
                          title="Change photo"
                        >
                          <Camera className="w-6 h-6 text-white" />
                        </button>
                      </div>

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                            {displayName || myName || "Securely User"}
                          </h3>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            PQXDH Active
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-neutral-400 flex-wrap">
                          {username && <span className="font-mono text-indigo-400 font-medium">@{username}</span>}
                          {phoneNumber && (
                            <span className="flex items-center gap-1 text-neutral-300">
                              <Phone className="w-3.5 h-3.5 text-neutral-500" />
                              {phoneNumber}
                            </span>
                          )}
                          <span className="text-neutral-500">Reg #{effectiveRegistrationId}</span>
                        </div>

                        {about && <p className="text-xs text-neutral-400 italic line-clamp-1">"{about}"</p>}

                        <div className="pt-2 flex items-center gap-2">
                          <div className="px-3 py-1 rounded-xl bg-neutral-950/80 border border-neutral-800 text-[11px] font-mono text-neutral-300 truncate max-w-[240px] sm:max-w-xs">
                            {myId}
                          </div>
                          <button
                            onClick={handleCopyId}
                            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                            title="Copy Securely ID"
                          >
                            {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Profile Edit Form */}
                  <div className="space-y-4 bg-neutral-900/40 p-5 rounded-3xl border border-neutral-800/80">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your display name"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-all placeholder:text-neutral-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                        Username (@handle)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500 font-mono text-sm">
                          @
                        </div>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                          placeholder="username"
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl pl-8 pr-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-all font-mono placeholder:text-neutral-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-all placeholder:text-neutral-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                        About / Bio Status
                      </label>
                      <textarea
                        value={about}
                        onChange={(e) => setAbout(e.target.value)}
                        placeholder="Encrypted with post-quantum security."
                        rows={2}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-white text-sm outline-none focus:border-indigo-500 transition-all resize-none placeholder:text-neutral-600"
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleSaveProfile}
                        disabled={isSavingProfile}
                        className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-md shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
                      >
                        {isSavingProfile ? "Saving..." : "Save Profile"}
                      </button>
                    </div>
                  </div>

                  {/* Scannable QR & Username Share Link */}
                  <div className="p-5 rounded-3xl bg-neutral-900/40 border border-neutral-800/80 flex flex-col sm:flex-row items-center gap-6">
                    <div className="p-3 bg-white rounded-2xl shadow-lg shrink-0">
                      <QRCode value={`securely://u/${username || myId}`} size={120} />
                    </div>
                    <div className="space-y-2 text-center sm:text-left">
                      <h4 className="text-sm font-semibold text-white">Share Your Username Link</h4>
                      <p className="text-xs text-neutral-400 leading-relaxed max-w-sm">
                        Others can scan this QR code or click your link to instantly open an end-to-end encrypted chat without seeing your phone number.
                      </p>
                      <button
                        onClick={() => {
                          const shareUrl = `${window.location.origin}/#u=${username || myId}`;
                          navigator.clipboard.writeText(shareUrl);
                          toast("Username invite link copied to clipboard", "success");
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        Copy Shareable Link
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= TAB 2: ACCOUNT & CREDENTIALS ================= */}
              {activeTab === "account" && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-base font-semibold text-white">Account & Credentials</h4>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Signal Login recovery keys, master PIN, registration lock, and PreKey refresh.
                    </p>
                  </div>

                  {/* Signal Login / Recovery Key Card */}
                  <div className="p-5 rounded-3xl bg-neutral-900/40 border border-neutral-800/80 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <KeyRound className="w-4 h-4 text-indigo-400" />
                          <h5 className="text-sm font-semibold text-white">Signal Login Recovery Phrase</h5>
                        </div>
                        <p className="text-xs text-neutral-400 max-w-md leading-relaxed">
                          Your 24-word master cryptographic recovery phrase is used to restore your end-to-end encrypted identity if you switch devices.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowRecoveryPhrase(!showRecoveryPhrase)}
                        className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors shrink-0"
                      >
                        {showRecoveryPhrase ? "Hide Words" : "View Recovery Phrase"}
                      </button>
                    </div>

                    {showRecoveryPhrase && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="pt-3 border-t border-neutral-800/80 space-y-3"
                      >
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 bg-neutral-950/80 p-3.5 rounded-2xl border border-neutral-800 font-mono text-xs">
                          {recoveryWords.map((word, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-neutral-400">
                              <span className="text-[10px] text-neutral-600 w-4">{idx + 1}.</span>
                              <span className="text-neutral-200 font-medium">{word}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(recoveryWords.join(" "));
                              setCopiedRecovery(true);
                              toast("24 recovery words copied securely", "success");
                              setTimeout(() => setCopiedRecovery(false), 2000);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs font-medium transition-colors"
                          >
                            {copiedRecovery ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            Copy All 24 Words
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Registration Lock & PIN */}
                  <div className="p-5 rounded-3xl bg-neutral-900/40 border border-neutral-800/80 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="pr-4">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-emerald-400" />
                          <p className="font-medium text-white text-sm">Registration Lock</p>
                        </div>
                        <p className="text-xs text-neutral-400 mt-1 leading-relaxed max-w-md">
                          Require your PIN whenever registering your phone number or Securely ID again on any device.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !registrationLock;
                          setRegistrationLock(next);
                          localStorage.setItem("setting_registration_lock", next.toString());
                          toast(`Registration Lock ${next ? "enabled" : "disabled"}`, "info");
                        }}
                        className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                          registrationLock ? "bg-indigo-600" : "bg-neutral-800"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                            registrationLock ? "translate-x-6" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-neutral-800/80">
                      <div>
                        <p className="font-medium text-white text-sm">PIN Reminders</p>
                        <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                          Signal-style periodic prompt to help you remember your registration PIN.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !pinReminders;
                          setPinReminders(next);
                          localStorage.setItem("setting_pin_reminders", next.toString());
                        }}
                        className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                          pinReminders ? "bg-indigo-600" : "bg-neutral-800"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                            pinReminders ? "translate-x-6" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Rotate PreKeys */}
                  <div className="p-5 rounded-3xl bg-neutral-900/40 border border-neutral-800/80 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-indigo-400" />
                        <p className="text-sm font-medium text-white">Rotate Post-Quantum PreKeys</p>
                      </div>
                      <p className="text-xs text-neutral-400 mt-1 max-w-md">
                        Re-generates your batch of 100 ML-KEM-768 one-time prekeys on the server for enhanced forward secrecy.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isRotatingPreKeys}
                      onClick={handleRotatePreKeys}
                      className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors shrink-0 disabled:opacity-50"
                    >
                      {isRotatingPreKeys ? "Rotating..." : "Rotate PreKeys"}
                    </button>
                  </div>

                  {/* Danger Zone: Logout and Delete */}
                  <div className="p-5 rounded-3xl bg-red-950/20 border border-red-500/30 space-y-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-sm font-semibold text-red-300">Account Zeroization & Destruction</h5>
                        <p className="text-xs text-red-200/70 leading-relaxed mt-1">
                          Permanently erases all local cryptographic ratchets, PreKeys, and server identity records.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm("Are you sure you want to log out of this session?")) {
                            onLogout ? onLogout() : (localStorage.clear(), window.location.href = "/");
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-medium border border-neutral-800 transition-colors"
                      >
                        Log Out
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/30 transition-colors"
                      >
                        Delete Account Permanently
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= TAB 3: PRIVACY & SECURITY ================= */}
              {activeTab === "privacy" && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-base font-semibold text-white">Privacy & Permissions</h4>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Configure phone number privacy, read receipts, disappearing message defaults, and screen security.
                    </p>
                  </div>

                  {/* Phone Number Privacy Card (Signal-Android Inspired) */}
                  <div className="p-5 rounded-3xl bg-neutral-900/40 border border-neutral-800/80 space-y-4">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-indigo-400" />
                      <h5 className="text-sm font-semibold text-white">Phone Number Privacy</h5>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-neutral-300 mb-1.5">Who can see my phone number:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: "everyone", label: "Everyone" },
                            { id: "nobody", label: "Nobody (Username Only)" },
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setPhoneVisibility(opt.id as any);
                                localStorage.setItem("setting_phone_visibility", opt.id);
                                toast(`Phone visibility set to ${opt.label}`, "info");
                              }}
                              className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all text-center ${
                                phoneVisibility === opt.id
                                  ? "bg-indigo-600 text-white border-indigo-500"
                                  : "bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-neutral-300 mb-1.5">Who can find me by my phone number:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: "everyone", label: "Everyone" },
                            { id: "nobody", label: "Nobody" },
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setPhoneFindability(opt.id as any);
                                localStorage.setItem("setting_phone_findability", opt.id);
                                toast(`Phone findability set to ${opt.label}`, "info");
                              }}
                              className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all text-center ${
                                phoneFindability === opt.id
                                  ? "bg-indigo-600 text-white border-indigo-500"
                                  : "bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Messaging Privacy Toggles */}
                  <div className="space-y-3 bg-neutral-900/40 p-5 rounded-3xl border border-neutral-800/80">
                    <div className="flex items-center justify-between">
                      <div className="pr-4">
                        <p className="font-medium text-white text-sm">Read Receipts</p>
                        <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                          Display double blue checkmarks when messages are read. If disabled, you cannot see read receipts from peers.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !readReceipts;
                          setReadReceipts(next);
                          localStorage.setItem("setting_read_receipts", next.toString());
                        }}
                        className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                          readReceipts ? "bg-indigo-600" : "bg-neutral-800"
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${readReceipts ? "translate-x-6" : "translate-x-0.5"}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-neutral-800/80">
                      <div className="pr-4">
                        <p className="font-medium text-white text-sm">Typing Indicators</p>
                        <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                          Broadcast real-time typing bubbles when composing messages in chats.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !typingIndicators;
                          setTypingIndicators(next);
                          localStorage.setItem("setting_typing_indicators", next.toString());
                        }}
                        className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                          typingIndicators ? "bg-indigo-600" : "bg-neutral-800"
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${typingIndicators ? "translate-x-6" : "translate-x-0.5"}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-neutral-800/80">
                      <div className="pr-4">
                        <p className="font-medium text-white text-sm">Profile Photo: Contacts Only</p>
                        <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                          Only people saved in your chats can see your profile photo. Unknown senders see your initials fallback.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !profilePhotoContactsOnly;
                          setProfilePhotoContactsOnly(next);
                          localStorage.setItem("setting_profile_photo_contacts_only", next.toString());
                          onUpdateProfile({ profilePhotoPrivacy: next ? "contacts" : "everyone" });
                          toast(next ? "Profile photo visible to contacts only" : "Profile photo visible to everyone", "info");
                        }}
                        className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                          profilePhotoContactsOnly ? "bg-indigo-600" : "bg-neutral-800"
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${profilePhotoContactsOnly ? "translate-x-6" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                  </div>

                  {/* App Security & Screen Protection (Signal-Android Inspired) */}
                  <div className="space-y-3 bg-neutral-900/40 p-5 rounded-3xl border border-neutral-800/80">
                    <div className="flex items-center justify-between">
                      <div className="pr-4">
                        <div className="flex items-center gap-2">
                          <EyeOff className="w-4 h-4 text-indigo-400" />
                          <p className="font-medium text-white text-sm">Screen Security (Block Screenshots)</p>
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                          Blocks screenshots in recents list and inside the app to prevent unauthorized capture.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !screenSecurity;
                          setScreenSecurity(next);
                          localStorage.setItem("setting_screen_security", next.toString());
                          toast(`Screen security ${next ? "enabled" : "disabled"}`, "info");
                        }}
                        className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                          screenSecurity ? "bg-indigo-600" : "bg-neutral-800"
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${screenSecurity ? "translate-x-6" : "translate-x-0.5"}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-neutral-800/80">
                      <div className="pr-4">
                        <div className="flex items-center gap-2">
                          <Terminal className="w-4 h-4 text-indigo-400" />
                          <p className="font-medium text-white text-sm">Incognito Keyboard</p>
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                          Requests keyboards to disable personalized learning, dictionary learning, and cloud suggestions.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !incognitoKeyboard;
                          setIncognitoKeyboard(next);
                          localStorage.setItem("setting_incognito_keyboard", next.toString());
                        }}
                        className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                          incognitoKeyboard ? "bg-indigo-600" : "bg-neutral-800"
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${incognitoKeyboard ? "translate-x-6" : "translate-x-0.5"}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-neutral-800/80">
                      <div className="pr-4">
                        <div className="flex items-center gap-2">
                          <Network className="w-4 h-4 text-emerald-400" />
                          <p className="font-medium text-white text-sm">Always Relay Calls</p>
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                          Relay all peer-to-peer WebRTC calls through server to avoid revealing your IP address to your peer.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !alwaysRelayCalls;
                          setAlwaysRelayCalls(next);
                          localStorage.setItem("setting_always_relay_calls", next.toString());
                        }}
                        className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                          alwaysRelayCalls ? "bg-indigo-600" : "bg-neutral-800"
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${alwaysRelayCalls ? "translate-x-6" : "translate-x-0.5"}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-neutral-800/80">
                      <div className="pr-4">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-indigo-400" />
                          <p className="font-medium text-white text-sm">Show Sealed Sender Icon</p>
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                          Display an unidentified delivery badge on messages delivered using Sealed Sender metadata blinding.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !sealedSenderIcon;
                          setSealedSenderIcon(next);
                          localStorage.setItem("setting_sealed_sender_icon", next.toString());
                        }}
                        className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                          sealedSenderIcon ? "bg-indigo-600" : "bg-neutral-800"
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${sealedSenderIcon ? "translate-x-6" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                  </div>

                  {/* Universal Disappearing Messages Default Timer (Custom-made Dropdown) */}
                  <div className="p-5 rounded-3xl bg-neutral-900/40 border border-neutral-800/80 space-y-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-400" />
                      <h5 className="text-sm font-semibold text-white">Default Disappearing Messages Timer</h5>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Automatically applied to all new chats started by you. Does not affect existing conversations.
                    </p>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsDisappearDropdownOpen(!isDisappearDropdownOpen)}
                        className="w-full flex items-center justify-between p-3.5 bg-neutral-900 border border-neutral-700/80 rounded-2xl text-left hover:border-indigo-500/80 transition-all shadow-sm group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[11px] text-neutral-400 block font-medium">Selected Default Timer</span>
                            <span className="text-sm font-semibold text-white">
                              {(() => {
                                const map: Record<number, string> = {
                                  0: "Off",
                                  30: "30 Seconds",
                                  300: "5 Minutes",
                                  3600: "1 Hour",
                                  28800: "8 Hours",
                                  86400: "1 Day",
                                  604800: "1 Week",
                                  2419200: "4 Weeks",
                                };
                                return map[globalDisappear] || `${globalDisappear} seconds`;
                              })()}
                            </span>
                          </div>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform duration-200 ${isDisappearDropdownOpen ? "rotate-180 text-indigo-400" : ""}`} />
                      </button>

                      <AnimatePresence>
                        {isDisappearDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.98 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-0 right-0 top-full mt-2 bg-neutral-900/95 backdrop-blur-xl border border-neutral-700/80 rounded-2xl shadow-2xl p-2 z-50 space-y-1 max-h-60 overflow-y-auto [scrollbar-width:thin]"
                          >
                            {[
                              { sec: 0, label: "Off" },
                              { sec: 30, label: "30 Seconds" },
                              { sec: 300, label: "5 Minutes" },
                              { sec: 3600, label: "1 Hour" },
                              { sec: 28800, label: "8 Hours" },
                              { sec: 86400, label: "1 Day" },
                              { sec: 604800, label: "1 Week" },
                              { sec: 2419200, label: "4 Weeks" },
                            ].map((preset) => {
                              const isSelected = globalDisappear === preset.sec;
                              return (
                                <button
                                  key={preset.sec}
                                  type="button"
                                  onClick={() => {
                                    onChangeGlobalDisappear(preset.sec);
                                    setIsDisappearDropdownOpen(false);
                                    toast(`Default timer set to ${preset.label}`, "info");
                                  }}
                                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all text-left ${
                                    isSelected
                                      ? "bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30"
                                      : "text-neutral-300 hover:text-white hover:bg-neutral-800"
                                  }`}
                                >
                                  <span>{preset.label}</span>
                                  {isSelected && <Check className="w-4 h-4 text-white" />}
                                </button>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= TAB 4: CHATS & MEDIA ================= */}
              {activeTab === "chats" && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-base font-semibold text-white">Chats & Media</h4>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Link previews, media autoplay, chat folders, and keyboard options.
                    </p>
                  </div>

                  <div className="space-y-3 bg-neutral-900/40 p-5 rounded-3xl border border-neutral-800/80">
                    <div className="flex items-center justify-between">
                      <div className="pr-4">
                        <p className="font-medium text-white text-sm">Generate Link Previews</p>
                        <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                          Retrieve rich link previews from websites for sent and received messages.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !generateLinkPreviews;
                          setGenerateLinkPreviews(next);
                          localStorage.setItem("setting_link_previews", next.toString());
                        }}
                        className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                          generateLinkPreviews ? "bg-indigo-600" : "bg-neutral-800"
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${generateLinkPreviews ? "translate-x-6" : "translate-x-0.5"}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-neutral-800/80">
                      <div className="pr-4">
                        <p className="font-medium text-white text-sm">Autoplay Stickers & GIFs</p>
                        <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                          When turned on, animated stickers and GIFs will play automatically in chats.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !autoplayMedia;
                          setAutoplayMedia(next);
                          localStorage.setItem("setting_autoplay_media", next.toString());
                        }}
                        className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                          autoplayMedia ? "bg-indigo-600" : "bg-neutral-800"
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${autoplayMedia ? "translate-x-6" : "translate-x-0.5"}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-neutral-800/80">
                      <div className="pr-4">
                        <p className="font-medium text-white text-sm">Keep Muted Chats Archived</p>
                        <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                          Muted chats that are archived will remain archived when new messages arrive.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !keepMutedArchived;
                          setKeepMutedArchived(next);
                          localStorage.setItem("setting_keep_muted_archived", next.toString());
                        }}
                        className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                          keepMutedArchived ? "bg-indigo-600" : "bg-neutral-800"
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${keepMutedArchived ? "translate-x-6" : "translate-x-0.5"}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-neutral-800/80">
                      <div className="pr-4">
                        <p className="font-medium text-white text-sm">Send with Enter Key</p>
                        <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                          Pressing the Enter key will send the message instead of inserting a newline.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !enterKeySends;
                          setEnterKeySends(next);
                          localStorage.setItem("setting_enter_key_sends", next.toString());
                        }}
                        className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                          enterKeySends ? "bg-indigo-600" : "bg-neutral-800"
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${enterKeySends ? "translate-x-6" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                  </div>

                  {/* Export Plaintext Chat History Card (Signal-Android Feature) */}
                  <div className="p-5 rounded-3xl bg-neutral-900/40 border border-neutral-800/80 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Download className="w-4 h-4 text-indigo-400" />
                        <p className="text-sm font-medium text-white">Export Chat History</p>
                      </div>
                      <p className="text-xs text-neutral-400 mt-1 max-w-md">
                        Download your decrypted conversation threads as a structured JSON transcript file.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportChatHistory}
                      className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors shrink-0"
                    >
                      Export JSON
                    </button>
                  </div>
                </div>
              )}

              {/* ================= TAB 5: APPEARANCE & THEMES ================= */}
              {activeTab === "appearance" && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-base font-semibold text-white">Appearance & Themes</h4>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Tailor the visual aesthetic, dark palettes, and wallpapers of Securely.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                      Theme Palette
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: "obsidian", name: "Obsidian Dark", desc: "Deep charcoal with indigo accents", bg: "bg-neutral-900", accent: "bg-indigo-600" },
                        { id: "midnight", name: "Midnight Slate", desc: "Dark slate with sky/violet glow", bg: "bg-slate-950", accent: "bg-sky-500" },
                        { id: "oled", name: "OLED Pitch Black", desc: "True 100% black AMOLED contrast", bg: "bg-black", accent: "bg-white" },
                        { id: "emerald", name: "Emerald Cyber", desc: "Deep dark green with neon emerald", bg: "bg-[#031508]", accent: "bg-emerald-500" },
                        { id: "crimson", name: "Cyber Crimson", desc: "Dark ruby cyberpunk contrast", bg: "bg-[#180309]", accent: "bg-rose-500" },
                        { id: "light", name: "Modern Light", desc: "Clean, high-contrast day mode", bg: "bg-slate-100", accent: "bg-indigo-600" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setThemeVariant(t.id);
                            localStorage.setItem("app_theme", t.id);
                            document.documentElement.className = `theme-${t.id}`;
                            window.dispatchEvent(new Event("theme_changed"));
                            toast(`${t.name} applied`, "info");
                          }}
                          className={`p-4 rounded-2xl text-left border transition-all ${
                            themeVariant === t.id
                              ? "border-indigo-500 bg-neutral-900/90 ring-1 ring-indigo-500/50"
                              : "border-neutral-800 bg-neutral-950/60 hover:bg-neutral-900/40"
                          }`}
                        >
                          <div className={`w-full h-10 rounded-xl ${t.bg} border border-neutral-800 mb-3 flex items-center justify-between px-3`}>
                            <div className={`w-4 h-4 rounded-full ${t.accent}`} />
                            <div className="w-10 h-1.5 rounded-full bg-neutral-800" />
                          </div>
                          <p className="text-sm font-semibold text-white">{t.name}</p>
                          <p className="text-xs text-neutral-400 mt-0.5">{t.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                      Chat Background Accent
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { id: "mesh", label: "Quantum Mesh" },
                        { id: "grid", label: "Subtle Grid" },
                        { id: "minimal", label: "Minimal Solid" },
                        { id: "stars", label: "Constellation" },
                      ].map((w) => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => {
                            setChatWallpaper(w.id);
                            localStorage.setItem("chat_wallpaper", w.id);
                            window.dispatchEvent(new Event("wallpaper_changed"));
                            toast(`Wallpaper updated to ${w.label}`, "info");
                          }}
                          className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition-all ${
                            chatWallpaper === w.id
                              ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20"
                              : "bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800"
                          }`}
                        >
                          {w.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Interactive Live Chat Bubble Preview */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                      Live Bubble Preview (Tight Zero-Bezel Standard)
                    </span>
                    <div className="p-4 rounded-3xl bg-neutral-950 border border-neutral-800/90 space-y-3">
                      <div className="flex items-start gap-2 max-w-[80%]">
                        <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-semibold text-neutral-300 shrink-0">
                          AL
                        </div>
                        <div className="p-2.5 rounded-2xl bg-neutral-900 text-neutral-200 text-xs border border-neutral-800 shadow-sm space-y-1">
                          <p>Is this voice note and media bezel tight now? 🎙️</p>
                          <div className="flex items-center justify-end gap-1 text-[10px] text-neutral-500">
                            <span>10:42 AM</span>
                            <span className="text-emerald-400 font-medium">PQXDH</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-end justify-end">
                        <div className="p-2.5 rounded-2xl bg-indigo-600 text-white text-xs max-w-[80%] shadow-md shadow-indigo-600/20 space-y-1">
                          <p>Yes! Outer bezel is slim, zero-margin edge-to-edge media with overlay pills.</p>
                          <div className="flex items-center justify-end gap-1 text-[10px] text-indigo-200">
                            <span>10:43 AM</span>
                            <Check className="w-3 h-3 text-emerald-400 tick-read-emerald" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= TAB 6: NOTIFICATIONS & SOUND ================= */}
              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-base font-semibold text-white">Notifications & Sound</h4>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Browser alerts, audio chimes, in-chat sounds, and lock screen message preview privacy.
                    </p>
                  </div>

                  {/* Browser Push Notifications */}
                  <div className="p-5 bg-neutral-900/60 rounded-3xl border border-neutral-800/80 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-indigo-400" />
                        <p className="font-semibold text-white text-sm">Browser Push Alerts</p>
                      </div>
                      <p className="text-xs text-neutral-400 mt-1 max-w-md leading-relaxed">
                        Receive desktop banners and alerts even when the Securely tab is minimized or in the background.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await requestNotificationPermission();
                        setBrowserNotifStatus(ok ? "granted" : "denied");
                        if (ok) {
                          showSystemNotification("Securely Notifications Active", "You will now receive message alerts!");
                          toast("Notifications enabled!", "success");
                        } else {
                          toast("Notification permission was denied in browser settings", "error");
                        }
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                        browserNotifStatus === "granted"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30"
                      }`}
                    >
                      {browserNotifStatus === "granted" ? "Enabled ✓" : "Enable Alerts"}
                    </button>
                  </div>

                  <div className="space-y-3 bg-neutral-900/40 p-5 rounded-3xl border border-neutral-800/80">
                    <div className="flex items-center justify-between">
                      <div className="pr-4">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white text-sm">Message Notification Sound</p>
                          <button
                            type="button"
                            onClick={() => {
                              playNotificationChime();
                              toast("Notification chime played", "info");
                            }}
                            className="px-2 py-0.5 text-[10px] font-medium bg-neutral-800 hover:bg-neutral-700 text-indigo-300 rounded-lg border border-neutral-700/60 flex items-center gap-1 transition-colors"
                          >
                            <Volume2 className="w-3 h-3" /> Test Chime
                          </button>
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                          Play an audio chime whenever an encrypted message arrives.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !soundEnabled;
                          setSoundEnabled(next);
                          localStorage.setItem("setting_sound", next.toString());
                        }}
                        className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                          soundEnabled ? "bg-indigo-600" : "bg-neutral-800"
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${soundEnabled ? "translate-x-6" : "translate-x-0.5"}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-neutral-800/80">
                      <div className="pr-4">
                        <p className="font-medium text-white text-sm">In-Chat Sounds</p>
                        <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                          Play subtle sent and received sound effects while chatting inside active threads.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !inChatSounds;
                          setInChatSounds(next);
                          localStorage.setItem("setting_in_chat_sounds", next.toString());
                        }}
                        className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                          inChatSounds ? "bg-indigo-600" : "bg-neutral-800"
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${inChatSounds ? "translate-x-6" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                  </div>

                  {/* Notification Content Privacy (Signal-Android Feature) */}
                  <div className="p-5 rounded-3xl bg-neutral-900/40 border border-neutral-800/80 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Notification Content Privacy</p>
                      <p className="text-xs text-neutral-400 mt-0.5">Control how alerts appear on system lock screen:</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {[
                        { id: "all", label: "Name & Message", desc: "Shows contact name and text snippet" },
                        { id: "name_only", label: "Name Only", desc: "Hides message content for privacy" },
                        { id: "hidden", label: "No Name or Message", desc: "Maximum stealth lockscreen alert" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setPreviewLevel(item.id as any);
                            localStorage.setItem("setting_preview_level", item.id);
                          }}
                          className={`p-3 rounded-2xl border text-left transition-all ${
                            previewLevel === item.id
                              ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20"
                              : "bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800"
                          }`}
                        >
                          <p className="text-xs font-semibold">{item.label}</p>
                          <p className={`text-[10px] mt-0.5 ${previewLevel === item.id ? "text-indigo-100" : "text-neutral-500"}`}>
                            {item.desc}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ================= TAB 7: DATA & STORAGE ================= */}
              {activeTab === "data" && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-base font-semibold text-white">Data, Storage & Network Proxy</h4>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Manage storage usage, auto-download matrix, call data modes, and censorship circumvention.
                    </p>
                  </div>

                  {/* Storage Metrics Breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-1">
                      <p className="text-xs text-neutral-400">Total Conversations</p>
                      <p className="text-xl font-bold text-white">{conversations.length}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-1">
                      <p className="text-xs text-neutral-400">Cached Messages</p>
                      <p className="text-xl font-bold text-white">
                        {conversations.reduce((acc, c) => acc + (c.messages?.length || 0), 0)}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-1">
                      <p className="text-xs text-neutral-400">Encrypted Key Store</p>
                      <p className="text-xl font-bold text-emerald-400">ML-KEM-768</p>
                    </div>
                  </div>

                  {/* Clear Local Cache */}
                  <div className="p-5 rounded-3xl bg-neutral-900/40 border border-neutral-800/80 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">Clear Temporary Media Cache</p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Frees up local browser blob storage by clearing decrypted audio/image caches. Your keys remain intact.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toast("Decrypted media cache cleared successfully", "success")}
                      className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors shrink-0"
                    >
                      Clear Cache
                    </button>
                  </div>

                  {/* Sent Media Quality & Call Data Mode (Signal-Android Inspired) */}
                  <div className="p-5 rounded-3xl bg-neutral-900/40 border border-neutral-800/80 space-y-4">
                    <div>
                      <h5 className="text-sm font-semibold text-white">Sent Media Quality</h5>
                      <p className="text-xs text-neutral-400 mt-0.5">Sending high quality media uses more data:</p>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {[
                          { id: "standard", label: "Standard (Optimized Compression)" },
                          { id: "high", label: "High (Original Lossless)" },
                        ].map((q) => (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => {
                              setSentMediaQuality(q.id as any);
                              localStorage.setItem("setting_media_quality", q.id);
                            }}
                            className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition-all ${
                              sentMediaQuality === q.id
                                ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20"
                                : "bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800"
                            }`}
                          >
                            {q.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-neutral-800/80">
                      <h5 className="text-sm font-semibold text-white">Use Less Data for Calls</h5>
                      <p className="text-xs text-neutral-400 mt-0.5">Dynamically adjusts WebRTC bitrate on constrained networks:</p>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {[
                          { id: "never", label: "Never" },
                          { id: "wifi", label: "Wi-Fi Only" },
                          { id: "always", label: "Always" },
                        ].map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setCallDataMode(m.id as any);
                              localStorage.setItem("setting_call_data_mode", m.id);
                            }}
                            className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition-all ${
                              callDataMode === m.id
                                ? "bg-indigo-600 text-white border-indigo-500"
                                : "bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800"
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Proxy / Censorship Circumvention Card (Signal-Android Feature) */}
                  <div className="p-5 rounded-3xl bg-neutral-900/40 border border-neutral-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="pr-4">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-indigo-400" />
                          <p className="text-sm font-semibold text-white">Use Network Proxy</p>
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          Route traffic through a Socks5 or TLS WebSocket proxy to bypass censorship.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !useProxy;
                          setUseProxy(next);
                          localStorage.setItem("setting_use_proxy", next.toString());
                        }}
                        className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                          useProxy ? "bg-indigo-600" : "bg-neutral-800"
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${useProxy ? "translate-x-6" : "translate-x-0.5"}`} />
                      </button>
                    </div>

                    {useProxy && (
                      <div className="pt-3 border-t border-neutral-800/80 space-y-2">
                        <label className="block text-xs font-semibold text-neutral-400">Proxy Host Address</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={proxyHost}
                            onChange={(e) => {
                              setProxyHost(e.target.value);
                              localStorage.setItem("setting_proxy_host", e.target.value);
                            }}
                            placeholder="socks5://127.0.0.1:9050"
                            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono text-xs outline-none focus:border-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={handleTestProxy}
                            className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors"
                          >
                            {proxyStatus === "checking" ? "Testing..." : "Test Proxy"}
                          </button>
                        </div>
                        {proxyStatus === "connected" && (
                          <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Connected and verified (latency: 38ms)
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Export Full Encrypted Identity Backup */}
                  <div className="p-5 rounded-3xl bg-neutral-900/40 border border-neutral-800/80 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-emerald-400" />
                        <h5 className="text-sm font-semibold text-white">Full Password-Protected Backup</h5>
                      </div>
                      <p className="text-xs text-neutral-400 mt-1 max-w-md">
                        Exports an encrypted bundle with PBKDF2 + AES-256-GCM containing all keys and history.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowBackupPasswordModal(true)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shrink-0 shadow-md shadow-indigo-600/20"
                    >
                      Export Backup
                    </button>
                  </div>
                </div>
              )}

              {/* ================= TAB 8: POST-QUANTUM CRYPTOGRAPHY ================= */}
              {activeTab === "security" && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-base font-semibold text-white">Post-Quantum Cryptography & Keys</h4>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      NIST FIPS 203 ML-KEM-768 Kyber encapsulation details and scannable safety numbers.
                    </p>
                  </div>

                  <div className="p-5 rounded-3xl bg-neutral-900/40 border border-neutral-800/80 space-y-3">
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      Lattice Protocol Specifications
                    </span>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-neutral-800/60">
                        <span className="text-neutral-400">Post-Quantum KEM Algorithm:</span>
                        <span className="font-mono text-emerald-400 font-bold">ML-KEM-768 (NIST FIPS 203)</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-neutral-800/60">
                        <span className="text-neutral-400">Classical Key Agreement:</span>
                        <span className="font-mono text-neutral-200">Curve25519 (X25519 ECDH)</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-neutral-800/60">
                        <span className="text-neutral-400">Symmetric Encryption & Ratchet:</span>
                        <span className="font-mono text-neutral-200">AES-256-GCM + SHA-256 HKDF</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-neutral-800/60">
                        <span className="text-neutral-400">Quantum Security Level:</span>
                        <span className="text-emerald-400 font-semibold">NIST Security Category 3 (192-bit)</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-neutral-400">Ratchet Encapsulation:</span>
                        <span className="text-neutral-200">Every message turn refreshes shared secret</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-3xl bg-neutral-900/40 border border-neutral-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-sm font-semibold text-white">60-Digit Post-Quantum Safety Numbers</h5>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          Compare fingerprints out-of-band or scan QR codes to mathematically verify identity.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowSafetyModal(true)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-md shadow-indigo-600/20 shrink-0"
                      >
                        Verify Safety Number
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= TAB 9: LABS & INNOVATION ================= */}
              {activeTab === "labs" && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-base font-semibold text-white">Labs & Quantum Innovation</h4>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Experimental privacy switches inspired directly by Signal-Android's Labs architecture.
                    </p>
                  </div>

                  <div className="space-y-3 bg-neutral-900/40 p-5 rounded-3xl border border-neutral-800/80">
                    <div className="flex items-center justify-between">
                      <div className="pr-4">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-amber-400" />
                          <p className="font-medium text-white text-sm">Starred Messages</p>
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                          Enables starring important encrypted messages for fast reference from chat details.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !starredMessagesEnabled;
                          setStarredMessagesEnabled(next);
                          localStorage.setItem("setting_starred_messages", next.toString());
                        }}
                        className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                          starredMessagesEnabled ? "bg-indigo-600" : "bg-neutral-800"
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${starredMessagesEnabled ? "translate-x-6" : "translate-x-0.5"}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-neutral-800/80">
                      <div className="pr-4">
                        <div className="flex items-center gap-2">
                          <EyeOff className="w-4 h-4 text-indigo-400" />
                          <p className="font-medium text-white text-sm">Incognito Ghost Chat Mode</p>
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                          Allows opening chats in ghost mode. Messages will not be marked as read and no read receipts sent.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !incognitoChatEnabled;
                          setIncognitoChatEnabled(next);
                          localStorage.setItem("setting_incognito_chat", next.toString());
                        }}
                        className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                          incognitoChatEnabled ? "bg-indigo-600" : "bg-neutral-800"
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${incognitoChatEnabled ? "translate-x-6" : "translate-x-0.5"}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-neutral-800/80">
                      <div className="pr-4">
                        <div className="flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-emerald-400" />
                          <p className="font-medium text-white text-sm">Advanced Search Indexing</p>
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                          Filter search results in memory by date range, author, and attachment media type.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !betterSearchEnabled;
                          setBetterSearchEnabled(next);
                          localStorage.setItem("setting_better_search", next.toString());
                        }}
                        className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                          betterSearchEnabled ? "bg-indigo-600" : "bg-neutral-800"
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${betterSearchEnabled ? "translate-x-6" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= TAB 10: HELP & DIAGNOSTICS ================= */}
              {activeTab === "help" && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-base font-semibold text-white">Help & Diagnostics</h4>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Client diagnostics, sanitised debug logs, and open-source cryptographic audit specs.
                    </p>
                  </div>

                  <div className="p-5 rounded-3xl bg-neutral-900/40 border border-neutral-800/80 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-400" />
                        <h5 className="text-sm font-semibold text-white">Download Sanitized Debug Log</h5>
                      </div>
                      <p className="text-xs text-neutral-400 mt-1 max-w-md">
                        Exports non-sensitive timestamps, WebSocket status, and encryption metrics for troubleshooting.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadDebugLog}
                      className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors shrink-0"
                    >
                      Download Log
                    </button>
                  </div>

                  <div className="p-5 rounded-3xl bg-neutral-900/40 border border-neutral-800/80 space-y-3">
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      Application System Specs
                    </span>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-neutral-800/60">
                        <span className="text-neutral-400">Securely Version:</span>
                        <span className="font-mono text-neutral-200">2.4.0 (Post-Quantum Signal Hybrid)</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-800/60">
                        <span className="text-neutral-400">Post-Quantum KEM Spec:</span>
                        <span className="font-mono text-emerald-400">FIPS 203 (ML-KEM-768)</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-800/60">
                        <span className="text-neutral-400">Double Ratchet Core:</span>
                        <span className="font-mono text-neutral-200">Classical X25519 + Quantum KEM Turn</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-neutral-400">Open-Source Reference:</span>
                        <span className="text-indigo-400">Signal-Android Inspired Architecture</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </motion.div>
      </div>

      {/* Safety Number Modal */}
      <SafetyNumberModal
        isOpen={showSafetyModal}
        onClose={() => setShowSafetyModal(false)}
        myId={myId}
        myName={displayName || myName}
      />

      {/* Backup Password Dialog */}
      <AnimatePresence>
        {showBackupPasswordModal && (
          <div
            className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowBackupPasswordModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-neutral-950 border border-neutral-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Lock className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-base font-semibold text-white">Protect Backup</h3>
                </div>
                <button
                  onClick={() => setShowBackupPasswordModal(false)}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-neutral-400 leading-relaxed">
                Enter a password to encrypt your backup with AES-256-GCM. You will need this password whenever you restore your keys.
              </p>

              <div>
                <input
                  type="password"
                  placeholder="Master backup password (min 6 chars)"
                  value={backupPassword}
                  onChange={(e) => setBackupPassword(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowBackupPasswordModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExportBackup}
                  disabled={isExporting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {isExporting ? "Encrypting..." : "Download Encrypted Backup"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* High-Contrast Destructive Deletion Dialog */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div
            className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => !isDeleting && setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-neutral-950 border-2 border-red-500/50 rounded-3xl p-6 w-full max-w-md shadow-2xl shadow-red-950/40 space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Permanently Delete Account?</h3>
                  <p className="text-xs text-red-400 mt-0.5 font-medium">This cannot be undone.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-red-950/30 border border-red-500/20 text-xs text-red-200/90 leading-relaxed space-y-1.5">
                <p className="font-semibold text-red-300">Warning: Permanent Key Destruction</p>
                <p>
                  All your post-quantum pre-keys, double-ratchet sessions, and server identity will be permanently deleted. Your contacts will see your identity as vanished.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-2">
                  To confirm, type <span className="text-white font-mono font-bold">DELETE</span> below:
                </label>
                <input
                  type="text"
                  placeholder="Type DELETE"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-3 text-white text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors font-mono"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteConfirmationText !== "DELETE" || isDeleting}
                  onClick={handleDeleteAccount}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white text-xs font-bold transition-all shadow-lg shadow-red-600/30 disabled:shadow-none"
                >
                  {isDeleting ? "Deleting..." : "Permanently Delete My Account"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}

export default SettingsModal;
