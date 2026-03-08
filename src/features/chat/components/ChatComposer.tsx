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
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="What happened today?"
        disabled={disabled || sending}
        className={styles.messageInput}
      />
      <Button
        type="button"
        variant="teal"
        className={styles.sendButton}
        onClick={onSend}
        disabled={disabled || sending || !value.trim()}
        loading={sending}
      >
        Send
      </Button>
    </div>
  );
};
