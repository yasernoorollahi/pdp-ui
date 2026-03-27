import { useEffect, useMemo, useState } from 'react';
import { chatDashboardService } from '../../../services/chatDashboard.service';
import type {
  ChatDashboardData,
  ChatMessage,
  ChatTone,
} from '../types/chat.types';

const buildOptimisticMessage = (text: string): ChatMessage => ({
  id: `optimistic-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
  text,
  sender: 'USER',
  createdAt: new Date().toISOString(),
  status: 'sending',
  signalDecision: null,
  processingStatus: null,
});

export const useChatDashboard = () => {
  const [dashboard, setDashboard] = useState<ChatDashboardData>(() =>
    chatDashboardService.buildDashboardData([]),
  );
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const messages = dashboard.messages;
  const hasMessages = messages.length > 0;

  const applyMessages = (updater: (current: ChatMessage[]) => ChatMessage[]) => {
    setDashboard((current) => chatDashboardService.buildDashboardData(updater(current.messages)));
  };

  const syncThread = async (mode: 'initial' | 'refresh' = 'refresh') => {
    const isInitialLoad = mode === 'initial';

    if (isInitialLoad) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setLoadError(null);

    try {
      const nextDashboard = await chatDashboardService.getDashboardData();
      setDashboard(nextDashboard);
      setLastSyncedAt(new Date().toISOString());
    } catch {
      setLoadError('Could not sync your secure thread right now. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void syncThread('initial');
  }, []);

  const updateInputValue = (value: string) => {
    setInputValue(value);
    if (sendError) {
      setSendError(null);
    }
  };

  const applySuggestion = (prompt: string) => {
    setInputValue(prompt);
    if (sendError) {
      setSendError(null);
    }
  };

  const sendMessage = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || sending) return;

    const optimisticMessage = buildOptimisticMessage(trimmed);
    setSendError(null);
    setSending(true);
    setInputValue('');
    applyMessages((current) => [...current, optimisticMessage]);

    try {
      const savedMessage = await chatDashboardService.sendMessage({ text: trimmed });
      applyMessages((current) =>
        current.map((message) =>
          message.id === optimisticMessage.id
            ? { ...savedMessage, sender: 'USER', status: 'sent' }
            : message,
        ),
      );
      setLastSyncedAt(new Date().toISOString());
    } catch {
      applyMessages((current) =>
        current.map((message) =>
          message.id === optimisticMessage.id
            ? { ...message, status: 'failed' }
            : message,
        ),
      );
      setSendError('Message was not sent. Please check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  const headerSubtitle = useMemo(() => {
    if (loading) return 'Syncing your secure thread and preparing the glass workspace.';
    if (loadError && !hasMessages) return 'The conversation rail is temporarily unavailable.';
    if (sendError) return 'Your latest prompt needs another delivery attempt.';
    if (refreshing) return 'Refreshing thread insights without interrupting the conversation.';
    if (!hasMessages) return 'Start a private conversation with context-aware signal routing.';
    return `${messages.length} message${messages.length > 1 ? 's' : ''} mirrored in your PDP thread.`;
  }, [hasMessages, loadError, loading, messages.length, refreshing, sendError]);

  const status = useMemo<{ label: string; tone: ChatTone }>(() => {
    if (loadError && !hasMessages) return { label: 'Connection issue', tone: 'red' };
    if (sendError) return { label: 'Retry required', tone: 'red' };
    if (loading || refreshing) return { label: 'Syncing thread', tone: 'gold' };
    if (!hasMessages) return { label: 'Ready for first prompt', tone: 'teal' };
    return { label: 'Secure relay live', tone: 'emerald' };
  }, [hasMessages, loadError, loading, refreshing, sendError]);

  return {
    data: dashboard,
    messages,
    inputValue,
    loading,
    refreshing,
    sending,
    loadError,
    sendError,
    hasMessages,
    headerSubtitle,
    lastSyncedAt,
    status,
    setInputValue: updateInputValue,
    applySuggestion,
    refresh: () => syncThread('refresh'),
    sendMessage,
  };
};
