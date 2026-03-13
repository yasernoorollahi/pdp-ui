import type { KeyboardEvent } from 'react';
import { Button, Input } from '../../../components/ui';
import styles from './ChatComposer.module.css';

interface ChatComposerProps {
  value: string;
  disabled?: boolean;
  sending?: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
}

export const ChatComposer = ({
  value,
  disabled,
  sending,
  onChange,
  onSend,
}: ChatComposerProps) => {
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  };

  return (
    <div className={styles.composer}>
      <div className={styles.leftActions}>
        <Button
          type="button"
          variant="icon"
          className={styles.actionButton}
          aria-label="Add attachment"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="3" y="3" width="18" height="18" rx="4" />
              <path d="M12 8v8M8 12h8" />
            </svg>
          }
        />
        <Button
          type="button"
          variant="icon"
          className={styles.actionButton}
          aria-label="Open globe"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="12" r="9" />
              <path d="M2.5 12h19M12 2.5c2.8 3 2.8 16 0 19" />
            </svg>
          }
        />
        <Button
          type="button"
          variant="icon"
          className={styles.actionButton}
          aria-label="Add style"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 12c3-4 5-4 8 0s5 4 8 0" />
              <path d="M4 17c3-4 5-4 8 0s5 4 8 0" />
            </svg>
          }
        />
        <Button
          type="button"
          variant="icon"
          className={styles.actionButton}
          aria-label="Open tools"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 3v18M3 12h18" />
              <circle cx="12" cy="12" r="8" />
            </svg>
          }
        />
      </div>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Ask me anything..."
        disabled={disabled || sending}
        className={styles.messageInput}
      />
      <div className={styles.rightActions}>
        <Button
          type="button"
          variant="icon"
          className={styles.actionButton}
          aria-label="Voice input"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          }
        />
        <Button
          type="button"
          variant="icon"
          className={styles.sendButton}
          onClick={onSend}
          disabled={disabled || sending || !value.trim()}
          loading={sending}
          aria-label="Send message"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M4 12l16-8-4 8 4 8-16-8z" />
            </svg>
          }
        />
      </div>
    </div>
  );
};
