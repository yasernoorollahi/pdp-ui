import type {
  ChatActivityItem,
  ChatContextCard,
  ChatDashboardData,
  ChatMessage,
  ChatPromptSuggestion,
  SendChatMessagePayload,
} from '../features/chat/types/chat.types';
import { chatService } from './chat.service';

const clampText = (value: string, maxLength: number) => {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength).trimEnd()}...`;
};

const toTimestamp = (value: string) => {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

export const formatChatRelativeTime = (isoDate: string) => {
  const timestamp = toTimestamp(isoDate);
  if (!timestamp) return 'Moments ago';

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes <= 0) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestamp));
};

const buildSuggestions = (messages: ChatMessage[]): ChatPromptSuggestion[] => {
  const lastUserMessage = [...messages].reverse().find((message) => message.sender === 'USER');

  const leadSuggestion: ChatPromptSuggestion = lastUserMessage
    ? {
        id: 'continue-thread',
        title: 'Continue the thread',
        prompt: 'Continue from my last message and tell me the single most important next step.',
        description: 'Keeps the conversation focused and context-aware.',
      }
    : {
        id: 'warm-start',
        title: 'Warm start',
        prompt: 'Summarize the strongest signals you can infer from my recent PDP activity.',
        description: 'A clean first prompt for a brand new thread.',
      };

  return [
    leadSuggestion,
    {
      id: 'signal-summary',
      title: 'Signal summary',
      prompt: 'Review my latest signals and explain what patterns matter most right now.',
      description: 'Best for a concise high-level snapshot.',
    },
    {
      id: 'action-plan',
      title: 'Action plan',
      prompt: 'Turn my recent context into a short, practical action plan for this week.',
      description: 'Useful when you want recommendations instead of raw analysis.',
    },
    {
      id: 'risk-scan',
      title: 'Risk scan',
      prompt: 'Point out anything risky, inconsistent, or worth double-checking in my latest signals.',
      description: 'Great for catching friction or blind spots early.',
    },
  ];
};

const buildActivityItem = (message: ChatMessage, index: number): ChatActivityItem => {
  const signalDecision = message.signalDecision?.toUpperCase() ?? null;
  const processingStatus = message.processingStatus?.toUpperCase() ?? null;
  const isUserMessage = message.sender === 'USER';

  let title = isUserMessage ? 'Prompt entered secure relay' : 'Assistant response mirrored';
  let tone: ChatActivityItem['tone'] = isUserMessage ? 'teal' : 'emerald';

  if (message.status === 'failed') {
    title = 'Delivery needs retry';
    tone = 'red';
  } else if (isUserMessage && signalDecision === 'USEFUL' && processingStatus === 'DONE') {
    title = 'Signal promoted into context';
    tone = 'emerald';
  } else if (isUserMessage && signalDecision === 'USEFUL') {
    title = 'Signal queued for enrichment';
    tone = 'gold';
  } else if (isUserMessage && signalDecision === 'IGNORE') {
    title = 'Prompt held in chat lane';
  }

  return {
    id: `activity-${message.id}-${index}`,
    title,
    detail: clampText(message.text, 96),
    timeLabel: formatChatRelativeTime(message.createdAt),
    tone,
  };
};

const buildFallbackActivity = (): ChatActivityItem[] => [
  {
    id: 'idle-relay',
    title: 'Relay is ready',
    detail: 'Your secure chat channel is online and waiting for the first prompt.',
    timeLabel: 'Live',
    tone: 'teal',
  },
  {
    id: 'routing-idle',
    title: 'Signal routing is idle',
    detail: 'Useful prompts will appear here once the conversation starts.',
    timeLabel: 'Standby',
    tone: 'gold',
  },
  {
    id: 'memory-idle',
    title: 'Conversation memory is empty',
    detail: 'Start chatting to seed context cards and richer thread insights.',
    timeLabel: 'Waiting',
    tone: 'emerald',
  },
];

const buildContextCards = (
  messages: ChatMessage[],
  usefulSignals: number,
  queuedSignals: number,
  failedUserMessages: number,
): ChatContextCard[] => {
  const lastMessage = messages[messages.length - 1];

  return [
    {
      id: 'relay-status',
      label: 'Secure relay',
      value: failedUserMessages > 0 ? 'Attention' : 'Stable',
      detail:
        failedUserMessages > 0
          ? 'One or more prompts need another send attempt.'
          : 'Transport and delivery look healthy across the thread.',
      tone: failedUserMessages > 0 ? 'red' : 'emerald',
    },
    {
      id: 'signal-routing',
      label: 'Signal routing',
      value: usefulSignals > 0 ? `${usefulSignals} approved` : 'Idle',
      detail:
        queuedSignals > 0
          ? `${queuedSignals} prompt${queuedSignals > 1 ? 's are' : ' is'} still moving through the pipeline.`
          : 'Useful prompts are ready to enrich downstream context.',
      tone: queuedSignals > 0 ? 'gold' : usefulSignals > 0 ? 'teal' : 'gold',
    },
    {
      id: 'memory-lane',
      label: 'Conversation memory',
      value: lastMessage ? clampText(lastMessage.text, 28) : 'Awaiting first prompt',
      detail: lastMessage
        ? `${lastMessage.sender === 'SYSTEM' ? 'Latest assistant reply' : 'Latest user prompt'} ${formatChatRelativeTime(lastMessage.createdAt)}.`
        : 'Start a thread to seed the secure memory rail.',
      tone: lastMessage ? 'teal' : 'gold',
    },
  ];
};

export const buildChatDashboardData = (messages: ChatMessage[]): ChatDashboardData => {
  const sortedMessages = [...messages].sort(
    (left, right) => toTimestamp(left.createdAt) - toTimestamp(right.createdAt),
  );

  const userMessages = sortedMessages.filter((message) => message.sender === 'USER');
  const systemMessages = sortedMessages.filter((message) => message.sender === 'SYSTEM');
  const sentUserMessages = userMessages.filter((message) => message.status === 'sent').length;
  const failedUserMessages = userMessages.filter((message) => message.status === 'failed').length;
  const usefulSignals = userMessages.filter(
    (message) => message.signalDecision?.toUpperCase() === 'USEFUL',
  ).length;
  const queuedSignals = userMessages.filter(
    (message) =>
      message.signalDecision?.toUpperCase() === 'USEFUL' &&
      message.processingStatus?.toUpperCase() !== 'DONE',
  ).length;
  const deliveryRate =
    userMessages.length > 0 ? Math.round((sentUserMessages / userMessages.length) * 100) : 100;
  const assistantCoverage =
    userMessages.length > 0 ? Math.round((systemMessages.length / userMessages.length) * 100) : 0;
  const lastMessage = sortedMessages[sortedMessages.length - 1];

  return {
    messages: sortedMessages,
    metrics: [
      {
        id: 'thread-depth',
        label: 'Thread Depth',
        value: String(sortedMessages.length),
        change:
          userMessages.length > 0
            ? `${userMessages.length} prompt${userMessages.length > 1 ? 's' : ''} captured`
            : 'No prompts yet',
        up: sortedMessages.length > 0 ? true : null,
        variant: 'teal',
      },
      {
        id: 'assistant-coverage',
        label: 'Assistant Coverage',
        value: `${assistantCoverage}%`,
        change:
          systemMessages.length > 0
            ? `${systemMessages.length} assistant repl${systemMessages.length > 1 ? 'ies' : 'y'}`
            : 'Awaiting first reply',
        up: systemMessages.length > 0 ? true : null,
        variant: systemMessages.length > 0 ? 'emerald' : 'gold',
      },
      {
        id: 'delivery-health',
        label: 'Delivery Health',
        value: `${deliveryRate}%`,
        change:
          failedUserMessages > 0
            ? `${failedUserMessages} delivery issue${failedUserMessages > 1 ? 's' : ''}`
            : 'Relay stable',
        up: failedUserMessages > 0 ? false : userMessages.length > 0 ? true : null,
        variant: failedUserMessages > 0 ? 'red' : 'emerald',
      },
      {
        id: 'signal-queue',
        label: 'Signal Queue',
        value: queuedSignals > 0 ? String(queuedSignals) : 'Live',
        change: queuedSignals > 0
          ? 'Signal pipeline processing'
          : lastMessage
            ? `Last activity ${formatChatRelativeTime(lastMessage.createdAt)}`
            : 'Ready for orchestration',
        up: queuedSignals > 0 ? null : sortedMessages.length > 0 ? true : null,
        variant: queuedSignals > 0 ? 'gold' : 'teal',
      },
    ],
    activity:
      sortedMessages.length > 0
        ? sortedMessages.slice(-4).reverse().map(buildActivityItem)
        : buildFallbackActivity(),
    suggestions: buildSuggestions(sortedMessages),
    contextCards: buildContextCards(
      sortedMessages,
      usefulSignals,
      queuedSignals,
      failedUserMessages,
    ),
  };
};

export const chatDashboardService = {
  async getDashboardData(): Promise<ChatDashboardData> {
    const messages = await chatService.getMessages();
    return buildChatDashboardData(messages);
  },

  async sendMessage(payload: SendChatMessagePayload): Promise<ChatMessage> {
    return chatService.sendMessage(payload);
  },

  buildDashboardData(messages: ChatMessage[]) {
    return buildChatDashboardData(messages);
  },
};
