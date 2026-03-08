export type ChatMessageSender = 'USER' | 'SYSTEM';
export type ChatMessageStatus = 'sending' | 'sent' | 'failed';

export interface ChatMessage {
  id: string;
  text: string;
  sender: ChatMessageSender;
  createdAt: string;
  status: ChatMessageStatus;
}

export interface SendChatMessagePayload {
  text: string;
}
