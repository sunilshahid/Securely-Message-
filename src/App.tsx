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
  importIdentity,
  exportIdentity,
  encryptFile,
  decryptFile,
} from "./crypto";
import { SignalProtocolStore } from "./signalStore";
import { Conversation, ChatMessage, EnvelopePayload } from "./types";
import { ToastContainer, toast } from "./components/Toast";
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

  useEffect(() => {
    if (identity) {
      const storageKey = `signal_conversations_${identity.securelyId}`;
      const local = localStorage.getItem(storageKey);
      if (local) {
        try {
          const parsed = JSON.parse(local);
          const loadedConvs = parsed.map((c: any) => ({
            ...c,
            messages: c.messages.map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp),
              scheduledTime: m.scheduledTime ? new Date(m.scheduledTime) : undefined,
            })),
          }));
          setConversations(loadedConvs);
          
          // Re-arm timeouts for loaded messages
          loadedConvs.forEach((conv: Conversation) => {
            conv.messages.forEach((msg: ChatMessage) => {
              if (conv.id === identity.securelyId && msg.status === "scheduled" && msg.scheduledTime) {
                const delay = Math.max(0, msg.scheduledTime.getTime() - Date.now());
                setTimeout(() => {
                  setConversations((prev) => prev.map(c => 
                    c.id === conv.id 
                      ? { ...c, messages: c.messages.map(m => m.id === msg.id ? { ...m, status: "read" } : m) }
                      : c
                  ));
                  if (msg.expireIn) {
                    setTimeout(() => {
                      setConversations((prev) => prev.map(c =>
                        c.id === conv.id ? { ...c, messages: c.messages.filter(m => m.id !== msg.id) } : c
                      ));
                    }, msg.expireIn * 1000);
                  }
                }, delay);
              } else if (msg.expireIn && (msg.status === "sent" || msg.status === "read" || msg.status === "delivered")) {
                const expireTime = msg.timestamp.getTime() + msg.expireIn * 1000;
                const delay = Math.max(0, expireTime - Date.now());
                setTimeout(() => {
                  setConversations((prev) => prev.map(c =>
                    c.id === conv.id ? { ...c, messages: c.messages.filter(m => m.id !== msg.id) } : c
                  ));
                }, delay);
              }
            });
          });
        } catch (e) {
          console.error("Failed to parse conversations", e);
        }
      }
    }
  }, [identity?.securelyId]); // Load when we have the securelyId

  useEffect(() => {
    if (identity && conversations.length > 0) {
      localStorage.setItem(`signal_conversations_${identity.securelyId}`, JSON.stringify(conversations));
    }
  }, [conversations, identity?.securelyId]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const storeRef = useRef<SignalProtocolStore | null>(null);

  // Auto-connect to backend websocket after identity is generated
  useEffect(() => {
    if (!identity) return;

    // Initialize custom store
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
        discoverable: true, // Configurable later
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
      });
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
      }
    });

    newSocket.on("notification", ({ message }: { message: string }) => {
      toast(message, "info"); // simple notification
    });

    newSocket.on("receive_message", async (doc: any) => {
      await handleIncomingMessage({
        ...doc,
        encryptedPayload:
          typeof doc.encryptedPayload === "string"
            ? JSON.parse(doc.encryptedPayload)
            : doc.encryptedPayload,
      });
      newSocket.emit("message_receipt", {
        messageId: doc.messageId,
        recipientId: doc.senderId,
        status: "delivered",
      });
    });

    newSocket.on("message_sent", ({ messageId }: { messageId: string }) => {
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
              m.id === messageId ? { ...m, status: "sent" } : m,
            ),
          };
        });
        
        if (msgToExpire && msgToExpire.expireIn) {
          setTimeout(() => {
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
          }, msgToExpire.expireIn * 1000);
        }
        
        return next;
      });
    });

    newSocket.on(
      "receipt_update",
      ({ messageId, status }: { messageId: string; status: any }) => {
        setConversations((prev) =>
          prev.map((conv) => {
            const hasMsg = conv.messages.find((m) => m.id === messageId);
            if (!hasMsg) return conv;
            return {
              ...conv,
              messages: conv.messages.map((m) =>
                m.id === messageId ? { ...m, status } : m,
              ),
            };
          }),
        );
      },
    );

    return () => {
      newSocket.disconnect();
    };
  }, [identity]);

  const handleIncomingMessage = async (doc: any) => {
    if (!identity || !storeRef.current) return;
    if (doc.senderId === identity.securelyId) return; // Prevent loopback of own messages
    try {
      const address = new SignalProtocolAddress(doc.senderId, 1);

      const cipher = new SessionCipher(storeRef.current, address);

      let decryptedBytes: ArrayBuffer;
      const { type, body } = doc.encryptedPayload; // Payload is now { type: 1|3, body: string }

      if (type === 3) {
        // PreKeyWhisperMessage
        decryptedBytes = await cipher.decryptPreKeyWhisperMessage(
          body,
          "binary",
        );
      } else {
        // WhisperMessage
        decryptedBytes = await cipher.decryptWhisperMessage(body, "binary");
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
        expireIn: decryptedData.expireIn,
        isViewOnce: decryptedData.isViewOnce,
        status: "delivered",
      };

      setConversations((prev) => {
        let exists = false;
        const updated = prev.map((conv) => {
          if (conv.id === doc.senderId) {
            exists = true;
            return {
              ...conv,
              messages: [...conv.messages, newMsg],
              lastActivity: new Date(),
            };
          }
          return conv;
        });

        if (!exists) {
          updated.push({
            id: doc.senderId,
            messages: [newMsg],
            lastActivity: new Date(),
          });
        }

        return updated.sort(
          (a, b) => b.lastActivity.getTime() - a.lastActivity.getTime(),
        );
      });

      if (typeof decryptedData.expireIn === "number") {
        const ms = decryptedData.expireIn * 1000;
        setTimeout(() => {
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
    if (!storeRef.current) return;
    const session = await storeRef.current.loadSession(address.toString());
    if (!session) {
      // Fetch bundle
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
    }
  };

  const handleSendMessage = async (
    text: string,
    scheduledTime?: Date,
    file?: File,
    expireIn?: number,
    isViewOnce?: boolean,
    replyToId?: string,
    replyTo?: any
  ) => {
    if (!activeConvId || !identity || !socketRef.current || !storeRef.current)
      return;

    const localMsgId = uuidv4();
    const isScheduled = !!scheduledTime;

    let attachmentId: string | undefined;
    let decryptionKey: string | undefined;

    if (file) {
      const { encryptedBlob, keyHex, mimeType } = await encryptFile(file);
      decryptionKey = keyHex + "|" + (mimeType || "application/octet-stream");

      const formData = new FormData();
      formData.append("file", encryptedBlob);
      try {
        const res = await fetch("/api/v1/attachments", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          attachmentId = data.attachmentId;
        }
      } catch (err) {
        console.error("Failed to upload attachment", err);
        return; // Don't send if upload fails
      }
    }

    if (activeConvId === identity.securelyId) {
      // Note to self bypass
      const newMsg: ChatMessage = {
        id: localMsgId,
        senderId: identity.securelyId,
        isSelf: true,
        decryptedText: text,
        timestamp: new Date(),
        status: isScheduled ? "scheduled" : "read",
        scheduledTime: scheduledTime,
        expireIn: expireIn,
        isViewOnce,
        attachmentId,
        decryptionKey,
        replyToId,
        replyTo,
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
          
          if (expireIn) {
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
            }, expireIn * 1000);
          }
        }, delay);
      } else if (expireIn) {
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
        }, expireIn * 1000);
      }

      setConversations((prev) => {
        return prev
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
          .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
      });
      return;
    }

    const plainPayload: EnvelopePayload = {
      text,
      attachmentId,
      decryptionKey,
      expireIn,
      isViewOnce,
      replyToId,
      replyTo,
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
      if (err.message !== 'Failed to fetch') console.error("Encryption/Session error", err);
      return;
    }

    const payloadWrapper = {
      type: ciphertextObj.type,
      body: ciphertextObj.body,
    };

    socketRef.current.emit("send_message", {
      type: isScheduled ? "scheduled" : "chat",
      recipientId: activeConvId,
      messageId: localMsgId,
      payload: JSON.stringify(payloadWrapper),
      deliverAt: scheduledTime?.toISOString(),
    });

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
      expireIn,
      isViewOnce,
      replyToId,
      replyTo,
    };

    setConversations((prev) => {
      return prev
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
        .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
    });
  };

  const addContact = (id: string, name?: string, photoUrl?: string, about?: string) => {
    if (!id) return;
    const cleanId = id.trim();
    setConversations((prev) => {
      const existing = prev.find((c) => c.id === cleanId);
      if (existing) {
        return prev.map((c) => c.id === cleanId ? { ...c, displayName: name || c.displayName, photoUrl: photoUrl || c.photoUrl, about: about || c.about } : c);
      }
      const newConv: Conversation = {
        id: cleanId,
        displayName: name,
        photoUrl,
        about,
        messages: [],
        lastActivity: new Date(),
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
        conv.messages.forEach((msg) => {
          if (!msg.isSelf && msg.status !== "read") {
            socketRef.current!.emit("message_receipt", {
              messageId: msg.id,
              recipientId: msg.senderId,
              status: "read",
            });
            msg.status = "read";
          }
        });
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

  const handleViewOnceOpened = async (messageId: string, attachmentId?: string) => {
    if (!activeConvId) return;
    
    // Update local UI immediately
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConvId) {
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === messageId ? { ...m, viewOnceViewed: true, decryptedText: "", attachmentId: undefined } : m
            ),
          };
        }
        return c;
      })
    );

    // Tell server to delete attachment from disk
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
    // Optimistic update
    setConversations((prev) => 
      prev.map(c => c.id === userId ? { ...c, displayName: name } : c)
    );
    
    // Fetch the user's full profile now that they are a saved contact
    try {
      const res = await fetch(`/api/v1/users/${userId}`);
      if (res.ok) {
        const user = await res.json();
        setConversations((prev) => 
          prev.map(c => c.id === userId ? { ...c, photoUrl: user.photoUrl, about: user.about } : c)
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
      myName={identity.displayName}
      myUsername={identity.username}
      myPhoto={identity.photoUrl}
      myAbout={identity.about}
      conversations={conversations}
      activeConvId={activeConvId}
      onSelectConv={setActiveConvId}
      onSendMessage={handleSendMessage}
      onViewOnceOpened={handleViewOnceOpened}
      onAddContact={addContact}
      onUpdateProfile={updateProfile}
      onUpdateConversation={updateConversation}
      onLogout={() => {
        localStorage.removeItem("signal_identity");
        setIdentity(null);
        setConversations([]);
        setActiveConvId(null);
      }}
    />
    </>
  );
}
