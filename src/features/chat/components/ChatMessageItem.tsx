import { Badge, MessageStatusTick } from '../../../components/ui';
import type { ChatMessage } from '../types/chat.types';
import styles from './ChatMessageItem.module.css';

interface ChatMessageItemProps {
  message: ChatMessage;
}

const formatTime = (isoDate: string) => {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return '--:--';
  }

  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const ChatMessageItem = ({ message }: ChatMessageItemProps) => {
  const isUserMessage = message.sender === 'USER';
  const signalDecision = message.signalDecision?.toUpperCase() ?? null;
  const processingStatus = message.processingStatus?.toUpperCase() ?? null;
  const showProcessingStatus = isUserMessage && message.status === 'sent';

  const processingBadge = (() => {
    if (!showProcessingStatus) return null;
    if (signalDecision === 'IGNORE') return null;
    if (signalDecision === 'USEFUL' && processingStatus === 'DONE') {
      return { variant: 'emerald', icon: '✨' };
    }
    return { variant: 'gold', icon: '⏳' };
  })();

  return (
    <article className={`${styles.messageRow} ${isUserMessage ? styles.rowUser : styles.rowSystem}`}>
      <div className={`${styles.messageBubble} ${isUserMessage ? styles.bubbleUser : styles.bubbleSystem}`}>
        <p className={styles.messageText}>{message.text}</p>
        <div className={styles.metaRow}>
          <span className={styles.messageTime}>{formatTime(message.createdAt)}</span>
          {isUserMessage ? <MessageStatusTick status={message.status} /> : null}
          {processingBadge ? (
            <Badge variant={processingBadge.variant} className={styles.processingBadge}>
              <span className={styles.processingIcon} aria-hidden="true">
                {processingBadge.icon}
              </span>
            </Badge>
          ) : null}
        </div>
      </div>
    </article>
  );
};
