import { Card, Button, Skeleton } from '../../../components/ui';
import type { TimelinePoint } from '../../../services/insights.service';
import { ResponsiveBar } from '@nivo/bar';
import { SIGNAL_COLORS, clamp01, interpretationText } from '../utils/signalUtils';
import styles from './NewMindSnapshot.module.css';

type NewMindSnapshotProps = {
  data: TimelinePoint[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

const average = (values: number[]) => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export const NewMindSnapshot = ({ data, loading, error, onRetry }: NewMindSnapshotProps) => {
  if (loading) {
    return (
      <Card className={`${styles.card} glassCard`}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Mind Snapshot</p>
            <h3 className={styles.title}>15-day signal averages</h3>
          </div>
        </div>
        <Skeleton count={4} className={styles.skeletonLine} />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`${styles.card} glassCard`}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Mind Snapshot</p>
            <h3 className={styles.title}>15-day signal averages</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>We couldn’t load your snapshot.</p>
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
            <p className={styles.kicker}>Mind Snapshot</p>
            <h3 className={styles.title}>15-day signal averages</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>No snapshot yet.</p>
          <p className={styles.stateHint}>Collect a few days of signals to populate this view.</p>
        </div>
      </Card>
    );
  }

  const disciplineMax = Math.max(...data.map((item) => item.discipline), 1);

  const metrics = [
    {
      metric: 'Discipline',
      signal: 'discipline' as const,
      value: clamp01(average(data.map((item) => item.discipline / disciplineMax))),
      color: SIGNAL_COLORS.discipline,
    },
    {
      metric: 'Motivation',
      signal: 'motivation' as const,
      value: clamp01(average(data.map((item) => item.motivation))),
      color: SIGNAL_COLORS.motivation,
    },
    {
      metric: 'Energy',
      signal: 'energy' as const,
      value: clamp01(average(data.map((item) => item.energy))),
      color: SIGNAL_COLORS.energy,
    },
  ];

  const chartData = metrics.map((item) => ({
    metric: item.metric,
    value: Math.round(item.value * 100),
    color: item.color,
    signal: item.signal,
  }));

  return (
    <Card className={`${styles.card} glassCard`}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Mind Snapshot</p>
          <h3 className={styles.title}>15-day signal averages</h3>
        </div>
        <div className={styles.headerNote}>Average signal over last 15 days.</div>
      </div>

      <div className={styles.chartWrap}>
        <ResponsiveBar
          data={chartData}
          keys={['value']}
          indexBy="metric"
          layout="horizontal"
          margin={{ top: 10, right: 40, bottom: 10, left: 110 }}
          padding={0.4}
          colors={(bar) => String(bar.data.color)}
          borderRadius={8}
          maxValue={100}
          enableGridX
          enableGridY={false}
          axisBottom={null}
          axisLeft={{
            tickSize: 0,
            tickPadding: 12,
            tickRotation: 0,
          }}
          label={(d) => `${d.value}%`}
          labelSkipWidth={10}
          labelTextColor="#f8fafc"
          tooltip={(datum) => (
            <div className={styles.tooltip}>
              <span className={styles.tooltipLabel}>{datum.indexValue}</span>
              <span className={styles.tooltipValue}>{datum.value}%</span>
              <span className={styles.tooltipHint}>Average signal over last 15 days</span>
              <span className={styles.tooltipHint}>Interpretation: {interpretationText((datum.data as { signal: 'energy' | 'motivation' | 'discipline' }).signal, (datum.value as number) / 100)}</span>
            </div>
          )}
          theme={{
            text: {
              fill: '#e2e8f0',
              fontSize: 12,
            },
            axis: {
              ticks: {
                text: {
                  fill: 'rgba(148, 163, 184, 0.9)',
                  fontSize: 12,
                },
              },
            },
            grid: {
              line: {
                stroke: 'rgba(148, 163, 184, 0.12)',
                strokeWidth: 1,
              },
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
          animate
          motionConfig="gentle"
        />
      </div>
    </Card>
  );
};
