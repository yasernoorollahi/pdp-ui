import type { ChatPromptSuggestion } from '../types/chat.types';
import styles from './ChatStatePanel.module.css';

interface ChatStatePanelProps {
  title: string;
  description: string;
  variant: 'empty' | 'error';
  actionLabel?: string;
  onAction?: () => void;
  suggestions?: ChatPromptSuggestion[];
  onSelectSuggestion?: (prompt: string) => void;
}

export const ChatStatePanel = ({
  title,
  description,
  variant,
  actionLabel,
  onAction,
  suggestions,
  onSelectSuggestion,
}: ChatStatePanelProps) => (
  <section className={`${styles.statePanel} ${styles[variant]}`}>
    <div className={styles.iconWrap} aria-hidden="true">
      {variant === 'error' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5" />
          <circle cx="12" cy="16.5" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
          <path d="M8 10h8" />
          <path d="M8 14h5" />
        </svg>
      )}
    </div>

    <div className={styles.content}>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>

      {actionLabel && onAction ? (
        <button type="button" className={styles.primaryAction} onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}

      {variant === 'empty' && suggestions?.length && onSelectSuggestion ? (
        <div className={styles.suggestionList}>
          {suggestions.slice(0, 3).map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              className={styles.suggestionButton}
              onClick={() => onSelectSuggestion(suggestion.prompt)}
            >
              {suggestion.title}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  </section>
);
