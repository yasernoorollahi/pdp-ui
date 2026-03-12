import { Card, Button, Skeleton } from '../../../components/ui';
import { ResponsiveLine } from '@nivo/line';
import type { EnergyTrend } from '../../../services/insights.service';
import { SIGNAL_COLORS, clamp01, formatShortDate, interpretationText } from '../utils/signalUtils';
import styles from './NewDailyRhythmChart.module.css';

type NewDailyRhythmChartProps = {
  data: EnergyTrend | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

export const NewDailyRhythmChart = ({ data, loading, error, onRetry }: NewDailyRhythmChartProps) => {
  if (loading) {
    return (
      <Card className={`${styles.card} glassCard`}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Daily Rhythm</p>
            <h3 className={styles.title}>Energy waveform</h3>
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
            <p className={styles.kicker}>Daily Rhythm</p>
            <h3 className={styles.title}>Energy waveform</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>We couldn’t load your daily rhythm.</p>
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
            <p className={styles.kicker}>Daily Rhythm</p>
            <h3 className={styles.title}>Energy waveform</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>No rhythm signals yet.</p>
          <p className={styles.stateHint}>We’ll show this once energy signals appear.</p>
        </div>
      </Card>
    );
  }

  const values = data.trend.map((point) => ({
    x: formatShortDate(point.date),
    y: clamp01(point.value),
  }));

  return (
    <Card className={`${styles.card} glassCard`}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Daily Rhythm</p>
          <h3 className={styles.title}>Energy waveform</h3>
        </div>
        <div className={styles.headerNote}>Smooth rhythm with gradient fill.</div>
      </div>

      <div className={styles.chartWrap}>
        <ResponsiveLine
          data={[{ id: 'Energy', color: SIGNAL_COLORS.energy, data: values }]}
          margin={{ top: 20, right: 20, bottom: 30, left: 20 }}
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
          colors={[SIGNAL_COLORS.energy]}
          enablePoints
          pointSize={6}
          pointColor="#0b1220"
          pointBorderWidth={2}
          pointBorderColor={SIGNAL_COLORS.energy}
          enableGridY
          gridYValues={4}
          enableGridX={false}
          lineWidth={3}
          enableArea
          areaOpacity={0.35}
          enableSlices="x"
          crosshairType="x"
          defs={[
            {
              id: 'energyGradient',
              type: 'linearGradient',
              colors: [
                { offset: 0, color: SIGNAL_COLORS.energy, opacity: 0.45 },
                { offset: 100, color: SIGNAL_COLORS.energy, opacity: 0 },
              ],
            },
          ]}
          fill={[{ match: '*', id: 'energyGradient' }]}
          sliceTooltip={({ slice }) => {
            const point = slice.points[0];
            const value = typeof point?.data.y === 'number' ? point.data.y : 0;
            const dateLabel = String(point?.data.xFormatted ?? point?.data.x ?? '');
            return (
              <div className={styles.tooltip}>
                <div className={styles.tooltipTitle}>Energy</div>
                <div className={styles.tooltipDate}>{dateLabel}</div>
                <div className={styles.tooltipValue}>Score: {Math.round(value * 100)}%</div>
                <div className={styles.tooltipHint}>Meaning: {interpretationText('energy', value)}</div>
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
