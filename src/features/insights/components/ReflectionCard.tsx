import { Card, Button, Skeleton } from '../../../components/ui';
import type { InsightSummary } from '../../../services/insights.service';
import styles from './ReflectionCard.module.css';

type ReflectionCardProps = {
  data: InsightSummary | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

export const ReflectionCard = ({ data, loading, error, onRetry }: ReflectionCardProps) => {
  if (loading) {
    return (
      <Card className={`${styles.card} glassCard`}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Weekly Reflection</p>
            <h3 className={styles.title}>Your mental weather</h3>
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
            <h3 className={styles.title}>Your mental weather</h3>
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
            <h3 className={styles.title}>Your mental weather</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>No reflection yet.</p>
          <p className={styles.stateHint}>We’ll summarize once signals are steady.</p>
        </div>
      </Card>
    );
  }

  const items = [
    { label: 'Energy', value: data.energy },
    { label: 'Motivation', value: data.motivation },
    { label: 'Friction', value: data.friction },
    { label: 'Social', value: data.social },
    { label: 'Discipline', value: data.discipline },
  ];

  return (
    <Card className={`${styles.card} glassCard`}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Weekly Reflection</p>
          <h3 className={styles.title}>Your mental weather</h3>
        </div>
        <div className={styles.headerNote}>Semantic summary, not raw metrics.</div>
      </div>

      <div className={styles.list}>
        {items.map((item) => (
          <div key={item.label} className={styles.row}>
            <span className={styles.rowLabel}>{item.label}</span>
            <span className={styles.rowValue}>{item.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};
