import api from '../api/axios';
import type { ChatMessage, SendChatMessagePayload } from '../features/chat/types/chat.types';

const USER_MESSAGES_ENDPOINT = '/user-messages';

const generateMessageId = () => `msg-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

type RawMessage = {
  id?: string | number;
  text?: string;
  message?: string;
  content?: string;
  sender?: string;
  createdAt?: string;
  created_at?: string;
  timestamp?: string;
  processed?: boolean;
  status?: string;
};

type MessagesPayload = {
  content?: unknown;
  data?: unknown;
  items?: unknown;
  messages?: unknown;
  totalPages?: unknown;
  total_pages?: unknown;
  pageCount?: unknown;
  page?: unknown;
};

const isRawMessageArray = (value: unknown): value is RawMessage[] =>
  Array.isArray(value);

const extractRawMessages = (payload: unknown): RawMessage[] => {
  if (isRawMessageArray(payload)) return payload;

  if (!payload || typeof payload !== 'object') return [];

  const candidate = payload as MessagesPayload;

  if (isRawMessageArray(candidate.content)) return candidate.content;
  if (isRawMessageArray(candidate.items)) return candidate.items;
  if (isRawMessageArray(candidate.messages)) return candidate.messages;

  // Some backends wrap the actual pageable/array response under `data`.
  if (candidate.data) return extractRawMessages(candidate.data);

  return [];
};

const extractTotalPages = (payload: unknown): number | null => {
  if (!payload || typeof payload !== 'object') return null;

  const candidate = payload as MessagesPayload;

  const directTotalPages = [candidate.totalPages, candidate.total_pages, candidate.pageCount]
    .map((value) => Number(value))
    .find((value) => Number.isFinite(value) && value > 0);

  if (directTotalPages) return directTotalPages;

  if (candidate.page && typeof candidate.page === 'object') {
    const nested = extractTotalPages(candidate.page);
    if (nested) return nested;
  }

  if (candidate.data) return extractTotalPages(candidate.data);

  return null;
};

const normalizeMessage = (message: RawMessage, fallbackText = ''): ChatMessage => {
  const normalizedStatus = message.status?.toLowerCase();
  const status: ChatMessage['status'] =
    normalizedStatus === 'sending' || normalizedStatus === 'failed'
      ? normalizedStatus
      : 'sent';

  return {
    id: message.id ? String(message.id) : generateMessageId(),
    text: message.text ?? message.message ?? message.content ?? fallbackText,
    sender: message.sender?.toUpperCase() === 'SYSTEM' ? 'SYSTEM' : 'USER',
    createdAt: message.createdAt ?? message.created_at ?? message.timestamp ?? new Date().toISOString(),
    status,
  };
};

const toTimestamp = (value: string) => {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

export const chatService = {
  async getMessages(): Promise<ChatMessage[]> {
    const pageSize = 200;

    const firstResponse = await api.get(USER_MESSAGES_ENDPOINT, {
      params: {
        page: 0,
        size: pageSize,
        sort: 'createdAt,asc',
      },
    });

    const firstPageMessages = extractRawMessages(firstResponse.data);
    const totalPages = extractTotalPages(firstResponse.data) ?? 1;

    const additionalPageRequests = Array.from(
      { length: Math.max(totalPages - 1, 0) },
      (_, index) =>
        api.get(USER_MESSAGES_ENDPOINT, {
          params: {
            page: index + 1,
            size: pageSize,
            sort: 'createdAt,asc',
          },
        }),
    );

    const additionalResponses = await Promise.all(additionalPageRequests);
    const additionalMessages = additionalResponses.flatMap((response) =>
      extractRawMessages(response.data),
    );

    const rawMessages = [...firstPageMessages, ...additionalMessages];

    const uniqueMessagesMap = new Map<string, ChatMessage>();
    for (const message of rawMessages.map((item) => normalizeMessage(item))) {
      uniqueMessagesMap.set(`${message.id}-${message.createdAt}`, message);
    }
    const uniqueMessages = Array.from(uniqueMessagesMap.values());

    return uniqueMessages.sort((a, b) => toTimestamp(a.createdAt) - toTimestamp(b.createdAt));
  },

  async sendMessage(payload: SendChatMessagePayload): Promise<ChatMessage> {
    const messageDate = new Date().toISOString().slice(0, 10);
    const response = await api.post(USER_MESSAGES_ENDPOINT, {
      content: payload.text,
      messageDate,
    });
    return normalizeMessage(response.data as RawMessage, payload.text);
  },
};
