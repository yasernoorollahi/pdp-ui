import { Card, Button, Skeleton } from '../../../components/ui';
import type { MindSnapshot as MindSnapshotData } from '../../../services/insights.service';
import { ResponsiveBar } from '@nivo/bar';
import styles from './NewMindSnapshot.module.css';

type NewMindSnapshotProps = {
  data: MindSnapshotData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const scoreLabel = (value: number) => {
  if (value >= 0.75) return 'High';
  if (value >= 0.5) return 'Steady';
  if (value >= 0.25) return 'Low';
  return 'Very Low';
};

const frictionLabel = (value: number) => {
  if (value <= 0.5) return 'Low';
  if (value <= 0.7) return 'Moderate';
  return 'High';
};

const socialLabel = (value: number) => {
  if (value >= 0.75) return 'Active';
  if (value >= 0.5) return 'Present';
  if (value >= 0.25) return 'Quiet';
  return 'Silent';
};

const disciplineLabel = (value: number) => {
  if (value >= 0.75) return 'Strong';
  if (value >= 0.5) return 'Steady';
  if (value >= 0.25) return 'Wavering';
  return 'Low';
};

export const NewMindSnapshot = ({ data, loading, error, onRetry }: NewMindSnapshotProps) => {
  if (loading) {
    return (
      <Card className={`${styles.card} glassCard`}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Mind Snapshot</p>
            <h3 className={styles.title}>Today at a glance</h3>
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
            <h3 className={styles.title}>Today at a glance</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>We couldn’t load today’s snapshot.</p>
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
            <p className={styles.kicker}>Mind Snapshot</p>
            <h3 className={styles.title}>Today at a glance</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>No snapshot yet.</p>
          <p className={styles.stateHint}>Come back after a few signals are logged.</p>
        </div>
      </Card>
    );
  }

  const energyScore = clamp01(data.energy);
  const motivationScore = clamp01(data.motivation);
  const frictionScore = clamp01(data.friction / 4);
  const socialScore = clamp01(data.social / 4);
  const disciplineScore = clamp01(data.discipline / 4);

  const chartData = [
    {
      metric: 'Energy',
      value: energyScore * 100,
      label: scoreLabel(energyScore),
    },
    {
      metric: 'Motivation',
      value: motivationScore * 100,
      label: scoreLabel(motivationScore),
    },
    {
      metric: 'Friction',
      value: frictionScore * 100,
      label: frictionLabel(frictionScore),
    },
    {
      metric: 'Social',
      value: socialScore * 100,
      label: socialLabel(socialScore),
    },
    {
      metric: 'Discipline',
      value: disciplineScore * 100,
      label: disciplineLabel(disciplineScore),
    },
  ];

  return (
    <Card className={`${styles.card} glassCard`}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Mind Snapshot</p>
          <h3 className={styles.title}>Today at a glance</h3>
        </div>
        <div className={styles.headerNote}>Signals distilled from your day.</div>
      </div>

      <div className={styles.chartWrap}>
        <ResponsiveBar
          data={chartData}
          keys={['value']}
          indexBy="metric"
          layout="horizontal"
          margin={{ top: 10, right: 40, bottom: 10, left: 90 }}
          padding={0.4}
          colors={['#2dd4bf', '#34d399', '#fcd34d', '#60a5fa', '#c084fc']}
          borderRadius={6}
          enableGridX={false}
          enableGridY={false}
          axisBottom={null}
          axisLeft={{
            tickSize: 0,
            tickPadding: 12,
            tickRotation: 0,
          }}
          enableLabel
          label={(d) => String((d.data as { label?: string }).label ?? '')}
          labelSkipWidth={10}
          labelTextColor="#e8f5f3"
          tooltip={(datum) => (
            <div className={styles.tooltip}>
              <span className={styles.tooltipLabel}>{datum.indexValue}</span>
              <span className={styles.tooltipValue}>{(datum.data as { label?: string }).label}</span>
            </div>
          )}
          theme={{
            text: {
              fill: '#e8f5f3',
              fontSize: 11,
            },
            axis: {
              ticks: {
                text: {
                  fill: '#94a3b8',
                  fontSize: 12,
                },
              },
            },
            tooltip: {
              container: {
                background: 'rgba(6, 12, 16, 0.9)',
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
