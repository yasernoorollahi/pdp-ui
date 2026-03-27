import type { KeyboardEvent } from 'react';
import { Button, Textarea } from '../../../components/ui';
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
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  };

  return (
    <div className={styles.composer}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Secure Compose</p>
          <h3 className={styles.title}>Shape the next prompt</h3>
        </div>
        <span className={styles.statusLabel}>{sending ? 'Sending...' : 'Ready'}</span>
      </div>

      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Ask for a summary, an action plan, or a signal breakdown..."
        disabled={disabled || sending}
        className={styles.messageInput}
        rows={3}
      />

      <div className={styles.footer}>
        <p className={styles.hint}>Press Enter to send. Use Shift+Enter for a new line.</p>
        <div className={styles.actions}>
          <Button
            type="button"
            variant="ghost"
            className={styles.clearButton}
            onClick={() => onChange('')}
            disabled={disabled || sending || !value.trim()}
          >
            Clear
          </Button>
          <Button
            type="button"
            variant="teal"
            className={styles.sendButton}
            onClick={onSend}
            disabled={disabled || sending || !value.trim()}
            loading={sending}
          >
            Send Message
          </Button>
        </div>
      </div>
    </div>
  );
};
