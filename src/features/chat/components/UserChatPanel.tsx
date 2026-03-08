import { useEffect, useMemo, useState } from 'react';
import { Button, Card } from '../../../components/ui';
import { chatService } from '../../../services/chat.service';
import { ChatComposer } from './ChatComposer';
import { ChatMessageList } from './ChatMessageList';
import { ChatThreadSkeleton } from './ChatThreadSkeleton';
import type { ChatMessage } from '../types/chat.types';
import styles from './UserChatPanel.module.css';

const buildOptimisticMessage = (text: string): ChatMessage => ({
  id: `optimistic-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
  text,
  sender: 'USER',
  createdAt: new Date().toISOString(),
  status: 'sending',
});

export const UserChatPanel = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMessages = messages.length > 0;

  const headerSubtitle = useMemo(() => {
    if (loading) return 'Syncing your thread...';
    if (error) return 'Chat is currently unavailable';
    if (!hasMessages) return 'Start a secure conversation';
    return `${messages.length} message${messages.length > 1 ? 's' : ''}`;
  }, [error, hasMessages, loading, messages.length]);

  const loadMessages = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await chatService.getMessages();
      setMessages(response);
    } catch {
      setError('Could not load messages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMessages();
  }, []);

  const sendMessage = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || sending) return;

    setError(null);
    setSending(true);

    const optimisticMessage = buildOptimisticMessage(trimmed);
    setMessages((current) => [...current, optimisticMessage]);
    setInputValue('');

    try {
      const savedMessage = await chatService.sendMessage({ text: trimmed });
      setMessages((current) =>
        current.map((message) =>
          message.id === optimisticMessage.id
            ? { ...savedMessage, sender: 'USER', status: 'sent' }
            : message,
        ),
      );
    } catch {
      setMessages((current) =>
        current.map((message) =>
          message.id === optimisticMessage.id
            ? { ...message, status: 'failed' }
            : message,
        ),
      );
      setError('Message was not sent. Check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className={styles.chatSection}>
      <header className={styles.chatHeader}>
        <div>
          <h2 className={styles.chatTitle}>User Chat</h2>
          <p className={styles.chatSubtitle}>{headerSubtitle}</p>
        </div>

        <Button
          type="button"
          variant="ghost"
          className={styles.refreshButton}
          onClick={() => void loadMessages()}
          disabled={loading}
        >
          Refresh
        </Button>
      </header>

      <Card className={styles.chatCard} topLine>
        <div className={styles.threadArea}>
          {loading ? <ChatThreadSkeleton /> : null}

          {!loading && error ? (
            <div className={styles.stateWrap}>
              <p className={styles.stateTitle}>Connection Error</p>
              <p className={styles.stateDescription}>{error}</p>
              <Button type="button" variant="teal" onClick={() => void loadMessages()}>
                Retry
              </Button>
            </div>
          ) : null}

          {!loading && !error && !hasMessages ? (
            <div className={styles.stateWrap}>
              <p className={styles.stateTitle}>No Messages Yet</p>
              <p className={styles.stateDescription}>
                Send your first message to start the conversation.
              </p>
            </div>
          ) : null}

          {!loading && !error && hasMessages ? <ChatMessageList messages={messages} /> : null}
        </div>

        <ChatComposer
          value={inputValue}
          onChange={setInputValue}
          onSend={() => void sendMessage()}
          disabled={loading}
          sending={sending}
        />
      </Card>
    </section>
  );
};
