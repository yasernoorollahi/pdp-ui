import { Card, Button, Skeleton } from '../../../components/ui';
import { ResponsiveLine } from '@nivo/line';
import type { MotivationTrend } from '../../../services/insights.service';
import { SIGNAL_COLORS, clamp01, formatShortDate, interpretationText } from '../utils/signalUtils';
import styles from './NewMotivationMomentum.module.css';

type NewMotivationMomentumProps = {
  data: MotivationTrend | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

const Arrow = ({ direction }: { direction: 'up' | 'down' | 'flat' }) => {
  if (direction === 'flat') return <span className={styles.trendFlat}>→</span>;
  if (direction === 'down') return <span className={styles.trendDown}>↓</span>;
  return <span className={styles.trendUp}>↑</span>;
};

export const NewMotivationMomentum = ({ data, loading, error, onRetry }: NewMotivationMomentumProps) => {
  if (loading) {
    return (
      <Card className={`${styles.card} glassCard`}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Momentum</p>
            <h3 className={styles.title}>Motivation arc</h3>
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
            <p className={styles.kicker}>Momentum</p>
            <h3 className={styles.title}>Motivation arc</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>We couldn’t load momentum.</p>
          <p className={styles.stateHint}>{error}</p>
          <Button variant="teal" onClick={onRetry}>Try again</Button>
        </div>
      </Card>
    );
  }

  if (!data || data.trend.length === 0) {
    return (
      <Card className={`${styles.card} glassCard`}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Momentum</p>
            <h3 className={styles.title}>Motivation arc</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>No momentum signals yet.</p>
          <p className={styles.stateHint}>We’ll show this once motivation trends appear.</p>
        </div>
      </Card>
    );
  }

  const values = data.trend.map((point) => ({
    x: formatShortDate(point.date),
    y: clamp01(point.value),
  }));

  const first = values[0]?.y ?? 0;
  const last = values[values.length - 1]?.y ?? 0;
  const delta = last - first;
  const direction: 'up' | 'down' | 'flat' = Math.abs(delta) < 0.05 ? 'flat' : delta > 0 ? 'up' : 'down';
  const maxValue = Math.max(...values.map((item) => item.y), 0);
  const peakIndex = values.findIndex((item) => item.y === maxValue);
  const peakDay = values[peakIndex]?.x ?? '';

  const pointSymbol = (props: { datum: { y: number } }) => {
    const isPeak = Number(props.datum.y) === maxValue;
    return (
      <circle
        r={isPeak ? 6 : 3}
        fill={isPeak ? SIGNAL_COLORS.motivation : '#0b1220'}
        stroke={SIGNAL_COLORS.motivation}
        strokeWidth={isPeak ? 2 : 1}
      />
    );
  };

  return (
    <Card className={`${styles.card} glassCard`}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Momentum</p>
          <h3 className={styles.title}>Motivation arc</h3>
        </div>
        <div className={styles.headerNote}>
          <Arrow direction={direction} />
          <span className={styles.trendLabel}>Slope {direction === 'flat' ? 'stable' : direction}</span>
        </div>
      </div>

      <div className={styles.chartWrap}>
        <ResponsiveLine
          data={[{ id: 'Motivation', color: SIGNAL_COLORS.motivation, data: values }]}
          margin={{ top: 20, right: 20, bottom: 30, left: 20 }}
          xScale={{ type: 'point' }}
          yScale={{ type: 'linear', min: 0, max: 1, stacked: false }}
          axisLeft={null}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 0,
            tickPadding: 10,
          }}
          colors={[SIGNAL_COLORS.motivation]}
          enablePoints
          pointSize={6}
          pointColor="#0b1220"
          pointBorderWidth={2}
          pointBorderColor={SIGNAL_COLORS.motivation}
          pointSymbol={pointSymbol}
          enableGridY
          gridYValues={4}
          enableGridX={false}
          lineWidth={3}
          enableSlices="x"
          crosshairType="x"
          sliceTooltip={({ slice }) => {
            const point = slice.points[0];
            const value = typeof point?.data.y === 'number' ? point.data.y : 0;
            const dateLabel = String(point?.data.xFormatted ?? point?.data.x ?? '');
            return (
              <div className={styles.tooltip}>
                <div className={styles.tooltipTitle}>Motivation</div>
                <div className={styles.tooltipDate}>{dateLabel}</div>
                <div className={styles.tooltipValue}>Score: {Math.round(value * 100)}%</div>
                <div className={styles.tooltipHint}>Meaning: {interpretationText('motivation', value)}</div>
              </div>
            );
          }}
          theme={{
            text: {
              fill: 'rgba(148, 163, 184, 0.9)',
              fontSize: 11,
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
                border: '1px solid rgba(0, 255, 163, 0.25)',
                padding: '8px 12px',
              },
            },
          }}
          animate
          motionConfig="gentle"
        />
      </div>

      <div className={styles.footer}>
        <span className={styles.footerLabel}>Peak day</span>
        <span className={styles.footerValue}>{peakDay || '—'}</span>
      </div>
    </Card>
  );
};
