import { Card, Button, Skeleton } from '../../../components/ui';
import type { TimelinePoint } from '../../../services/insights.service';
import { ResponsiveCalendar } from '@nivo/calendar';
import { clamp01 } from '../utils/signalUtils';
import styles from './NewBehaviorHeatCalendar.module.css';

type NewBehaviorHeatCalendarProps = {
  data: TimelinePoint[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

export const NewBehaviorHeatCalendar = ({ data, loading, error, onRetry }: NewBehaviorHeatCalendarProps) => {
  if (loading) {
    return (
      <Card className={`${styles.card} glassCard`}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Behavior Heat Calendar</p>
            <h3 className={styles.title}>Intensity map</h3>
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
            <p className={styles.kicker}>Behavior Heat Calendar</p>
            <h3 className={styles.title}>Intensity map</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>We couldn’t load your heat calendar.</p>
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
            <p className={styles.kicker}>Behavior Heat Calendar</p>
            <h3 className={styles.title}>Intensity map</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>No behavior signals yet.</p>
          <p className={styles.stateHint}>We’ll start shading this once activity arrives.</p>
        </div>
      </Card>
    );
  }

  const frictionMax = Math.max(...data.map((item) => item.friction), 1);
  const socialMax = Math.max(...data.map((item) => item.social), 1);
  const disciplineMax = Math.max(...data.map((item) => item.discipline), 1);

  const byDay = new Map(
    data.map((item) => {
      const energy = clamp01(item.energy);
      const motivation = clamp01(item.motivation);
      const social = clamp01(item.social / socialMax);
      const discipline = clamp01(item.discipline / disciplineMax);
      const friction = clamp01(item.friction / frictionMax);
      const intensity = clamp01((energy + motivation + social + discipline + (1 - friction)) / 5);
      return [item.date, { energy, motivation, social, discipline, friction, intensity }];
    }),
  );

  const dates = data.map((item) => new Date(item.date));
  const start = new Date(Math.min(...dates.map((d) => d.getTime())));
  const end = new Date(Math.max(...dates.map((d) => d.getTime())));

  const calendarData = data.map((item) => {
    const day = item.date;
    const snapshot = byDay.get(day);
    return {
      day,
      value: Math.round((snapshot?.intensity ?? 0) * 100),
      metrics: snapshot,
    };
  });

  return (
    <Card className={`${styles.card} glassCard`}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Behavior Heat Calendar</p>
          <h3 className={styles.title}>Intensity map</h3>
        </div>
        <div className={styles.headerNote}>Overall behavioral intensity by day.</div>
      </div>

      <div className={styles.chartWrap}>
        <ResponsiveCalendar
          data={calendarData}
          from={toDateKey(start)}
          to={toDateKey(end)}
          emptyColor="rgba(15, 23, 42, 0.45)"
          colors={[
            'rgba(0, 229, 255, 0.15)',
            'rgba(0, 229, 255, 0.35)',
            'rgba(0, 255, 163, 0.5)',
            'rgba(0, 255, 163, 0.75)',
          ]}
          margin={{ top: 20, right: 20, bottom: 0, left: 20 }}
          yearSpacing={40}
          monthBorderColor="rgba(255,255,255,0.06)"
          dayBorderWidth={1}
          dayBorderColor="rgba(255,255,255,0.05)"
          theme={{
            text: {
              fill: 'rgba(148, 163, 184, 0.9)',
              fontSize: 10,
            },
            tooltip: {
              container: {
                background: 'rgba(6, 12, 16, 0.92)',
                color: '#e8f5f3',
                fontSize: 12,
                borderRadius: 10,
                border: '1px solid rgba(0, 229, 255, 0.25)',
                padding: '8px 12px',
              },
            },
          }}
        />
      </div>
    </Card>
  );
};
