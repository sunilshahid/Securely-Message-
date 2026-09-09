export type Conversation = {
  id: string; // Other user's securelyId
  displayName?: string;
  photoUrl?: string;
  about?: string;
  messages: ChatMessage[];
  lastActivity: Date;
  disappearDelay?: number; // per-chat setting
};

export type ChatMessage = {
  id: string; // UUID
  senderId: string;
  isSelf: boolean;
  decryptedText: string;
  timestamp: Date;
  attachmentId?: string; // If there is an attachment
  decryptionKey?: string;
  replyToId?: string;
  replyTo?: {
    text: string;
    senderName: string;
    isSelf: boolean;
  }; // AES key for attachment
  expireIn?: number; // Disappearing messages
  isViewOnce?: boolean;
  viewOnceViewed?: boolean;
  scheduledTime?: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'scheduled';
};


export type EnvelopePayload = {
  text: string;
  replyToId?: string;
  expireIn?: number;
  isViewOnce?: boolean;
  attachmentId?: string;
  decryptionKey?: string;
  replyTo?: {
    text: string;
    senderName: string;
    isSelf: boolean;
  };
};
