import { Card, Button, Skeleton } from '../../../components/ui';
import type { FrictionPoint } from '../../../services/insights.service';
import { ResponsiveCalendar } from '@nivo/calendar';
import styles from './NewFrictionHeatmap.module.css';

type NewFrictionHeatmapProps = {
  data: FrictionPoint[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

export const NewFrictionHeatmap = ({ data, loading, error, onRetry }: NewFrictionHeatmapProps) => {
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
  const totalDays = 105;
  const start = new Date(today);
  start.setDate(today.getDate() - (totalDays - 1));

  const calendarData = Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = toDateKey(date);
    return {
      day: key,
      value: map.get(key) ?? 0,
    };
  });

  return (
    <Card className={`${styles.card} glassCard`}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Friction Heatmap</p>
          <h3 className={styles.title}>Where struggle concentrates</h3>
        </div>
        <div className={styles.headerNote}>Light to heavy intensity.</div>
      </div>

      <div className={styles.chartWrap}>
        <ResponsiveCalendar
          data={calendarData}
          from={calendarData[0].day}
          to={calendarData[calendarData.length - 1].day}
          emptyColor="rgba(255,255,255,0.05)"
          colors={['rgba(45, 212, 191, 0.2)', 'rgba(52, 211, 153, 0.3)', 'rgba(245, 158, 11, 0.35)', 'rgba(239, 68, 68, 0.4)']}
          margin={{ top: 20, right: 20, bottom: 0, left: 20 }}
          yearSpacing={40}
          monthBorderColor="rgba(255,255,255,0.05)"
          dayBorderWidth={1}
          dayBorderColor="rgba(255,255,255,0.04)"
          theme={{
            text: {
              fill: '#94a3b8',
              fontSize: 10,
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
