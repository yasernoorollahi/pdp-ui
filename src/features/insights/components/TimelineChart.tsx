import { Card, Button, Skeleton } from '../../../components/ui';
import type { TimelinePoint } from '../../../services/insights.service';
import styles from './TimelineChart.module.css';

type TimelineChartProps = {
  data: TimelinePoint[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  days: number;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const buildPath = (values: number[], width: number, height: number, padding: number) => {
  if (values.length === 0) return '';
  const maxX = width - padding * 2;
  const maxY = height - padding * 2;
  const step = values.length === 1 ? 0 : maxX / (values.length - 1);

  return values
    .map((value, index) => {
      const x = padding + step * index;
      const y = padding + (1 - clamp01(value)) * maxY;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
};

const formatShortDate = (dateStr: string) => {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const TimelineChart = ({ data, loading, error, onRetry, days }: TimelineChartProps) => {
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
        <Skeleton count={2} className={styles.skeletonRow} />
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

  const energyValues = data.map((item) => clamp01(item.energy));
  const motivationValues = data.map((item) => clamp01(item.motivation));
  const frictionMax = Math.max(...data.map((item) => item.friction), 1);
  const socialMax = Math.max(...data.map((item) => item.social), 1);
  const disciplineMax = Math.max(...data.map((item) => item.discipline), 1);

  const frictionValues = data.map((item) => clamp01(item.friction / frictionMax));
  const socialValues = data.map((item) => clamp01(item.social / socialMax));
  const disciplineValues = data.map((item) => clamp01(item.discipline / disciplineMax));

  const width = 100;
  const height = 36;
  const padding = 4;

  const lines = [
    { label: 'Energy', values: energyValues, className: styles.lineEnergy },
    { label: 'Motivation', values: motivationValues, className: styles.lineMotivation },
    { label: 'Friction', values: frictionValues, className: styles.lineFriction },
    { label: 'Social', values: socialValues, className: styles.lineSocial },
    { label: 'Discipline', values: disciplineValues, className: styles.lineDiscipline },
  ];

  const startLabel = formatShortDate(data[0].date);
  const endLabel = formatShortDate(data[data.length - 1].date);

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
        <svg viewBox={`0 0 ${width} ${height}`} className={styles.chart} role="img" aria-label="Behavioral timeline">
          <g className={styles.grid}>
            <line x1="0" y1="6" x2={width} y2="6" />
            <line x1="0" y1="18" x2={width} y2="18" />
            <line x1="0" y1="30" x2={width} y2="30" />
          </g>
          {lines.map((line) => (
            <path
              key={line.label}
              d={buildPath(line.values, width, height, padding)}
              className={line.className}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        <div className={styles.axisLabels}>
          <span>{startLabel}</span>
          <span>{endLabel}</span>
        </div>
      </div>

      <div className={styles.legend}>
        {lines.map((line) => (
          <div key={line.label} className={styles.legendItem}>
            <span className={`${styles.legendDot} ${line.className}`} />
            <span className={styles.legendLabel}>{line.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};
