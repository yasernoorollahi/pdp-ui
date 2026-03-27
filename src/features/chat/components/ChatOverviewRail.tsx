import { Badge, GlassPanel } from '../../../components/ui';
import type {
  ChatContextCard,
  ChatPromptSuggestion,
  ChatTone,
} from '../types/chat.types';
import styles from './ChatOverviewRail.module.css';

interface ChatOverviewRailProps {
  statusLabel: string;
  statusTone: ChatTone;
  subtitle: string;
  contextCards: ChatContextCard[];
  suggestions: ChatPromptSuggestion[];
  onSelectSuggestion: (prompt: string) => void;
}

const toneToBadgeVariant = (tone: ChatTone) => {
  if (tone === 'red') return 'red';
  if (tone === 'gold') return 'gold';
  if (tone === 'emerald') return 'emerald';
  if (tone === 'muted') return 'muted';
  return 'teal';
};

export const ChatOverviewRail = ({
  statusLabel,
  statusTone,
  subtitle,
  contextCards,
  suggestions,
  onSelectSuggestion,
}: ChatOverviewRailProps) => (
  <div className={styles.rail}>
    <GlassPanel className={styles.contextPanel}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.panelEyebrow}>Thread Health</p>
          <h3 className={styles.panelTitle}>Secure conversation deck</h3>
        </div>
        <Badge
          variant={toneToBadgeVariant(statusTone)}
          pulseDot={statusTone !== 'red'}
          className={styles.statusBadge}
        >
          {statusLabel}
        </Badge>
      </div>

      <p className={styles.panelDescription}>{subtitle}</p>

      <div className={styles.contextGrid}>
        {contextCards.map((card) => (
          <article key={card.id} className={`${styles.contextCard} ${styles[card.tone]}`}>
            <span className={styles.contextLabel}>{card.label}</span>
            <strong className={styles.contextValue}>{card.value}</strong>
            <p className={styles.contextDetail}>{card.detail}</p>
          </article>
        ))}
      </div>
    </GlassPanel>

    <GlassPanel className={styles.suggestionPanel}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.panelEyebrow}>Prompt Shortcuts</p>
          <h3 className={styles.panelTitle}>Fast ways to start</h3>
        </div>
      </div>

      <div className={styles.suggestionList}>
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.id}
            type="button"
            className={styles.suggestionButton}
            onClick={() => onSelectSuggestion(suggestion.prompt)}
          >
            <span className={styles.suggestionTitle}>{suggestion.title}</span>
            <span className={styles.suggestionDescription}>{suggestion.description}</span>
          </button>
        ))}
      </div>
    </GlassPanel>
  </div>
);
