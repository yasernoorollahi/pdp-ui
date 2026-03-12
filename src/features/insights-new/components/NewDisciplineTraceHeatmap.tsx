import { Card, Button, Skeleton } from '../../../components/ui';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import type { TimelinePoint } from '../../../services/insights.service';
import { SIGNAL_COLORS, clamp01, formatShortDate, interpretationText, levelLabel } from '../utils/signalUtils';
import styles from './NewDisciplineTraceHeatmap.module.css';

type NewDisciplineTraceHeatmapProps = {
  data: TimelinePoint[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const NewDisciplineTraceHeatmap = ({ data, loading, error, onRetry }: NewDisciplineTraceHeatmapProps) => {
  if (loading) {
    return (
      <Card className={`${styles.card} glassCard`}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Discipline Trace</p>
            <h3 className={styles.title}>Behavior heat trace</h3>
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
            <p className={styles.kicker}>Discipline Trace</p>
            <h3 className={styles.title}>Behavior heat trace</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>We couldn’t load discipline trace.</p>
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
            <p className={styles.kicker}>Discipline Trace</p>
            <h3 className={styles.title}>Behavior heat trace</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>No discipline data yet.</p>
          <p className={styles.stateHint}>We’ll show this once daily signals are logged.</p>
        </div>
      </Card>
    );
  }

  const frictionMax = Math.max(...data.map((item) => item.friction), 1);
  const socialMax = Math.max(...data.map((item) => item.social), 1);
  const disciplineMax = Math.max(...data.map((item) => item.discipline), 1);

  const seriesConfig = [
    { id: 'Discipline', key: 'discipline', color: SIGNAL_COLORS.discipline, max: disciplineMax },
    { id: 'Focus', key: 'motivation', color: SIGNAL_COLORS.motivation, max: 1 },
    { id: 'Energy', key: 'energy', color: SIGNAL_COLORS.energy, max: 1 },
    { id: 'Social', key: 'social', color: SIGNAL_COLORS.social, max: socialMax },
    { id: 'Friction', key: 'friction', color: SIGNAL_COLORS.friction, max: frictionMax },
  ] as const;

  const heatData = seriesConfig.map((series) => ({
    id: series.id,
    data: data.map((point) => {
      const raw = point[series.key];
      const normalized = clamp01(series.key === 'friction' ? raw / series.max : raw / series.max);
      return {
        x: formatShortDate(point.date),
        y: Math.round(normalized * 100),
        signal: series.key,
      };
    }),
  }));

  const colorBySeries: Record<string, string> = {
    Discipline: SIGNAL_COLORS.discipline,
    Focus: SIGNAL_COLORS.motivation,
    Energy: SIGNAL_COLORS.energy,
    Social: SIGNAL_COLORS.social,
    Friction: SIGNAL_COLORS.friction,
  };

  return (
    <Card className={`${styles.card} glassCard`}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Discipline Trace</p>
          <h3 className={styles.title}>Behavior heat trace</h3>
        </div>
        <div className={styles.headerNote}>Intensity by day and signal.</div>
      </div>

      <div className={styles.chartWrap}>
        <ResponsiveHeatMap
          data={heatData}
          margin={{ top: 10, right: 20, bottom: 30, left: 70 }}
          valueFormat=".0f"
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 0,
            tickPadding: 8,
            tickRotation: 0,
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 10,
          }}
          colors={(cell) => {
            const base = colorBySeries[String(cell.serieId)] ?? SIGNAL_COLORS.discipline;
            const intensity = typeof cell.value === 'number' ? cell.value / 100 : 0;
            const alpha = 0.15 + intensity * 0.85;
            return hexToRgba(base, alpha);
          }}
          emptyColor="rgba(15, 23, 42, 0.45)"
          borderColor="rgba(15, 23, 42, 0.8)"
          borderWidth={1}
          enableLabels={false}
          tooltip={({ cell }) => {
            const value = typeof cell.value === 'number' ? cell.value / 100 : 0;
            const signalMap: Record<string, 'energy' | 'motivation' | 'social' | 'discipline' | 'friction'> = {
              Discipline: 'discipline',
              Focus: 'motivation',
              Energy: 'energy',
              Social: 'social',
              Friction: 'friction',
            };
            const signal = signalMap[String(cell.serieId)] ?? 'discipline';
            return (
              <div className={styles.tooltip}>
                <div className={styles.tooltipTitle}>{cell.serieId}</div>
                <div className={styles.tooltipDate}>{cell.data.x}</div>
                <div className={styles.tooltipValue}>{levelLabel(value)}</div>
                <div className={styles.tooltipHint}>{interpretationText(signal, value)}</div>
              </div>
            );
          }}
          theme={{
            text: {
              fill: 'rgba(148, 163, 184, 0.9)',
              fontSize: 11,
            },
            tooltip: {
              container: {
                background: 'rgba(6, 12, 16, 0.92)',
                color: '#e8f5f3',
                fontSize: 12,
                borderRadius: 10,
                border: '1px solid rgba(192, 132, 252, 0.25)',
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
