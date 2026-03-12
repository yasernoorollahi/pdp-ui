import { useEffect, useMemo, useState } from 'react';
import { Card, Button, Skeleton } from '../../../components/ui';
import type { TimelinePoint } from '../../../services/insights.service';
import { ResponsiveLine } from '@nivo/line';
import { SIGNAL_COLORS, clamp01, formatShortDate, interpretationText, levelLabel } from '../utils/signalUtils';
import styles from './NewTimelineChart.module.css';

type NewTimelineChartProps = {
  data: TimelinePoint[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  days: number;
};

type SignalToggle = {
  id: string;
  key: keyof TimelinePoint;
  color: string;
  normalize?: (value: number, max: number) => number;
};

const SIGNALS: SignalToggle[] = [
  { id: 'Energy', key: 'energy', color: SIGNAL_COLORS.energy },
  { id: 'Motivation', key: 'motivation', color: SIGNAL_COLORS.motivation },
  { id: 'Social', key: 'social', color: SIGNAL_COLORS.social },
  { id: 'Discipline', key: 'discipline', color: SIGNAL_COLORS.discipline },
  { id: 'Friction', key: 'friction', color: SIGNAL_COLORS.friction },
];

export const NewTimelineChart = ({ data, loading, error, onRetry, days }: NewTimelineChartProps) => {
  const [range, setRange] = useState(days);
  const [activeSignals, setActiveSignals] = useState<Record<string, boolean>>({
    Energy: true,
    Motivation: true,
    Social: true,
    Discipline: true,
    Friction: true,
  });

  const safeData = data ?? [];
  const minRange = Math.min(7, safeData.length || 7);

  useEffect(() => {
    if (safeData.length > 0) {
      const next = Math.max(minRange, Math.min(range, safeData.length));
      if (next !== range) setRange(next);
    }
  }, [minRange, range, safeData.length]);
  const visibleData = useMemo(() => safeData.slice(-Math.max(1, range)), [safeData, range]);

  const normalized = useMemo(() => {
    const frictionMax = Math.max(...visibleData.map((item) => item.friction), 1);
    const socialMax = Math.max(...visibleData.map((item) => item.social), 1);
    const disciplineMax = Math.max(...visibleData.map((item) => item.discipline), 1);

    return {
      frictionMax,
      socialMax,
      disciplineMax,
    };
  }, [visibleData]);

  const series = useMemo(() => {
    return SIGNALS.filter((signal) => activeSignals[signal.id]).map((signal) => {
      const max = signal.key === 'friction'
        ? normalized.frictionMax
        : signal.key === 'social'
          ? normalized.socialMax
          : signal.key === 'discipline'
            ? normalized.disciplineMax
            : 1;

      return {
        id: signal.id,
        color: signal.color,
        data: visibleData.map((item) => ({
          x: formatShortDate(item.date),
          y: clamp01(item[signal.key] / max),
          raw: item[signal.key],
        })),
      };
    });
  }, [activeSignals, normalized, visibleData]);

  if (loading) {
    return (
      <Card className={`${styles.card} glassCard`}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Behavioral Metro</p>
            <h3 className={styles.title}>Multi-signal timeline · Last {days} days</h3>
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
            <p className={styles.kicker}>Behavioral Metro</p>
            <h3 className={styles.title}>Multi-signal timeline · Last {days} days</h3>
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
            <p className={styles.kicker}>Behavioral Metro</p>
            <h3 className={styles.title}>Multi-signal timeline · Last {days} days</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>No timeline data yet.</p>
          <p className={styles.stateHint}>Collect a few days of signals to see your metro lines.</p>
        </div>
      </Card>
    );
  }

  const handleToggle = (id: string) => {
    setActiveSignals((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <Card className={`${styles.card} glassCard`}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Behavioral Metro</p>
          <h3 className={styles.title}>Multi-signal timeline · Last {range} days</h3>
        </div>
        <div className={styles.headerNote}>Toggle signals and zoom for clarity.</div>
      </div>

      <div className={styles.controls}>
        <div className={styles.toggles}>
          {SIGNALS.map((signal) => (
            <button
              key={signal.id}
              type="button"
              className={`${styles.toggle} ${activeSignals[signal.id] ? styles.toggleActive : ''}`}
              onClick={() => handleToggle(signal.id)}
              style={{ borderColor: signal.color }}
            >
              <span className={styles.toggleDot} style={{ background: signal.color }} />
              {signal.id}
            </button>
          ))}
        </div>
        <div className={styles.zoom}>
          <span className={styles.zoomLabel}>Zoom</span>
          <input
            className={styles.zoomSlider}
            type="range"
            min={minRange}
            max={data.length}
            value={range}
            onChange={(event) => setRange(Number(event.target.value))}
          />
          <span className={styles.zoomValue}>{range}d</span>
        </div>
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
          enableGridY
          enableGridX={false}
          lineWidth={2.6}
          useMesh
          enableSlices="x"
          crosshairType="x"
          sliceTooltip={({ slice }) => {
            const date = String(slice.points[0]?.data.xFormatted ?? slice.points[0]?.data.x ?? '');
            const points = slice.points.filter((point) => point.serieId);
            return (
              <div className={styles.tooltip}>
                <div className={styles.tooltipTitle}>{date}</div>
                {points.map((point) => {
                  const value = typeof point.data.y === 'number' ? point.data.y : 0;
                  const signalKey = String(point.serieId).toLowerCase() as 'energy' | 'motivation' | 'social' | 'discipline' | 'friction';
                  return (
                    <div key={point.id} className={styles.tooltipRow}>
                      <span className={styles.tooltipLabel} style={{ color: String(point.serieColor) }}>
                        {point.serieId}
                      </span>
                      <span className={styles.tooltipValue}>{levelLabel(value)}</span>
                      <span className={styles.tooltipHint}>{interpretationText(signalKey, value)}</span>
                    </div>
                  );
                })}
              </div>
            );
          }}
          theme={{
            text: {
              fill: 'rgba(148, 163, 184, 0.9)',
              fontSize: 11,
            },
            axis: {
              ticks: {
                text: {
                  fill: 'rgba(148, 163, 184, 0.9)',
                  fontSize: 11,
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
