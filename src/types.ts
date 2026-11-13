export type PQKeyPair = {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
};

export type PQPreKey = {
  keyId: number;
  keyPair: PQKeyPair;
};

export type PQSignedPreKey = {
  keyId: number;
  keyPair: PQKeyPair;
  signature?: string;
};

export type PQSessionState = {
  peerId: string;
  isPostQuantum: boolean;
  algorithm: string;
  rootKey: string; // base64
  localPqPrivateKey: string; // base64 current private key for receiving
  localPqPublicKey: string; // base64 current public key
  peerPqPublicKey: string; // base64 latest peer public key for encapsulating
  ratchetStep: number;
  createdAt: number;
  lastRatchetAt: number;
};

export type GroupMember = {
  userId: string;
  displayName: string;
  role: "admin" | "member";
  photoUrl?: string;
  joinedAt: string;
};

export type Conversation = {
  id: string; // Other user's securelyId or groupId
  displayName?: string;
  username?: string;
  phoneNumber?: string;
  photoUrl?: string;
  about?: string;
  messages: ChatMessage[];
  lastActivity: Date;
  disappearDelay?: number; // per-chat setting
  isPostQuantum?: boolean;
  algorithm?: string;
  peerPQIdentityKey?: string;
  safetyNumbers?: string;
  // Group & Archive features
  isGroup?: boolean;
  groupDescription?: string;
  groupMembers?: GroupMember[];
  groupAdminApproval?: boolean;
  requireAdminApproval?: boolean;
  onlyAdminsCanPost?: boolean;
  pendingRequests?: Array<{ userId: string; displayName: string; photoUrl?: string; requestedAt: string; }>;
  groupInviteLink?: string;
  isArchived?: boolean;
  isPinned?: boolean;
  unreadCount?: number;
  isRequest?: boolean;
};

export type Story = {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  type: "text" | "image" | "video";
  content: string; // text, image url / data url, or video url / data url
  caption?: string;
  bgGradient?: string;
  privacyType?: "contacts" | "selected";
  allowedUserIds?: string[];
  viewers?: Array<{ userId: string; displayName: string; viewedAt: string }>;
  createdAt: string | Date;
  expiresAt: string | Date;
};

export type GroupInviteRequestItem = {
  id: string;
  groupId: string;
  groupName: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
};

export type AdminPendingApproval = {
  groupId: string;
  groupName: string;
  user: {
    userId: string;
    displayName: string;
    photoUrl?: string;
    requestedAt: string;
  };
};

export type MessageReceiptInfo = {
  userId: string;
  displayName?: string;
  deliveredAt?: string;
  readAt?: string;
};

export type ChatMessage = {
  id: string; // UUID
  senderId: string;
  senderName?: string;
  isSelf: boolean;
  decryptedText: string;
  timestamp: Date;
  attachmentId?: string; // If there is an attachment
  decryptionKey?: string;
  attachments?: Array<{ attachmentId: string; decryptionKey: string }>; // For multiple attachments / WhatsApp-style gallery
  replyToId?: string;
  replyTo?: {
    text: string;
    senderName: string;
    senderId?: string;
    isSelf: boolean;
  }; // AES key for attachment
  expireIn?: number; // Disappearing messages
  isViewOnce?: boolean;
  viewOnceViewed?: boolean;
  scheduledTime?: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'scheduled';
  isPostQuantum?: boolean;
  algorithm?: string;
  deliveredAt?: string;
  readAt?: string;
  receipts?: MessageReceiptInfo[];
  isHeard?: boolean;
  heardAt?: string;
  isEdited?: boolean;
  editedAt?: string;
  isDeletedForEveryone?: boolean;
};

export type EnvelopePayload = {
  text: string;
  replyToId?: string;
  expireIn?: number;
  isViewOnce?: boolean;
  attachmentId?: string;
  decryptionKey?: string;
  attachments?: Array<{ attachmentId: string; decryptionKey: string }>;
  replyTo?: {
    text: string;
    senderName: string;
    senderId?: string;
    isSelf: boolean;
  };
  isPostQuantum?: boolean;
  algorithm?: string;
};

export type EncryptedMessageWrapper = {
  type: number; // 1 | 3 from libsignal
  body: string; // libsignal ciphertext
  // Post-quantum metadata & KEM ratchet fields
  isPQ?: boolean;
  algorithm?: string;
  pqInitialCiphertext?: string; // base64 ML-KEM ciphertext for initial PQXDH key exchange
  pqPreKeyId?: number;
  pqKemCiphertext?: string; // base64 ML-KEM ciphertext for ratchet turn
  pqNextRatchetKey?: string; // base64 next ML-KEM public key for ratchet turn
  pqStep?: number;
  pqCiphertext?: string; // base64 AES-GCM ciphertext of payload using hybrid PQ key
  pqIv?: string; // base64 IV for AES-GCM
};

export type CallType = "incoming" | "outgoing" | "missed" | "rejected";

export type CallLog = {
  id: string;
  userId: string;
  displayName?: string;
  photoUrl?: string;
  type: CallType;
  timestamp: string; // ISO string
  isVideo: boolean;
  duration?: number; // seconds
};
