import { Card, Button, Skeleton } from '../../../components/ui';
import type { FrictionPoint } from '../../../services/insights.service';
import styles from './FrictionHeatmap.module.css';

type FrictionHeatmapProps = {
  data: FrictionPoint[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const getLevel = (value: number) => {
  if (value <= 0) return 0;
  if (value <= 1) return 1;
  if (value <= 2) return 2;
  if (value <= 3) return 3;
  return 4;
};

export const FrictionHeatmap = ({ data, loading, error, onRetry }: FrictionHeatmapProps) => {
  if (loading) {
    return (
      <Card className={`${styles.card} glassCard`}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Friction Heatmap</p>
            <h3 className={styles.title}>Where struggle concentrates</h3>
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
            <p className={styles.kicker}>Friction Heatmap</p>
            <h3 className={styles.title}>Where struggle concentrates</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>We couldn’t load your heatmap.</p>
          <p className={styles.stateHint}>{error}</p>
          <Button variant="teal" onClick={onRetry}>Try again</Button>
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className={`${styles.card} glassCard`}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Friction Heatmap</p>
            <h3 className={styles.title}>Where struggle concentrates</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>No friction signals yet.</p>
          <p className={styles.stateHint}>We’ll start shading this once activity arrives.</p>
        </div>
      </Card>
    );
  }

  const map = new Map(data.map((item) => [item.date, item.value]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const totalDays = 35;
  const start = new Date(today);
  start.setDate(today.getDate() - (totalDays - 1));

  const startOffset = (start.getDay() + 6) % 7;
  const rawCells = Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = toDateKey(date);
    return {
      date: key,
      value: map.get(key) ?? 0,
    };
  });

  const paddedCells = [
    ...Array.from({ length: startOffset }, () => ({ date: '', value: 0, empty: true })),
    ...rawCells.map((cell) => ({ ...cell, empty: false })),
  ];

  const remaining = paddedCells.length % 7;
  const trailing = remaining === 0 ? 0 : 7 - remaining;
  const finalCells = [
    ...paddedCells,
    ...Array.from({ length: trailing }, () => ({ date: '', value: 0, empty: true })),
  ];

  return (
    <Card className={`${styles.card} glassCard`}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Friction Heatmap</p>
          <h3 className={styles.title}>Where struggle concentrates</h3>
        </div>
        <div className={styles.headerNote}>Light to heavy intensity.</div>
      </div>

      <div className={styles.heatmap}>
        <div className={styles.dayRow}>
          {dayLabels.map((label) => (
            <span key={label} className={styles.dayLabel}>{label}</span>
          ))}
        </div>
        <div className={styles.grid}>
          {finalCells.map((cell, index) => {
            if (cell.empty) {
              return <span key={`empty-${index}`} className={`${styles.cell} ${styles.cellEmpty}`} />;
            }
            const level = getLevel(cell.value);
            return (
              <span
                key={cell.date}
                className={`${styles.cell} ${styles[`level${level}`]}`}
                aria-label={`Friction on ${cell.date}`}
              />
            );
          })}
        </div>
        <div className={styles.legend}>
          <span className={styles.legendLabel}>Low</span>
          <div className={styles.legendScale}>
            {[0, 1, 2, 3, 4].map((level) => (
              <span key={level} className={`${styles.cell} ${styles[`level${level}`]}`} />
            ))}
          </div>
          <span className={styles.legendLabel}>High</span>
        </div>
      </div>
    </Card>
  );
};
