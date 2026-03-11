import { Card, Button, Skeleton } from '../../../components/ui';
import styles from './InsightTrendCard.module.css';

type TrendPoint = { date: string; value: number };

type InsightTrendCardProps = {
  title: string;
  subtitle: string;
  variant: 'energy' | 'motivation' | 'social' | 'discipline';
  loading: boolean;
  error: string | null;
  empty: boolean;
  onRetry: () => void;
  descriptor: string;
  trend: TrendPoint[];
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const buildPath = (values: number[], width: number, height: number, padding: number) => {
  if (values.length === 0) return '';
  const maxX = width - padding * 2;
  const maxY = height - padding * 2;
  const step = values.length === 1 ? 0 : maxX / (values.length - 1);

  return values
    .map((value, index) => {
      const x = padding + step * index;
      const y = padding + (1 - clamp01(value)) * maxY;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
};

export const InsightTrendCard = ({
  title,
  subtitle,
  variant,
  loading,
  error,
  empty,
  onRetry,
  descriptor,
  trend,
}: InsightTrendCardProps) => {
  if (loading) {
    return (
      <Card className={`${styles.card} glassCard`}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>{subtitle}</p>
            <h3 className={styles.title}>{title}</h3>
          </div>
        </div>
        <Skeleton count={1} className={styles.skeletonChart} />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`${styles.card} glassCard`}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>{subtitle}</p>
            <h3 className={styles.title}>{title}</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>We couldn’t load this trend.</p>
          <p className={styles.stateHint}>{error}</p>
          <Button variant="teal" onClick={onRetry}>Try again</Button>
        </div>
      </Card>
    );
  }

  if (empty) {
    return (
      <Card className={`${styles.card} glassCard`}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>{subtitle}</p>
            <h3 className={styles.title}>{title}</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>No signals yet.</p>
          <p className={styles.stateHint}>We’ll show this once trends appear.</p>
        </div>
      </Card>
    );
  }

  const values = trend.map((point) => clamp01(point.value));
  const width = 100;
  const height = 36;
  const padding = 4;

  return (
    <Card className={`${styles.card} glassCard`}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>{subtitle}</p>
          <h3 className={styles.title}>{title}</h3>
        </div>
        <div className={`${styles.badge} ${styles[variant]}`}>{descriptor}</div>
      </div>

      <div className={styles.sparklineWrap}>
        <svg viewBox={`0 0 ${width} ${height}`} className={styles.sparkline} role="img" aria-label={`${title} trend`}>
          <path
            d={buildPath(values, width, height, padding)}
            className={`${styles.sparklinePath} ${styles[variant]}`}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </Card>
  );
};
