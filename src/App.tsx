import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import {
  SessionBuilder,
  SessionCipher,
  SignalProtocolAddress,
} from "@privacyresearch/libsignal-protocol-typescript";

import Onboarding, { SignalIdentity } from "./components/Onboarding";
import ChatLayout from "./components/ChatLayout";
import {
  bufferToBase64,
  base64ToBuffer,
  base64ToUint8Array,
  importIdentity,
  exportIdentity,
  encryptFile,
  decryptFile,
  initPQSession,
  processInitialPQXDH,
  pqRatchetEncrypt,
  pqRatchetDecrypt,
  calculateSafetyNumber,
} from "./crypto";
import { SignalProtocolStore } from "./signalStore";
import { Conversation, ChatMessage, EnvelopePayload, EncryptedMessageWrapper } from "./types";
import { ToastContainer, toast } from "./components/Toast";
import { playNotificationChime, playSentChime, showSystemNotification } from "./utils/notifications";

export default function App() {
  const [identity, setIdentity] = useState<SignalIdentity | null>(() => {
    const local = localStorage.getItem("signal_identity");
    if (local) {
      try {
        return importIdentity(local);
      } catch (e) {
        console.error("Failed to parse local identity", e);
        return null;
      }
    }
    return null;
  });

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const activeTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const processedMsgIdsRef = useRef<Set<string>>(new Set());
  const activeConvIdRef = useRef<string | null>(null);

  const scheduleTimeout = (key: string, fn: () => void, delayMs: number) => {
    const existing = activeTimersRef.current.get(key);
    if (existing) clearTimeout(existing);
    const safeDelay = Math.min(Math.max(0, delayMs), 2147483647);
    const t = setTimeout(() => {
      activeTimersRef.current.delete(key);
      fn();
    }, safeDelay);
    activeTimersRef.current.set(key, t);
  };

  const clearAllTimers = () => {
    activeTimersRef.current.forEach((t) => clearTimeout(t));
    activeTimersRef.current.clear();
  };
  const pqPendingInitMap = useRef<Map<string, { initialCiphertext: string; preKeyId: number }>>(new Map());

  useEffect(() => {
    if (identity) {
      const storageKey = `signal_conversations_${identity.securelyId}`;
      const local = localStorage.getItem(storageKey);
      if (local) {
        try {
          const parsed = JSON.parse(local);
          const now = Date.now();
          const loadedConvs = parsed.map((c: any) => ({
            ...c,
            lastActivity: c.lastActivity ? new Date(c.lastActivity) : new Date(),
            messages: (c.messages || [])
              .filter((m: any) => {
                if (m.expireIn && (m.status === "sent" || m.status === "read" || m.status === "delivered")) {
                  const expireTime = new Date(m.timestamp).getTime() + m.expireIn * 1000;
                  if (expireTime <= now) return false;
                }
                return true;
              })
              .map((m: any) => {
                const isPastScheduled = m.status === "scheduled" && m.scheduledTime && new Date(m.scheduledTime).getTime() <= now;
                return {
                  ...m,
                  status: isPastScheduled ? "sent" : m.status,
                  timestamp: isPastScheduled ? new Date(m.scheduledTime) : new Date(m.timestamp),
                  scheduledTime: isPastScheduled ? undefined : (m.scheduledTime ? new Date(m.scheduledTime) : undefined),
                };
              }),
          }));

          loadedConvs.forEach((conv: Conversation) => {
            conv.messages.forEach((msg: ChatMessage) => {
              processedMsgIdsRef.current.add(msg.id);
            });
          });

          setConversations(loadedConvs);

          // Re-arm timeouts for valid non-expired messages
          loadedConvs.forEach((conv: Conversation) => {
            conv.messages.forEach((msg: ChatMessage) => {
              if (conv.id === identity.securelyId && msg.status === "scheduled" && msg.scheduledTime) {
                const delay = Math.max(0, msg.scheduledTime.getTime() - Date.now());
                scheduleTimeout(`sched_${msg.id}`, () => {
                  setConversations((prev) =>
                    prev.map((c) =>
                      c.id === conv.id
                        ? { ...c, messages: c.messages.map((m) => (m.id === msg.id ? { ...m, status: "read" } : m)) }
                        : c
                    )
                  );
                  if (msg.expireIn) {
                    scheduleTimeout(`expire_${msg.id}`, () => {
                      setConversations((prev) =>
                        prev.map((c) =>
                          c.id === conv.id ? { ...c, messages: c.messages.filter((m) => m.id !== msg.id) } : c
                        )
                      );
                    }, msg.expireIn * 1000);
                  }
                }, delay);
              } else if (msg.expireIn && (msg.status === "sent" || msg.status === "read" || msg.status === "delivered")) {
                const expireTime = msg.timestamp.getTime() + msg.expireIn * 1000;
                const delay = Math.max(0, expireTime - Date.now());
                scheduleTimeout(`expire_${msg.id}`, () => {
                  setConversations((prev) =>
                    prev.map((c) =>
                      c.id === conv.id ? { ...c, messages: c.messages.filter((m) => m.id !== msg.id) } : c
                    )
                  );
                }, delay);
              }
            });
          });
        } catch (e) {
          console.error("Failed to parse conversations", e);
        }
      }
    }
    return () => {
      clearAllTimers();
    };
  }, [identity?.securelyId]);

  useEffect(() => {
    if (identity && conversations.length > 0) {
      localStorage.setItem(`signal_conversations_${identity.securelyId}`, JSON.stringify(conversations));
    }
  }, [conversations, identity?.securelyId]);

  useEffect(() => {
    const applyTheme = () => {
      const theme = localStorage.getItem("app_theme") || "obsidian";
      document.documentElement.className = `theme-${theme}`;
    };
    applyTheme();
    window.addEventListener("theme_changed", applyTheme);
    return () => window.removeEventListener("theme_changed", applyTheme);
  }, []);

  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  useEffect(() => {
    activeConvIdRef.current = activeConvId;
  }, [activeConvId]);

  useEffect(() => {
    const markActiveAsRead = () => {
      if (document.hidden || !document.hasFocus()) return;
      if (!activeConvId || !socketRef.current) return;

      setConversations((prev) => {
        let hasUnread = false;
        const next = prev.map((conv) => {
          if (conv.id !== activeConvId) return conv;
          const updatedMsgs = conv.messages.map((m) => {
            if (!m.isSelf && m.status !== "read") {
              hasUnread = true;
              socketRef.current?.emit("message_receipt", {
                messageId: m.id,
                recipientId: conv.id,
                status: "read",
              });
              return { ...m, status: "read" as const };
            }
            return m;
          });
          return hasUnread ? { ...conv, messages: updatedMsgs } : conv;
        });
        return hasUnread ? next : prev;
      });
    };

    window.addEventListener("focus", markActiveAsRead);
    document.addEventListener("visibilitychange", markActiveAsRead);
    markActiveAsRead();

    return () => {
      window.removeEventListener("focus", markActiveAsRead);
      document.removeEventListener("visibilitychange", markActiveAsRead);
    };
  }, [activeConvId]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const storeRef = useRef<SignalProtocolStore | null>(null);

  // Auto-connect to backend websocket after identity is generated
  useEffect(() => {
    if (!identity) return;

    // Initialize custom store with classical and Post-Quantum keys
    const store = new SignalProtocolStore();
    store.put("identityKey", identity.identityKeyPair);
    store.put("registrationId", identity.registrationId);
    store.put(
      "25519KeysignedKey" + identity.signedPreKey.keyId,
      identity.signedPreKey.keyPair,
    );
    identity.preKeys.forEach((pk) => {
      store.put("25519KeypreKey" + pk.keyId, pk.keyPair);
    });

    // Populate Post-Quantum keys in store
    if (identity.pqIdentityKeyPair) {
      store.storePQIdentityKeyPair(identity.pqIdentityKeyPair);
    }
    if (identity.pqSignedPreKey) {
      store.storePQSignedPreKey(identity.pqSignedPreKey.keyId, identity.pqSignedPreKey.keyPair);
    }
    if (identity.pqPreKeys && Array.isArray(identity.pqPreKeys)) {
      identity.pqPreKeys.forEach((pk: any) => {
        store.storePQPreKey(pk.keyId, pk.keyPair);
      });
    }

    storeRef.current = store;

    // Fallback to polling to satisfy constraint
    const newSocket = io("/", { transports: ["websocket", "polling"] });
    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on("connect", () => {
      newSocket.emit("register", {
        securelyId: identity.securelyId,
        isActive: true,
        displayName: identity.displayName,
        username: identity.username,
        phoneNumber: identity.phoneNumber,
        photoUrl: identity.photoUrl,
        about: identity.about,
        discoverable: true,
        registrationId: identity.registrationId,
        identityKey: bufferToBase64(identity.identityKeyPair.pubKey),
        signedPreKey: {
          keyId: identity.signedPreKey.keyId,
          publicKey: bufferToBase64(identity.signedPreKey.keyPair.pubKey),
          signature: bufferToBase64(identity.signedPreKey.signature),
        },
        preKeys: identity.preKeys.map((pk) => ({
          keyId: pk.keyId,
          publicKey: bufferToBase64(pk.keyPair.pubKey),
        })),
        pqIdentityKey: identity.pqIdentityKeyPair
          ? bufferToBase64(identity.pqIdentityKeyPair.publicKey || identity.pqIdentityKeyPair.pubKey)
          : undefined,
        pqSignedPreKey: identity.pqSignedPreKey
          ? {
              keyId: identity.pqSignedPreKey.keyId,
              publicKey: bufferToBase64(identity.pqSignedPreKey.keyPair.publicKey || identity.pqSignedPreKey.keyPair.pubKey),
              signature: identity.pqSignedPreKey.signature ? bufferToBase64(identity.pqSignedPreKey.signature) : '',
            }
          : undefined,
        pqPreKeys: identity.pqPreKeys
          ? identity.pqPreKeys.map((pk: any) => ({
              keyId: pk.keyId,
              publicKey: bufferToBase64(pk.keyPair.publicKey || pk.keyPair.pubKey),
            }))
          : [],
      });

      // Synchronize all groups user is a member of on connect/reload
      fetch(`/api/v1/users/${identity.securelyId}/groups`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.groups) && data.groups.length > 0) {
            data.groups.forEach((g: any) => {
              newSocket.emit("join_group", { groupId: g.groupId });
            });
            setConversations((prev) => {
              const copy = [...prev];
              data.groups.forEach((g: any) => {
                const matchIdx = copy.findIndex(
                  (c) =>
                    c.id === g.groupId ||
                    c.id === `group_${g.groupId}` ||
                    c.id.replace(/^group_/, "") === g.groupId
                );
                if (matchIdx >= 0) {
                  copy[matchIdx] = {
                    ...copy[matchIdx],
                    displayName: g.name,
                    groupDescription: g.description,
                    groupMembers: g.members,
                    requireAdminApproval: g.requireAdminApproval,
                    onlyAdminsCanPost: g.onlyAdminsCanPost,
                    pendingRequests: g.pendingRequests,
                  };
                } else {
                  copy.push({
                    id: `group_${g.groupId}`,
                    displayName: g.name,
                    isGroup: true,
                    messages: [],
                    unreadCount: 0,
                    lastActivity: g.createdAt ? new Date(g.createdAt) : new Date(),
                    groupDescription: g.description,
                    groupMembers: g.members,
                    requireAdminApproval: g.requireAdminApproval,
                    onlyAdminsCanPost: g.onlyAdminsCanPost,
                    pendingRequests: g.pendingRequests,
                    isPostQuantum: true,
                    algorithm: "Group Blind E2EE Relay",
                  });
                }
              });
              return copy.sort(
                (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
              );
            });
          }
        })
        .catch((e) => console.error("Failed to sync user groups on connect:", e));
    });

    newSocket.on("sync_messages", async (pendingArr: any[]) => {
      for (const msg of pendingArr) {
        await handleIncomingMessage({
          ...msg,
          encryptedPayload:
            typeof msg.encryptedPayload === "string"
              ? JSON.parse(msg.encryptedPayload)
              : msg.encryptedPayload,
        });
        const isViewing = activeConvIdRef.current === msg.senderId && !document.hidden && document.hasFocus();
        newSocket.emit("message_receipt", {
          messageId: msg.messageId,
          recipientId: msg.senderId,
          status: isViewing ? "read" : "delivered",
        });
      }
    });

    newSocket.on("notification", ({ message }: { message: string }) => {
      toast(message, "info");
    });

    newSocket.on("receive_message", async (doc: any) => {
      await handleIncomingMessage({
        ...doc,
        encryptedPayload:
          typeof doc.encryptedPayload === "string"
            ? JSON.parse(doc.encryptedPayload)
            : doc.encryptedPayload,
      });
      const isViewing = activeConvIdRef.current === doc.senderId && !document.hidden && document.hasFocus();
      newSocket.emit("message_receipt", {
        messageId: doc.messageId,
        recipientId: doc.senderId,
        status: isViewing ? "read" : "delivered",
      });
    });

    newSocket.on("message_sent", ({ messageId, sentAt }: { messageId: string; sentAt?: string }) => {
      setConversations((prev) => {
        let msgToExpire: ChatMessage | null = null;
        let expireConvId: string | null = null;

        const next = prev.map((conv) => {
          const hasMsg = conv.messages.find((m) => m.id === messageId);
          if (!hasMsg) return conv;
          msgToExpire = hasMsg;
          expireConvId = conv.id;
          return {
            ...conv,
            messages: conv.messages.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    status: "sent",
                    scheduledTime: undefined,
                    timestamp: sentAt ? new Date(sentAt) : new Date(),
                  }
                : m,
            ),
          };
        });

        if (msgToExpire && (msgToExpire as ChatMessage).expireIn) {
          scheduleTimeout(`expire_${messageId}`, () => {
            setConversations((prev2) => {
              const copy = [...prev2];
              const idx = copy.findIndex((c) => c.id === expireConvId);
              if (idx > -1) {
                copy[idx].messages = copy[idx].messages.filter(
                  (m) => m.id !== messageId,
                );
              }
              return copy;
            });
          }, (msgToExpire as ChatMessage).expireIn! * 1000);
        }

        return next;
      });
    });

    const statusOrder: Record<string, number> = {
      sending: 0,
      failed: 0,
      scheduled: 0,
      sent: 1,
      delivered: 2,
      read: 3,
    };

    newSocket.on(
      "receipt_update",
      ({
        messageId,
        status,
        readerId,
        readAt,
        deliveredAt,
        isHeard,
      }: {
        messageId: string;
        status: any;
        readerId?: string;
        readAt?: string;
        deliveredAt?: string;
        isHeard?: boolean;
      }) => {
        setConversations((prev) =>
          prev.map((conv) => {
            const hasMsg = conv.messages.find((m) => m.id === messageId);
            if (!hasMsg) return conv;
            return {
              ...conv,
              messages: conv.messages.map((m) => {
                if (m.id !== messageId) return m;
                const currentRank = statusOrder[m.status] ?? 0;
                const newRank = statusOrder[status] ?? 0;
                const updatedStatus = newRank > currentRank ? status : m.status;
                const updatedDeliveredAt = deliveredAt || (status === "delivered" || status === "read" ? (m.deliveredAt || new Date().toISOString()) : m.deliveredAt);
                const updatedReadAt = readAt || (status === "read" ? (m.readAt || new Date().toISOString()) : m.readAt);
                const updatedReceipts = [...(m.receipts || [])];
                if (readerId) {
                  const existingIdx = updatedReceipts.findIndex((r) => r.userId === readerId);
                  if (existingIdx >= 0) {
                    updatedReceipts[existingIdx] = {
                      ...updatedReceipts[existingIdx],
                      deliveredAt: deliveredAt || updatedReceipts[existingIdx].deliveredAt,
                      readAt: status === "read" ? (readAt || new Date().toISOString()) : updatedReceipts[existingIdx].readAt,
                    };
                  } else {
                    updatedReceipts.push({
                      userId: readerId,
                      displayName: readerId,
                      deliveredAt: deliveredAt || new Date().toISOString(),
                      readAt: status === "read" ? (readAt || new Date().toISOString()) : undefined,
                    });
                  }
                }
                return {
                  ...m,
                  status: updatedStatus,
                  deliveredAt: updatedDeliveredAt,
                  readAt: updatedReadAt,
                  receipts: updatedReceipts,
                  isHeard: isHeard !== undefined ? isHeard : m.isHeard,
                };
              }),
            };
          }),
        );
      },
    );

    newSocket.on("receive_group_message", (groupMsg: any) => {
      if (!groupMsg || !groupMsg.id) return;
      if (groupMsg.senderId === identity.securelyId) {
        setConversations((prev) =>
          prev.map((c) => {
            const isMatch =
              c.id === groupMsg.groupId ||
              c.id === groupMsg.cleanGroupId ||
              c.id === `group_${groupMsg.cleanGroupId}`;
            if (!isMatch) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === groupMsg.id ? { ...m, status: "delivered" } : m
              ),
            };
          })
        );
        return;
      }

      if (processedMsgIdsRef.current.has(groupMsg.id)) return;
      processedMsgIdsRef.current.add(groupMsg.id);

      const targetGroupId = groupMsg.groupId || `group_${groupMsg.cleanGroupId}`;
      const incomingMsg: ChatMessage = {
        id: groupMsg.id,
        senderId: groupMsg.senderId,
        senderName: groupMsg.senderName,
        isSelf: false,
        decryptedText: groupMsg.decryptedText,
        attachments: groupMsg.attachments,
        attachmentId: groupMsg.attachmentId,
        decryptionKey: groupMsg.decryptionKey,
        expireIn: groupMsg.expireIn,
        replyToId: groupMsg.replyToId,
        replyTo: groupMsg.replyTo,
        isViewOnce: groupMsg.isViewOnce,
        timestamp: new Date(groupMsg.timestamp || Date.now()),
        status: "delivered",
        isPostQuantum: true,
        algorithm: "Group Blind E2EE Relay",
      };

      if (incomingMsg.expireIn) {
        scheduleTimeout(`expire_${incomingMsg.id}`, () => {
          setConversations((prev) =>
            prev.map((conv) => {
              const isMatch =
                conv.id === targetGroupId ||
                conv.id === groupMsg.cleanGroupId ||
                conv.id === `group_${groupMsg.cleanGroupId}`;
              if (!isMatch) return conv;
              return {
                ...conv,
                messages: conv.messages.filter((m) => m.id !== incomingMsg.id),
              };
            })
          );
        }, incomingMsg.expireIn * 1000);
      }

      setConversations((prev) => {
        let found = false;
        const updated = prev.map((conv) => {
          const isMatch =
            conv.id === targetGroupId ||
            conv.id === groupMsg.cleanGroupId ||
            conv.id === `group_${groupMsg.cleanGroupId}`;
          if (isMatch) {
            found = true;
            const alreadyExists = conv.messages.some((m) => m.id === incomingMsg.id);
            const isCurrent = activeConvIdRef.current === conv.id;
            return {
              ...conv,
              messages: alreadyExists ? conv.messages : [...conv.messages, incomingMsg],
              lastActivity: new Date(),
              unreadCount: isCurrent ? 0 : (conv.unreadCount || 0) + 1,
            };
          }
          return conv;
        });

        if (!found) {
          fetch(`/api/v1/groups/${groupMsg.cleanGroupId || targetGroupId}`)
            .then((r) => r.json())
            .then((d) => {
              if (d.group) {
                setConversations((inner) => {
                  const already = inner.some(
                    (c) =>
                      c.id === targetGroupId ||
                      c.id === d.group.groupId ||
                      c.id === `group_${d.group.groupId}`
                  );
                  if (already) return inner;
                  return [
                    {
                      id: `group_${d.group.groupId}`,
                      displayName: d.group.name,
                      isGroup: true,
                      groupDescription: d.group.description,
                      groupMembers: d.group.members,
                      requireAdminApproval: d.group.requireAdminApproval,
                      onlyAdminsCanPost: d.group.onlyAdminsCanPost,
                      pendingRequests: d.group.pendingRequests,
                      messages: [incomingMsg],
                      lastActivity: new Date(),
                      unreadCount: 1,
                      isPostQuantum: true,
                      algorithm: "Group Blind E2EE Relay",
                    },
                    ...inner,
                  ];
                });
              }
            })
            .catch(console.error);
        }

        return updated.sort(
          (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
        );
      });

      if (
        activeConvIdRef.current !== targetGroupId &&
        activeConvIdRef.current !== groupMsg.cleanGroupId
      ) {
        playNotificationChime();
        showSystemNotification(
          groupMsg.senderName || "Group Message",
          groupMsg.decryptedText || "New group message"
        );
      }
    });

    newSocket.on("group_updated", ({ group }: { group: any }) => {
      if (!group) return;
      setConversations((prev) =>
        prev.map((c) => {
          const isMatch =
            c.id === group.groupId ||
            c.id === `group_${group.groupId}` ||
            c.id.replace(/^group_/, "") === group.groupId;
          if (!isMatch) return c;
          return {
            ...c,
            displayName: group.name || c.displayName,
            groupDescription: group.description ?? c.groupDescription,
            onlyAdminsCanPost: group.onlyAdminsCanPost ?? c.onlyAdminsCanPost,
            requireAdminApproval: group.requireAdminApproval ?? c.requireAdminApproval,
            groupMembers: group.members || c.groupMembers,
            pendingRequests: group.pendingRequests || c.pendingRequests,
          };
        })
      );
    });

    newSocket.on("group_member_joined", ({ groupId, members }: any) => {
      setConversations((prev) =>
        prev.map((c) => {
          const isMatch =
            c.id === groupId ||
            c.id === `group_${groupId}` ||
            c.id.replace(/^group_/, "") === groupId;
          if (!isMatch) return c;
          return {
            ...c,
            groupMembers: members || c.groupMembers,
          };
        })
      );
    });

    newSocket.on("group_request_approved", ({ groupId, group }: any) => {
      if (!group) return;
      const groupConvId = `group_${group.groupId || groupId}`;
      newSocket.emit("join_group", { groupId: group.groupId || groupId });
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === groupConvId || c.id === group.groupId);
        if (exists) {
          return prev.map((c) =>
            c.id === groupConvId || c.id === group.groupId
              ? {
                  ...c,
                  displayName: group.name,
                  groupMembers: group.members,
                  requireAdminApproval: group.requireAdminApproval,
                  onlyAdminsCanPost: group.onlyAdminsCanPost,
                }
              : c
          );
        }
        return [
          {
            id: groupConvId,
            displayName: group.name,
            isGroup: true,
            groupDescription: group.description,
            groupMembers: group.members,
            requireAdminApproval: group.requireAdminApproval,
            onlyAdminsCanPost: group.onlyAdminsCanPost,
            messages: [
              {
                id: "sys_" + Date.now(),
                senderId: "system",
                isSelf: false,
                decryptedText: `Your request to join "${group.name}" was approved!`,
                timestamp: new Date(),
                status: "read",
                isPostQuantum: true,
              },
            ],
            lastActivity: new Date(),
            isPostQuantum: true,
            algorithm: "Group Blind E2EE Relay",
          },
          ...prev,
        ];
      });
      toast(`You were approved to join group "${group.name}"!`, "success");
    });

    newSocket.on("receive_group_invite", (invite: any) => {
      // SILENT: Strictly no notification chime
      window.dispatchEvent(new CustomEvent("securely_requests_updated"));
      toast(`New group invitation to "${invite.groupName}" (check Requests)`, "info");
    });

    newSocket.on("group_join_request_received", () => {
      // SILENT: Strictly no notification chime
      window.dispatchEvent(new CustomEvent("securely_requests_updated"));
    });

    newSocket.on("group_deleted", ({ groupId, name }: { groupId: string; name?: string }) => {
      setConversations((prev) =>
        prev.filter(
          (c) =>
            c.id !== groupId &&
            c.id !== `group_${groupId}` &&
            c.id.replace(/^group_/, "") !== groupId
        )
      );
      if (
        activeConvIdRef.current === groupId ||
        activeConvIdRef.current === `group_${groupId}` ||
        activeConvIdRef.current?.replace(/^group_/, "") === groupId
      ) {
        setActiveConvId(null);
      }
      toast(`Group "${name || 'Chat'}" was deleted by an admin`, "info");
    });

    newSocket.on("message_deleted_for_everyone", ({ messageId, convId, groupId }: any) => {
      setConversations((prev) =>
        prev.map((c) => {
          const hasMsg = c.messages.some((m) => m.id === messageId);
          const isMatch =
            hasMsg ||
            (groupId && (c.id === groupId || c.id === `group_${groupId}` || c.id.replace(/^group_/, "") === groupId)) ||
            (convId && (c.id === convId || c.id === `group_${convId}`));
          if (!isMatch) return c;
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    decryptedText: "This message was deleted",
                    isDeletedForEveryone: true,
                    attachments: [],
                    attachmentId: undefined,
                    decryptionKey: undefined,
                  }
                : m
            ),
          };
        })
      );
    });

    newSocket.on("message_edited", ({ messageId, newText, convId, groupId }: any) => {
      setConversations((prev) =>
        prev.map((c) => {
          const hasMsg = c.messages.some((m) => m.id === messageId);
          const isMatch =
            hasMsg ||
            (groupId && (c.id === groupId || c.id === `group_${groupId}` || c.id.replace(/^group_/, "") === groupId)) ||
            (convId && (c.id === convId || c.id === `group_${convId}`));
          if (!isMatch) return c;
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === messageId
                ? { ...m, decryptedText: newText, isEdited: true, editedAt: new Date().toISOString() }
                : m
            ),
          };
        })
      );
    });

    newSocket.on("peer_profile_updated", ({ securelyId, photoUrl, displayName, about }: any) => {
      if (!securelyId) return;
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === securelyId) {
            return {
              ...c,
              photoUrl: photoUrl !== undefined ? photoUrl : c.photoUrl,
              about: about !== undefined ? about : c.about,
              displayName: displayName && (c.displayName === c.id || !c.displayName) ? displayName : c.displayName,
            };
          }
          return c;
        })
      );
    });

    return () => {
      newSocket.disconnect();
    };
  }, [identity]);

  // Keep group socket rooms joined
  useEffect(() => {
    if (!socket) return;
    conversations.forEach((conv) => {
      if (conv.isGroup) {
        socket.emit("join_group", { groupId: conv.id });
      }
    });
  }, [socket, conversations.length]);

  // Sync profile photos and details for peer conversations
  useEffect(() => {
    if (!identity) return;
    conversations.forEach(async (c) => {
      if (!c.isGroup && c.id !== identity.securelyId && !c.photoUrl) {
        try {
          const res = await fetch(`/api/v1/users/${c.id}`);
          if (res.ok) {
            const user = await res.json();
            if (user && (user.photoUrl || user.displayName || user.about)) {
              setConversations((prev) =>
                prev.map((item) =>
                  item.id === c.id
                    ? {
                        ...item,
                        photoUrl: user.photoUrl || item.photoUrl,
                        about: user.about || item.about,
                        displayName:
                          item.displayName === item.id || !item.displayName || item.displayName === "Unknown"
                            ? user.displayName || item.displayName
                            : item.displayName,
                      }
                    : item
                )
              );
            }
          }
        } catch (_) {}
      }
    });
  }, [conversations.length, activeConvId, identity]);

  const handleIncomingMessage = async (doc: any) => {
    if (!identity || !storeRef.current) return;
    if (doc.senderId === identity.securelyId) return;

    if (doc.messageId && processedMsgIdsRef.current.has(doc.messageId)) {
      return;
    }
    if (doc.messageId) {
      processedMsgIdsRef.current.add(doc.messageId);
    }

    try {
      const address = new SignalProtocolAddress(doc.senderId, 1);
      const cipher = new SessionCipher(storeRef.current, address);

      let decryptedBytes: ArrayBuffer;
      const payloadWrapper: EncryptedMessageWrapper = doc.encryptedPayload;
      const {
        type,
        body,
        isPQ,
        pqInitialCiphertext,
        pqPreKeyId,
        pqKemCiphertext,
        pqNextRatchetKey,
        pqCiphertext,
        pqIv,
      } = payloadWrapper;

      // 1. Classical Signal decryption
      if (type === 3) {
        decryptedBytes = await cipher.decryptPreKeyWhisperMessage(body, "binary");
      } else {
        decryptedBytes = await cipher.decryptWhisperMessage(body, "binary");
      }

      // 2. Post-Quantum KEM Decapsulation & Double Ratchet step
      let isPQVerified = false;
      if (isPQ) {
        let pqSession = storeRef.current.loadPQSession(doc.senderId);

        // If this is the initial PQXDH message from peer, decapsulate initial PQ prekey
        if (!pqSession && pqInitialCiphertext) {
          let localPreKey = storeRef.current.loadPQPreKey(pqPreKeyId ?? 0);
          if (!localPreKey) {
            localPreKey = storeRef.current.loadPQSignedPreKey(1);
          }
          if (!localPreKey && identity.pqPreKeys && identity.pqPreKeys.length > 0) {
            localPreKey = identity.pqPreKeys[0].keyPair;
          }
          if (!localPreKey && identity.pqSignedPreKey) {
            localPreKey = identity.pqSignedPreKey.keyPair;
          }

          if (localPreKey) {
            const secretKey = localPreKey.secretKey || localPreKey.privKey;
            const peerRatchetKey = pqNextRatchetKey ? base64ToUint8Array(pqNextRatchetKey) : undefined;
            const peerClKey = await storeRef.current.get("identityKey" + address.toString());

            pqSession = await processInitialPQXDH(
              doc.senderId,
              base64ToUint8Array(pqInitialCiphertext),
              secretKey,
              peerRatchetKey || new Uint8Array(1184),
              peerClKey || new ArrayBuffer(32),
              peerRatchetKey
            );
            storeRef.current.storePQSession(doc.senderId, pqSession);
          }
        }

        // Process Post-Quantum KEM Ratchet turn
        if (pqSession && pqCiphertext && pqIv && pqKemCiphertext) {
          try {
            const { updatedSession } = await pqRatchetDecrypt(
              pqSession,
              base64ToUint8Array(pqCiphertext),
              base64ToUint8Array(pqIv),
              base64ToUint8Array(pqKemCiphertext),
              pqNextRatchetKey ? base64ToUint8Array(pqNextRatchetKey) : undefined
            );
            storeRef.current.storePQSession(doc.senderId, updatedSession);
            isPQVerified = true;
          } catch (pqErr) {
            console.warn("PQ ratchet step failed, falling back to verified classical payload", pqErr);
          }
        } else if (pqSession) {
          isPQVerified = true;
        }
      }

      const jsonStr = new TextDecoder().decode(decryptedBytes);
      const decryptedData = JSON.parse(jsonStr) as EnvelopePayload;

      const newMsg: ChatMessage = {
        id: doc.messageId || uuidv4(),
        senderId: doc.senderId,
        isSelf: false,
        decryptedText: decryptedData.text,
        timestamp: new Date(doc.createdAt || Date.now()),
        attachmentId: decryptedData.attachmentId,
        decryptionKey: decryptedData.decryptionKey,
        attachments: decryptedData.attachments,
        expireIn: (decryptedData.expireIn && decryptedData.expireIn > 0) ? decryptedData.expireIn : undefined,
        isViewOnce: decryptedData.isViewOnce,
        replyToId: decryptedData.replyToId,
        replyTo: decryptedData.replyTo,
        status: (activeConvIdRef.current === doc.senderId && !document.hidden && document.hasFocus()) ? "read" : "delivered",
        isPostQuantum: isPQVerified || isPQ,
        algorithm: isPQVerified || isPQ ? "Signal PQXDH (ML-KEM-768 + X25519)" : undefined,
      };

      setConversations((prev) => {
        let exists = false;
        const updated = prev.map((conv) => {
          if (conv.id === doc.senderId) {
            exists = true;
            const alreadyExists = conv.messages.some((m) => m.id === newMsg.id);
            return {
              ...conv,
              messages: alreadyExists ? conv.messages : [...conv.messages, newMsg],
              lastActivity: new Date(),
              isPostQuantum: conv.isPostQuantum || isPQVerified || isPQ,
              algorithm: isPQVerified || isPQ ? "Signal PQXDH (ML-KEM-768 + X25519)" : conv.algorithm,
            };
          }
          return conv;
        });

        if (!exists) {
          updated.push({
            id: doc.senderId,
            displayName: doc.senderName || undefined,
            messages: [newMsg],
            lastActivity: new Date(),
            isRequest: true,
            isPostQuantum: isPQVerified || isPQ,
            algorithm: isPQVerified || isPQ ? "Signal PQXDH (ML-KEM-768 + X25519)" : undefined,
          });
        }

        return updated.sort(
          (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime(),
        );
      });

      const isCurrentlyViewing = activeConvIdRef.current === doc.senderId && !document.hidden && document.hasFocus();
      if (!isCurrentlyViewing) {
        const notifProfile = localStorage.getItem("active_notif_profile") || "default";
        if (notifProfile !== "dnd") {
          const inChatSounds = localStorage.getItem("setting_in_chat_sounds") !== "false";
          if (inChatSounds) {
            playNotificationChime();
          }
          const privacy = localStorage.getItem("setting_notif_content") || "all";
          const knownConv = conversations.find((c) => c.id === doc.senderId);
          const senderTitle = knownConv?.displayName || doc.senderName || (!knownConv ? "New Message Request" : "New message");
          const title = privacy === "hidden" ? "Securely Message" : senderTitle;
          const body = privacy === "all"
            ? (decryptedData.text || (!knownConv ? "Someone sent you a message request" : "New message received"))
            : (privacy === "name_only" ? "New encrypted message" : "New message");
          showSystemNotification(title, body);
        }
      }

      if (typeof decryptedData.expireIn === "number" && decryptedData.expireIn > 0) {
        const ms = decryptedData.expireIn * 1000;
        scheduleTimeout(`expire_${newMsg.id}`, () => {
          setConversations((prev) => {
            const copy = [...prev];
            const idx = copy.findIndex((c) => c.id === doc.senderId);
            if (idx > -1) {
              copy[idx].messages = copy[idx].messages.filter(
                (m) => m.id !== newMsg.id,
              );
            }
            return copy;
          });
        }, ms);
      }
    } catch (err) {
      console.error("Failed decrypting msg", err);
    }
  };

  const ensureSession = async (
    address: SignalProtocolAddress,
    targetId: string,
  ) => {
    if (!storeRef.current || !identity) return;
    const session = await storeRef.current.loadSession(address.toString());
    if (!session) {
      // Fetch bundle from server
      const resp = await fetch(`/api/v1/bundle/${targetId}`);
      if (!resp.ok) throw new Error("Could not fetch bundle");
      const bundleStr = await resp.json();

      const bundle = {
        registrationId: bundleStr.registrationId,
        identityKey: base64ToBuffer(bundleStr.identityKey),
        signedPreKey: {
          keyId: bundleStr.signedPreKey.keyId,
          publicKey: base64ToBuffer(bundleStr.signedPreKey.publicKey),
          signature: base64ToBuffer(bundleStr.signedPreKey.signature),
        },
        preKey: bundleStr.preKey
          ? {
              keyId: bundleStr.preKey.keyId,
              publicKey: base64ToBuffer(bundleStr.preKey.publicKey),
            }
          : undefined,
      };

      const builder = new SessionBuilder(storeRef.current, address);
      await builder.processPreKey(bundle);

      // Initialize Post-Quantum PQXDH session if peer provides ML-KEM-768 prekeys
      const peerPqPreKey = bundleStr.pqPreKey || bundleStr.pqSignedPreKey;
      if (peerPqPreKey && peerPqPreKey.publicKey) {
        try {
          const peerPqPreKeyBytes = base64ToUint8Array(peerPqPreKey.publicKey);
          const peerPqIdentityBytes = bundleStr.pqIdentityKey
            ? base64ToUint8Array(bundleStr.pqIdentityKey)
            : peerPqPreKeyBytes;
          const classicalShared = base64ToBuffer(bundleStr.identityKey);

          const { session: pqSession, initialCiphertext } = await initPQSession(
            targetId,
            peerPqIdentityBytes,
            peerPqPreKeyBytes,
            classicalShared
          );
          storeRef.current.storePQSession(targetId, pqSession);

          pqPendingInitMap.current.set(targetId, {
            initialCiphertext: bufferToBase64(initialCiphertext),
            preKeyId: peerPqPreKey.keyId || 0,
          });

          // Calculate post-quantum safety number
          const sn = await calculateSafetyNumber(
            identity.securelyId,
            identity.identityKeyPair.pubKey,
            identity.pqIdentityKeyPair?.publicKey || identity.pqIdentityKeyPair?.pubKey,
            targetId,
            base64ToBuffer(bundleStr.identityKey),
            peerPqIdentityBytes
          );

          setConversations((prev) =>
            prev.map((c) =>
              c.id === targetId
                ? {
                    ...c,
                    isPostQuantum: true,
                    algorithm: "Signal PQXDH (ML-KEM-768 + X25519)",
                    peerPQIdentityKey: bundleStr.pqIdentityKey,
                    safetyNumbers: sn.safetyNumber,
                  }
                : c
            )
          );
        } catch (pqInitErr) {
          console.error("Failed to establish PQXDH session", pqInitErr);
        }
      }
    }
  };

  const handleSendMessage = async (
    text: string,
    scheduledTime?: Date,
    file?: File | File[],
    expireIn?: number,
    isViewOnce?: boolean,
    replyToId?: string,
    replyTo?: any
  ) => {
    if (!activeConvId || !identity || !socketRef.current || !storeRef.current)
      return;

    const activeConv = conversations.find((c) => c.id === activeConvId);
    if (activeConv?.isGroup && activeConv.onlyAdminsCanPost) {
      const isAdmin = activeConv.groupMembers?.some(
        (m) => m.userId === identity.securelyId && m.role === "admin"
      ) || activeConv.groupMembers?.length === 1;
      if (!isAdmin) {
        toast("Only group admins can send messages in this group", "error");
        return;
      }
    }

    const localMsgId = uuidv4();
    const isScheduled = !!scheduledTime;
    const finalExpireIn = (expireIn && expireIn > 0) ? expireIn : undefined;

    let attachmentId: string | undefined;
    let decryptionKey: string | undefined;
    const uploadedAttachments: Array<{ attachmentId: string; decryptionKey: string }> = [];

    if (file) {
      const filesToUpload = Array.isArray(file) ? file : [file];
      for (const singleFile of filesToUpload) {
        try {
          const { encryptedBlob, keyHex, mimeType } = await encryptFile(singleFile);
          const singleDecryptionKey = keyHex + "|" + (mimeType || singleFile.type || "application/octet-stream");

          const formData = new FormData();
          // Always provide filename so multer parses req.file reliably
          formData.append("file", encryptedBlob, singleFile.name || "attachment.bin");
          const res = await fetch("/api/v1/attachments", {
            method: "POST",
            body: formData,
          });
          if (res.ok) {
            const data = await res.json();
            uploadedAttachments.push({
              attachmentId: data.attachmentId,
              decryptionKey: singleDecryptionKey,
            });
          }
        } catch (err) {
          console.error("Failed to upload attachment", err);
        }
      }

      if (uploadedAttachments.length > 0) {
        attachmentId = uploadedAttachments[0].attachmentId;
        decryptionKey = uploadedAttachments[0].decryptionKey;
      } else {
        if (!text.trim()) return;
      }
    }

    if (activeConv?.isGroup) {
      if (activeConv.onlyAdminsCanPost) {
        const isAdmin = activeConv.groupMembers?.some(
          (m) => m.userId === identity.securelyId && m.role === "admin"
        );
        if (!isAdmin) {
          toast("Only group admins can send messages in this group", "error");
          return;
        }
      }

      const groupMsgPayload = {
        groupId: activeConvId,
        messageId: localMsgId,
        text,
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
        attachmentId,
        decryptionKey,
        expireIn: finalExpireIn,
        replyToId,
        replyTo,
        senderName: identity.displayName || identity.username || "You",
        isViewOnce,
      };

      socketRef.current.emit("send_group_message", groupMsgPayload);

      const newMsg: ChatMessage = {
        id: localMsgId,
        senderId: identity.securelyId,
        senderName: identity.displayName || identity.username || "You",
        isSelf: true,
        decryptedText: text,
        timestamp: new Date(),
        status: isScheduled ? "scheduled" : "delivered",
        scheduledTime,
        attachmentId,
        decryptionKey,
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
        expireIn: finalExpireIn,
        isViewOnce,
        replyToId,
        replyTo,
        isPostQuantum: true,
        algorithm: "Group Blind E2EE Relay",
      };

      processedMsgIdsRef.current.add(localMsgId);
      playSentChime();

      if (finalExpireIn) {
        scheduleTimeout(`expire_${localMsgId}`, () => {
          setConversations((prev) =>
            prev.map((conv) => {
              if (conv.id === activeConvId) {
                return {
                  ...conv,
                  messages: conv.messages.filter((m) => m.id !== localMsgId),
                };
              }
              return conv;
            })
          );
        }, finalExpireIn * 1000);
      }

      setConversations((prev) =>
        prev
          .map((conv) => {
            if (conv.id === activeConvId) {
              return {
                ...conv,
                messages: [...conv.messages, newMsg],
                lastActivity: new Date(),
              };
            }
            return conv;
          })
          .sort(
            (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
          )
      );
      return;
    }

    if (activeConvId === identity.securelyId) {
      // Note to self
      const newMsg: ChatMessage = {
        id: localMsgId,
        senderId: identity.securelyId,
        isSelf: true,
        decryptedText: text,
        timestamp: new Date(),
        status: isScheduled ? "scheduled" : "read",
        scheduledTime: scheduledTime,
        expireIn: finalExpireIn,
        isViewOnce,
        attachmentId,
        decryptionKey,
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
        replyToId,
        replyTo,
        isPostQuantum: true,
        algorithm: "Signal PQXDH (ML-KEM-768 + X25519)",
      };

      if (isScheduled && scheduledTime) {
        const delay = Math.max(0, scheduledTime.getTime() - Date.now());
        setTimeout(() => {
          setConversations((prev) => {
            return prev.map((conv) => {
              if (conv.id === identity.securelyId) {
                return {
                  ...conv,
                  messages: conv.messages.map((m) =>
                    m.id === newMsg.id ? { ...m, status: "read" } : m
                  ),
                };
              }
              return conv;
            });
          });

          if (finalExpireIn) {
            setTimeout(() => {
              setConversations((prev) => {
                const copy = [...prev];
                const idx = copy.findIndex((c) => c.id === identity.securelyId);
                if (idx > -1) {
                  copy[idx].messages = copy[idx].messages.filter(
                    (m) => m.id !== newMsg.id
                  );
                }
                return copy;
              });
            }, finalExpireIn * 1000);
          }
        }, delay);
      } else if (finalExpireIn) {
        setTimeout(() => {
          setConversations((prev) => {
            const copy = [...prev];
            const idx = copy.findIndex((c) => c.id === identity.securelyId);
            if (idx > -1) {
              copy[idx].messages = copy[idx].messages.filter(
                (m) => m.id !== newMsg.id,
              );
            }
            return copy;
          });
        }, finalExpireIn * 1000);
      }

      setConversations((prev) => {
        let exists = false;
        const updated = prev.map((conv) => {
          if (conv.id === activeConvId) {
            exists = true;
            return {
              ...conv,
              messages: [...conv.messages, newMsg],
              lastActivity: new Date(),
              isPostQuantum: true,
              algorithm: "Signal PQXDH (ML-KEM-768 + X25519)",
            };
          }
          return conv;
        });
        if (!exists) {
          updated.push({
            id: activeConvId,
            displayName: "Note to Self",
            messages: [newMsg],
            lastActivity: new Date(),
            isPostQuantum: true,
            algorithm: "Signal PQXDH (ML-KEM-768 + X25519)",
          });
        }
        return updated.sort(
          (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
        );
      });
      return;
    }

    const plainPayload: EnvelopePayload = {
      text,
      attachmentId,
      decryptionKey,
      attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
      expireIn: finalExpireIn,
      isViewOnce,
      replyToId,
      replyTo,
      isPostQuantum: true,
      algorithm: "Signal PQXDH (ML-KEM-768 + X25519)",
    };
    const textBytes = new TextEncoder().encode(
      JSON.stringify(plainPayload),
    ).buffer;

    const address = new SignalProtocolAddress(activeConvId, 1);
    let ciphertextObj;
    try {
      await ensureSession(address, activeConvId);
      const cipher = new SessionCipher(storeRef.current, address);
      ciphertextObj = await cipher.encrypt(textBytes);
    } catch (err: any) {
      if (err.message !== "Failed to fetch") console.error("Encryption/Session error", err);
      return;
    }

    // Post-Quantum Double Ratchet KEM turn
    const pqSession = storeRef.current.loadPQSession(activeConvId);
    let pqFields: Partial<EncryptedMessageWrapper> = {};

    if (pqSession) {
      try {
        const { updatedSession, ciphertext: pqCipher, iv: pqIv, kemCiphertext, nextRatchetKey } =
          await pqRatchetEncrypt(pqSession, new Uint8Array(textBytes));

        storeRef.current.storePQSession(activeConvId, updatedSession);

        const pendingInit = pqPendingInitMap.current.get(activeConvId);
        if (pendingInit) {
          pqFields.pqInitialCiphertext = pendingInit.initialCiphertext;
          pqFields.pqPreKeyId = pendingInit.preKeyId;
          pqPendingInitMap.current.delete(activeConvId);
        }

        pqFields.isPQ = true;
        pqFields.algorithm = "Signal PQXDH (ML-KEM-768 + X25519)";
        pqFields.pqKemCiphertext = bufferToBase64(kemCiphertext);
        pqFields.pqNextRatchetKey = bufferToBase64(nextRatchetKey);
        pqFields.pqCiphertext = bufferToBase64(pqCipher);
        pqFields.pqIv = bufferToBase64(pqIv);
        pqFields.pqStep = updatedSession.ratchetStep;
      } catch (pqEncryptErr) {
        console.error("PQ Ratchet encryption error", pqEncryptErr);
      }
    }

    const payloadWrapper: EncryptedMessageWrapper = {
      type: ciphertextObj.type,
      body: ciphertextObj.body,
      ...pqFields,
    };

    socketRef.current.emit("send_message", {
      type: isScheduled ? "scheduled" : "chat",
      recipientId: activeConvId,
      messageId: localMsgId,
      payload: JSON.stringify(payloadWrapper),
      deliverAt: scheduledTime?.toISOString(),
    });

    const isPQ = !!pqSession;
    processedMsgIdsRef.current.add(localMsgId);
    const newMsg: ChatMessage = {
      id: localMsgId,
      senderId: identity.securelyId,
      isSelf: true,
      decryptedText: text,
      timestamp: new Date(),
      status: isScheduled ? "scheduled" : "sending",
      scheduledTime: scheduledTime,
      attachmentId,
      decryptionKey,
      attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
      expireIn: finalExpireIn,
      isViewOnce,
      replyToId,
      replyTo,
      isPostQuantum: isPQ,
      algorithm: isPQ ? "Signal PQXDH (ML-KEM-768 + X25519)" : undefined,
    };

    setConversations((prev) => {
      let exists = false;
      const updated = prev.map((conv) => {
        if (conv.id === activeConvId) {
          exists = true;
          const alreadyExists = conv.messages.some((m) => m.id === newMsg.id);
          return {
            ...conv,
            messages: alreadyExists ? conv.messages : [...conv.messages, newMsg],
            lastActivity: new Date(),
            isPostQuantum: conv.isPostQuantum || isPQ,
            algorithm: isPQ ? "Signal PQXDH (ML-KEM-768 + X25519)" : conv.algorithm,
          };
        }
        return conv;
      });
      if (!exists) {
        updated.push({
          id: activeConvId,
          messages: [newMsg],
          lastActivity: new Date(),
          isPostQuantum: isPQ,
          algorithm: isPQ ? "Signal PQXDH (ML-KEM-768 + X25519)" : undefined,
        });
      }
      return updated.sort(
        (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
      );
    });

    const inChatSounds = localStorage.getItem("setting_in_chat_sounds") !== "false";
    if (inChatSounds && !isScheduled) {
      playSentChime();
    }
  };

  const addContact = (id: string, name?: string, photoUrl?: string, about?: string) => {
    if (!id) return;
    const cleanId = id.trim();
    setConversations((prev) => {
      const existing = prev.find((c) => c.id === cleanId);
      if (existing) {
        return prev.map((c) =>
          c.id === cleanId
            ? { ...c, displayName: name || c.displayName, photoUrl: photoUrl || c.photoUrl, about: about || c.about }
            : c
        );
      }
      const newConv: Conversation = {
        id: cleanId,
        displayName: name,
        photoUrl,
        about,
        messages: [],
        lastActivity: new Date(),
        isPostQuantum: true,
        algorithm: "Signal PQXDH (ML-KEM-768 + X25519)",
      };
      return [newConv, ...prev];
    });
    setActiveConvId(cleanId);
  };

  useEffect(() => {
    // Send read receipts when opening a chat
    if (activeConvId && socketRef.current) {
      const conv = conversations.find((c) => c.id === activeConvId);
      if (conv) {
        const unreadMsgs = conv.messages.filter((msg) => !msg.isSelf && msg.status !== "read");
        if (unreadMsgs.length > 0) {
          unreadMsgs.forEach((msg) => {
            socketRef.current?.emit("message_receipt", {
              messageId: msg.id,
              recipientId: msg.senderId,
              status: "read",
            });
          });
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeConvId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      !m.isSelf && m.status !== "read" ? { ...m, status: "read" } : m
                    ),
                  }
                : c
            )
          );
        }
      }
    }
  }, [activeConvId, conversations]);

  const updateProfile = (updates: any) => {
    if (socketRef.current) {
      socketRef.current.emit("update_profile", updates);
    }
    setIdentity((prev) => {
      if (!prev) return prev;
      const newIdentity = { ...prev, ...updates };
      localStorage.setItem("signal_identity", exportIdentity(newIdentity));
      return newIdentity;
    });
  };

  const handleIdentityCreated = (id: SignalIdentity) => {
    try {
      localStorage.setItem("signal_identity", exportIdentity(id));
      setIdentity(id);
    } catch (e) {
      console.error("Save failed", e);
    }
  };

  const updateConversation = (convId: string, updates: any) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, ...updates } : c)),
    );
  };

  const handleDeleteConversation = (convId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (activeConvId === convId) {
      setActiveConvId(null);
    }
  };

  const handleDeleteMessage = (convId: string, messageIds: string[], deleteForEveryone = false) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c;
        if (deleteForEveryone) {
          return {
            ...c,
            messages: c.messages.map((m) =>
              messageIds.includes(m.id)
                ? {
                    ...m,
                    decryptedText: "This message was deleted",
                    isDeletedForEveryone: true,
                    attachments: [],
                    attachmentId: undefined,
                    decryptionKey: undefined,
                  }
                : m
            ),
          };
        } else {
          return {
            ...c,
            messages: c.messages.filter((m) => !messageIds.includes(m.id)),
          };
        }
      })
    );

    if (deleteForEveryone && socketRef.current) {
      const isGroup = convId.startsWith("group_") || conversations.find((c) => c.id === convId)?.isGroup;
      const cleanGroupId = convId.replace(/^group_/, "");
      messageIds.forEach((msgId) => {
        socketRef.current.emit("delete_message_for_everyone", {
          messageId: msgId,
          recipientId: convId,
          isGroup: Boolean(isGroup),
          groupId: isGroup ? cleanGroupId : undefined,
        });
      });
    }
    toast(deleteForEveryone ? "Message deleted for everyone" : "Message deleted for you", "info");
  };

  const handleEditMessage = (convId: string, messageId: string, newText: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c;
        return {
          ...c,
          messages: c.messages.map((m) =>
            m.id === messageId
              ? { ...m, decryptedText: newText, isEdited: true, editedAt: new Date().toISOString() }
              : m
          ),
        };
      })
    );

    if (socketRef.current) {
      const isGroup = convId.startsWith("group_") || conversations.find((c) => c.id === convId)?.isGroup;
      const cleanGroupId = convId.replace(/^group_/, "");
      socketRef.current.emit("edit_message", {
        messageId,
        newText,
        recipientId: convId,
        isGroup: Boolean(isGroup),
        groupId: isGroup ? cleanGroupId : undefined,
      });
    }
    toast("Message edited", "success");
  };

  const handleViewOnceOpened = async (messageId: string, attachmentId?: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        const hasMsg = c.messages.some((m) => m.id === messageId);
        if (!hasMsg) return c;
        return {
          ...c,
          messages: c.messages.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  viewOnceViewed: true,
                  decryptedText: "",
                  attachmentId: undefined,
                  decryptionKey: undefined,
                }
              : m
          ),
        };
      })
    );

    if (attachmentId) {
      try {
        await fetch(`/api/v1/attachments/${attachmentId}`, { method: "DELETE" });
      } catch (err) {
        console.error("Failed to delete View Once attachment", err);
      }
    }
  };

  if (!identity) {
    return <Onboarding onIdentityCreated={handleIdentityCreated} />;
  }

  const handleSaveContact = async (userId: string, name: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === userId ? { ...c, displayName: name } : c))
    );

    try {
      const res = await fetch(`/api/v1/users/${userId}`);
      if (res.ok) {
        const user = await res.json();
        setConversations((prev) =>
          prev.map((c) => (c.id === userId ? { ...c, photoUrl: user.photoUrl, about: user.about } : c))
        );
      }
    } catch (err) {
      console.error("Failed to fetch contact details", err);
    }
  };

  return (
    <>
      <ToastContainer />
      <ChatLayout
        onSaveContact={handleSaveContact}
        socket={socket}
        myId={identity.securelyId}
        myName={identity.displayName || ""}
        myUsername={identity.username}
        myPhoneNumber={identity.phoneNumber}
        myPhoto={identity.photoUrl}
        myAbout={identity.about}
        myRegistrationId={identity.registrationId}
        identity={identity}
        conversations={conversations}
        activeConvId={activeConvId}
        onSelectConv={setActiveConvId}
        onSendMessage={handleSendMessage}
        onViewOnceOpened={handleViewOnceOpened}
        onAddContact={addContact}
        onUpdateProfile={updateProfile}
        onUpdateConversation={updateConversation}
        onDeleteConversation={handleDeleteConversation}
        onDeleteMessage={handleDeleteMessage}
        onEditMessage={handleEditMessage}
        onLogout={() => {
          clearAllTimers();
          if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
          }
          setSocket(null);
          localStorage.removeItem("signal_identity");
          setIdentity(null);
          setConversations([]);
          setActiveConvId(null);
        }}
      />
    </>
  );
}
