import { Card, Button, Skeleton } from '../../../components/ui';
import { ResponsiveLine } from '@nivo/line';
import styles from './NewInsightTrendCard.module.css';

type TrendPoint = { date: string; value: number };

type NewInsightTrendCardProps = {
  title: string;
  subtitle: string;
  variant: 'energy' | 'motivation' | 'social' | 'discipline';
  color: string;
  loading: boolean;
  error: string | null;
  empty: boolean;
  onRetry: () => void;
  descriptor: string;
  trend: TrendPoint[];
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const NewInsightTrendCard = ({
  title,
  subtitle,
  variant,
  color,
  loading,
  error,
  empty,
  onRetry,
  descriptor,
  trend,
}: NewInsightTrendCardProps) => {
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

  const values = trend.map((point) => ({ x: point.date, y: clamp01(point.value) }));

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
        <ResponsiveLine
          data={[{ id: title, color, data: values }]}
          margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
          xScale={{ type: 'point' }}
          yScale={{ type: 'linear', min: 0, max: 1, stacked: false }}
          axisLeft={null}
          axisBottom={null}
          axisRight={null}
          axisTop={null}
          colors={[color]}
          enablePoints={false}
          enableGridX={false}
          enableGridY={false}
          lineWidth={2.6}
          useMesh
          theme={{
            text: {
              fill: '#94a3b8',
              fontSize: 11,
            },
            tooltip: {
              container: {
                background: 'rgba(6, 12, 16, 0.92)',
                color: '#e8f5f3',
                fontSize: 12,
                borderRadius: 8,
                border: '1px solid rgba(45, 212, 191, 0.2)',
                padding: '6px 10px',
              },
            },
          }}
        />
      </div>
    </Card>
  );
};
