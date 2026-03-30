import { Card, Button, Skeleton } from '../../../components/ui';
import { ResponsiveBar } from '@nivo/bar';
import type { SocialTrend } from '../../../services/insights.service';
import { SIGNAL_COLORS, clamp01, formatShortDate, interpretationText, levelLabel } from '../utils/signalUtils';
import styles from './NewSocialPulseBar.module.css';

type NewSocialPulseBarProps = {
  data: SocialTrend | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

export const NewSocialPulseBar = ({ data, loading, error, onRetry }: NewSocialPulseBarProps) => {
  if (loading) {
    return (
      <Card className={`${styles.card} glassCard`}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Social Pulse</p>
            <h3 className={styles.title}>Interaction intensity</h3>
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
            <p className={styles.kicker}>Social Pulse</p>
            <h3 className={styles.title}>Interaction intensity</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>We couldn’t load social pulse.</p>
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
            <p className={styles.kicker}>Social Pulse</p>
            <h3 className={styles.title}>Interaction intensity</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>No social signals yet.</p>
          <p className={styles.stateHint}>We’ll show this once social signals appear.</p>
        </div>
      </Card>
    );
  }

  const max = Math.max(...data.trend.map((item) => item.value), 1);

  const chartData = data.trend.map((point) => {
    const normalized = clamp01(point.value / max);
    return {
      date: formatShortDate(point.date),
      value: Math.round(normalized * 100),
      raw: point.value,
      level: levelLabel(normalized),
    };
  });

  return (
    <Card className={`${styles.card} glassCard`}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Social Pulse</p>
          <h3 className={styles.title}>Interaction intensity</h3>
        </div>
        <div className={styles.headerNote}>Bars make activity obvious.</div>
      </div>

      <div className={styles.chartWrap}>
        <ResponsiveBar
          data={chartData}
          keys={['value']}
          indexBy="date"
          margin={{ top: 20, right: 20, bottom: 30, left: 30 }}
          padding={0.3}
          valueScale={{ type: 'linear', min: 0, max: 100 }}
          colors={[SIGNAL_COLORS.social]}
          borderRadius={6}
          axisLeft={null}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 0,
            tickPadding: 10,
          }}
          enableGridY
          gridYValues={4}
          tooltip={(datum) => {
            const value = (datum.data as { value: number }).value / 100;
            return (
              <div className={styles.tooltip}>
                <div className={styles.tooltipTitle}>Social Pulse</div>
                <div className={styles.tooltipDate}>{datum.indexValue}</div>
                <div className={styles.tooltipValue}>Social activity: {(datum.data as { level: string }).level}</div>
                <div className={styles.tooltipHint}>{interpretationText('social', value)}</div>
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
                border: '1px solid rgba(91, 140, 255, 0.25)',
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
