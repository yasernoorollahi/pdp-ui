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
  const signalBadge: { variant: 'emerald' | 'gold' | 'muted'; label: string } | null =
    signalDecision === 'USEFUL'
      ? { variant: 'emerald', label: 'Useful signal' }
      : signalDecision === 'IGNORE'
        ? { variant: 'muted', label: 'Chat lane' }
        : signalDecision
          ? { variant: 'gold', label: signalDecision.toLowerCase().replace(/_/g, ' ') }
          : null;
  const processingBadge: { variant: 'emerald' | 'gold' | 'red'; label: string } | null =
    processingStatus === 'DONE'
      ? { variant: 'emerald', label: 'Processed' }
      : processingStatus
        ? {
            variant: processingStatus === 'FAILED' ? 'red' : 'gold',
            label: processingStatus.toLowerCase().replace(/_/g, ' '),
          }
        : null;

  return (
    <article className={`${styles.messageRow} ${isUserMessage ? styles.rowUser : styles.rowSystem}`}>
      <div className={`${styles.messageBubble} ${isUserMessage ? styles.bubbleUser : styles.bubbleSystem}`}>
        <div className={styles.headerRow}>
          <span className={styles.senderTag}>{isUserMessage ? 'You' : 'PDP Assistant'}</span>
          <div className={styles.metaInline}>
            <span className={styles.messageTime}>{formatTime(message.createdAt)}</span>
            {isUserMessage ? <MessageStatusTick status={message.status} /> : null}
          </div>
        </div>

        <p className={styles.messageText}>{message.text}</p>

        <div className={styles.metaRow}>
          {signalBadge ? (
            <Badge variant={signalBadge.variant} className={styles.stateBadge}>
              {signalBadge.label}
            </Badge>
          ) : null}
          {processingBadge ? (
            <Badge variant={processingBadge.variant} className={styles.stateBadge}>
              {processingBadge.label}
            </Badge>
          ) : null}
        </div>
      </div>
    </article>
  );
};
