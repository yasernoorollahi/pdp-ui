import { Card, Button, Skeleton } from '../../../components/ui';
import type { TimelinePoint } from '../../../services/insights.service';
import { ResponsiveLine } from '@nivo/line';
import styles from './NewTimelineChart.module.css';

type NewTimelineChartProps = {
  data: TimelinePoint[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  days: number;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const formatShortDate = (dateStr: string) => {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const NewTimelineChart = ({ data, loading, error, onRetry, days }: NewTimelineChartProps) => {
  if (loading) {
    return (
      <Card className={`${styles.card} glassCard`}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Timeline</p>
            <h3 className={styles.title}>Behavioral Metro · Last {days} Days</h3>
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
            <p className={styles.kicker}>Timeline</p>
            <h3 className={styles.title}>Behavioral Metro · Last {days} Days</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>We couldn’t load the timeline.</p>
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
            <p className={styles.kicker}>Timeline</p>
            <h3 className={styles.title}>Behavioral Metro · Last {days} Days</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>No timeline data yet.</p>
          <p className={styles.stateHint}>Collect a few days of signals to see your metro lines.</p>
        </div>
      </Card>
    );
  }

  const frictionMax = Math.max(...data.map((item) => item.friction), 1);
  const socialMax = Math.max(...data.map((item) => item.social), 1);
  const disciplineMax = Math.max(...data.map((item) => item.discipline), 1);

  const series = [
    {
      id: 'Energy',
      color: '#2dd4bf',
      data: data.map((item) => ({ x: formatShortDate(item.date), y: clamp01(item.energy) })),
      className: styles.legendEnergy,
    },
    {
      id: 'Motivation',
      color: '#34d399',
      data: data.map((item) => ({ x: formatShortDate(item.date), y: clamp01(item.motivation) })),
      className: styles.legendMotivation,
    },
    {
      id: 'Friction',
      color: '#fcd34d',
      data: data.map((item) => ({ x: formatShortDate(item.date), y: clamp01(item.friction / frictionMax) })),
      className: styles.legendFriction,
    },
    {
      id: 'Social',
      color: '#60a5fa',
      data: data.map((item) => ({ x: formatShortDate(item.date), y: clamp01(item.social / socialMax) })),
      className: styles.legendSocial,
    },
    {
      id: 'Discipline',
      color: '#c084fc',
      data: data.map((item) => ({ x: formatShortDate(item.date), y: clamp01(item.discipline / disciplineMax) })),
      className: styles.legendDiscipline,
    },
  ];

  return (
    <Card className={`${styles.card} glassCard`}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Timeline</p>
          <h3 className={styles.title}>Behavioral Metro · Last {days} Days</h3>
        </div>
        <div className={styles.headerNote}>Patterns across your recent behavior.</div>
      </div>

      <div className={styles.chartWrap}>
        <ResponsiveLine
          data={series}
          margin={{ top: 20, right: 20, bottom: 40, left: 20 }}
          xScale={{ type: 'point' }}
          yScale={{ type: 'linear', min: 0, max: 1, stacked: false }}
          axisLeft={null}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 0,
            tickPadding: 10,
            tickRotation: 0,
          }}
          colors={(d) => String(d.color)}
          enablePoints={false}
          enableGridY={false}
          enableGridX={false}
          lineWidth={2.4}
          useMesh
          theme={{
            text: {
              fill: '#94a3b8',
              fontSize: 11,
            },
            axis: {
              ticks: {
                text: {
                  fill: '#94a3b8',
                  fontSize: 11,
                },
              },
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

      <div className={styles.legend}>
        {series.map((item) => (
          <div key={item.id} className={styles.legendItem}>
            <span className={`${styles.legendDot} ${item.className}`} />
            <span className={styles.legendLabel}>{item.id}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};
