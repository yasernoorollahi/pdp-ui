import { Badge } from '../../../components/ui';
import { ChatActivityPanel } from '../components/ChatActivityPanel';
import { ChatComposer } from '../components/ChatComposer';
import { ChatMessageList } from '../components/ChatMessageList';
import { ChatStatePanel } from '../components/ChatStatePanel';
import { ChatThreadSkeleton } from '../components/ChatThreadSkeleton';
import { useChatDashboard } from '../hooks/useChatDashboard';
import styles from './UserChatPage.module.css';

export const UserChatPage = () => {
  const {
    data,
    messages,
    inputValue,
    loading,
    sending,
    loadError,
    sendError,
    hasMessages,
    headerSubtitle,
    setInputValue,
    applySuggestion,
    refresh,
    sendMessage,
  } = useChatDashboard();
  const heroMetrics = data.metrics.filter(
    (metric) => metric.id === 'delivery-health' || metric.id === 'signal-queue',
  );
  const blockingError = Boolean(loadError && !hasMessages && !loading);
  const noticeMessage = sendError ?? (loadError && hasMessages ? loadError : null);

  return (
    <section className={styles.chatPage}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <Badge variant="teal" dot className={styles.heroBadge}>
            Realtime secure thread
          </Badge>
          <h2 className={styles.heroTitle}>PDP AI Conversation Orchestration</h2>
          <p className={styles.heroSubtitle}>
            A space to talk with AI and receive thoughtful feedback on your feelings,
            emotions, and the events shaping your day.
          </p>
        </div>

        <div className={styles.heroMetrics}>
          {heroMetrics.map((metric) => (
            <article key={metric.id} className={styles.heroMetricCard}>
              <span className={styles.heroMetricLabel}>{metric.label}</span>
              <strong className={styles.heroMetricValue}>{metric.value}</strong>
              <span className={styles.heroMetricChange}>
                {metric.up === true ? '↑ ' : metric.up === false ? '↓ ' : ''}
                {metric.change}
              </span>
            </article>
          ))}
        </div>
      </header>

      <div className={styles.chatLayout}>
        <div className={styles.mainColumn}>
          <section className={styles.threadPanel}>
            <header className={styles.threadHeader}>
              <div>
                <p className={styles.threadEyebrow}>Conversation Deck</p>
                <h3 className={styles.threadTitle}>
                  {hasMessages ? 'Private conversation thread' : 'Ready for your first prompt'}
                </h3>
                <p className={styles.threadSubtitle}>{headerSubtitle}</p>
              </div>
            </header>

            {noticeMessage ? (
              <div
                className={`${styles.noticeBanner} ${sendError ? styles.noticeError : styles.noticeWarning}`}
              >
                <p className={styles.noticeText}>{noticeMessage}</p>
                {loadError ? (
                  <button type="button" className={styles.noticeAction} onClick={() => void refresh()}>
                    Retry sync
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className={styles.threadSurface}>
              {loading ? <ChatThreadSkeleton /> : null}

              {!loading && blockingError ? (
                <ChatStatePanel
                  variant="error"
                  title="Secure thread unavailable"
                  description="We couldn't load your messages right now. Retry the sync to restore the conversation workspace."
                  actionLabel="Retry sync"
                  onAction={() => void refresh()}
                />
              ) : null}

              {!loading && !blockingError && !hasMessages ? (
                <ChatStatePanel
                  variant="empty"
                  title="No messages yet"
                  description="Use one of the starter prompts or type a custom message to kick off your private PDP conversation."
                  suggestions={data.suggestions}
                  onSelectSuggestion={applySuggestion}
                />
              ) : null}

              {!loading && hasMessages ? <ChatMessageList messages={messages} /> : null}
            </div>

            <div className={styles.composerSlot}>
              <ChatComposer
                value={inputValue}
                onChange={setInputValue}
                onSend={() => void sendMessage()}
                disabled={loading || blockingError}
                sending={sending}
              />
            </div>
          </section>

          <ChatActivityPanel activity={data.activity} />
        </div>
      </div>
    </section>
  );
};
