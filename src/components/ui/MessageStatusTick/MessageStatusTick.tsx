import styles from './MessageStatusTick.module.css';

type MessageStatus = 'sending' | 'sent' | 'failed';

interface MessageStatusTickProps {
  status: MessageStatus;
  className?: string;
}

export const MessageStatusTick = ({ status, className }: MessageStatusTickProps) => {
  if (status === 'sending') {
    return <span className={`${styles.dot} ${styles.sending} ${className ?? ''}`} aria-label="Sending message" />;
  }

  if (status === 'failed') {
    return <span className={`${styles.dot} ${styles.failed} ${className ?? ''}`} aria-label="Message failed" />;
  }

  return (
    <span className={`${styles.tick} ${className ?? ''}`} aria-label="Message sent">
      <svg viewBox="0 0 12 12" fill="none">
        <path d="M2 6.5L4.6 9L10 3.5" />
      </svg>
    </span>
  );
};
