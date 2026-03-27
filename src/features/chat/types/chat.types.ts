export type ChatMessageSender = 'USER' | 'SYSTEM';
export type ChatMessageStatus = 'sending' | 'sent' | 'failed';
export type ChatTone = 'teal' | 'emerald' | 'gold' | 'red' | 'muted';

export interface ChatMessage {
  id: string;
  text: string;
  sender: ChatMessageSender;
  createdAt: string;
  status: ChatMessageStatus;
  signalDecision?: string | null;
  processingStatus?: string | null;
}

export interface SendChatMessagePayload {
  text: string;
}

export interface ChatDashboardMetric {
  id: 'thread-depth' | 'assistant-coverage' | 'delivery-health' | 'signal-queue';
  label: string;
  value: string;
  change: string;
  up: boolean | null;
  variant: Exclude<ChatTone, 'muted'>;
}

export interface ChatActivityItem {
  id: string;
  title: string;
  detail: string;
  timeLabel: string;
  tone: Exclude<ChatTone, 'muted'>;
}

export interface ChatPromptSuggestion {
  id: string;
  title: string;
  prompt: string;
  description: string;
}

export interface ChatContextCard {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: Exclude<ChatTone, 'muted'>;
}

export interface ChatDashboardData {
  messages: ChatMessage[];
  metrics: ChatDashboardMetric[];
  activity: ChatActivityItem[];
  suggestions: ChatPromptSuggestion[];
  contextCards: ChatContextCard[];
}
