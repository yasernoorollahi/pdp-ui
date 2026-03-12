import { Card, Button, Skeleton } from '../../../components/ui';
import type { InsightSummary, TrendPoint } from '../../../services/insights.service';
import { SIGNAL_COLORS, formatShortDate } from '../utils/signalUtils';
import styles from './NewReflectionCard.module.css';

type NewReflectionCardProps = {
  data: InsightSummary | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  trends: {
    energy: TrendPoint[];
    motivation: TrendPoint[];
    social: TrendPoint[];
    discipline: TrendPoint[];
  };
};

const trendDirection = (trend: TrendPoint[]) => {
  if (trend.length < 2) return 'stable';
  const first = trend[0].value;
  const last = trend[trend.length - 1].value;
  const delta = last - first;
  if (Math.abs(delta) < 0.05) return 'stable';
  return delta > 0 ? 'rising' : 'falling';
};

const peakDay = (trend: TrendPoint[]) => {
  if (trend.length === 0) return '';
  const peak = trend.reduce((max, point) => (point.value > max.value ? point : max), trend[0]);
  return formatShortDate(peak.date);
};

export const NewReflectionCard = ({ data, loading, error, onRetry, trends }: NewReflectionCardProps) => {
  if (loading) {
    return (
      <Card className={`${styles.card} glassCard`}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Weekly Reflection</p>
            <h3 className={styles.title}>Signal narrative</h3>
          </div>
        </div>
        <Skeleton count={3} className={styles.skeletonRow} />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`${styles.card} glassCard`}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Weekly Reflection</p>
            <h3 className={styles.title}>Signal narrative</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>We couldn’t load the reflection.</p>
          <p className={styles.stateHint}>{error}</p>
          <Button variant="teal" onClick={onRetry}>Try again</Button>
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className={`${styles.card} glassCard`}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Weekly Reflection</p>
            <h3 className={styles.title}>Signal narrative</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>No reflection yet.</p>
          <p className={styles.stateHint}>We’ll summarize once signals are steady.</p>
        </div>
      </Card>
    );
  }

  const cards = [
    {
      label: 'Energy',
      description: data.energy,
      trend: trendDirection(trends.energy),
      peak: peakDay(trends.energy),
      color: SIGNAL_COLORS.energy,
    },
    {
      label: 'Motivation',
      description: data.motivation,
      trend: trendDirection(trends.motivation),
      peak: peakDay(trends.motivation),
      color: SIGNAL_COLORS.motivation,
    },
    {
      label: 'Social',
      description: data.social,
      trend: trendDirection(trends.social),
      peak: peakDay(trends.social),
      color: SIGNAL_COLORS.social,
    },
    {
      label: 'Discipline',
      description: data.discipline,
      trend: trendDirection(trends.discipline),
      peak: peakDay(trends.discipline),
      color: SIGNAL_COLORS.discipline,
    },
  ];

  return (
    <Card className={`${styles.card} glassCard`}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Weekly Reflection</p>
          <h3 className={styles.title}>Signal narrative</h3>
        </div>
        <div className={styles.headerNote}>Readable insights instead of raw charts.</div>
      </div>

      <div className={styles.grid}>
        {cards.map((item) => (
          <div key={item.label} className={styles.insightCard}>
            <div className={styles.cardTop}>
              <span className={styles.cardLabel}>{item.label}</span>
              <span className={styles.cardTrend} style={{ color: item.color }}>
                {item.trend === 'rising' ? '↑ Rising trend' : item.trend === 'falling' ? '↓ Falling trend' : '→ Stable'}
              </span>
            </div>
            <div className={styles.cardDesc}>{item.description}</div>
            <div className={styles.cardMeta}>
              <span className={styles.cardMetaLabel}>Peak day</span>
              <span className={styles.cardMetaValue} style={{ color: item.color }}>{item.peak || '—'}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
