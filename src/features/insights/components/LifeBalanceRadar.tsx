import { useMemo } from 'react';
import { Card, Button, Skeleton } from '../../../components/ui';
import type { TimelinePoint } from '../../../services/insights.service';
import styles from './LifeBalanceRadar.module.css';

type LifeBalanceRadarProps = {
  data: TimelinePoint[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

const RADAR_LABELS = ['Work', 'Health', 'Social', 'Discipline', 'Energy'];

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const average = (values: number[]) => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const descriptor = (value: number) => {
  if (value >= 0.75) return 'High';
  if (value >= 0.5) return 'Balanced';
  if (value >= 0.25) return 'Low';
  return 'Minimal';
};

export const LifeBalanceRadar = ({ data, loading, error, onRetry }: LifeBalanceRadarProps) => {
  if (loading) {
    return (
      <Card className={`${styles.card} glassCard`}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Life Balance</p>
            <h3 className={styles.title}>Where your energy spreads</h3>
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
            <p className={styles.kicker}>Life Balance</p>
            <h3 className={styles.title}>Where your energy spreads</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>We couldn’t load balance insights.</p>
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
            <p className={styles.kicker}>Life Balance</p>
            <h3 className={styles.title}>Where your energy spreads</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>No balance signals yet.</p>
          <p className={styles.stateHint}>We need a few days of signals to map your radar.</p>
        </div>
      </Card>
    );
  }

  const energyAvg = average(data.map((item) => clamp01(item.energy)));
  const motivationAvg = average(data.map((item) => clamp01(item.motivation)));
  const frictionMax = Math.max(...data.map((item) => item.friction), 1);
  const socialMax = Math.max(...data.map((item) => item.social), 1);
  const disciplineMax = Math.max(...data.map((item) => item.discipline), 1);
  const frictionAvg = average(data.map((item) => clamp01(item.friction / frictionMax)));
  const socialAvg = average(data.map((item) => clamp01(item.social / socialMax)));
  const disciplineAvg = average(data.map((item) => clamp01(item.discipline / disciplineMax)));

  const values = [
    clamp01((motivationAvg + disciplineAvg) / 2),
    clamp01((energyAvg + (1 - frictionAvg)) / 2),
    socialAvg,
    disciplineAvg,
    energyAvg,
  ];

  const points = useMemo(() => {
    const cx = 60;
    const cy = 60;
    const radius = 42;
    const angleStep = (Math.PI * 2) / RADAR_LABELS.length;

    return RADAR_LABELS.map((_, index) => {
      const angle = -Math.PI / 2 + angleStep * index;
      const distance = radius * values[index];
      const x = cx + Math.cos(angle) * distance;
      const y = cy + Math.sin(angle) * distance;
      return `${x},${y}`;
    });
  }, [values]);

  const ringPoints = [0.33, 0.66, 1].map((multiplier) => {
    const cx = 60;
    const cy = 60;
    const radius = 42 * multiplier;
    const angleStep = (Math.PI * 2) / RADAR_LABELS.length;
    return RADAR_LABELS
      .map((_, index) => {
        const angle = -Math.PI / 2 + angleStep * index;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        return `${x},${y}`;
      })
      .join(' ');
  });

  return (
    <Card className={`${styles.card} glassCard`}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Life Balance</p>
          <h3 className={styles.title}>Where your energy spreads</h3>
        </div>
        <div className={styles.headerNote}>Balanced overview of recent patterns.</div>
      </div>

      <div className={styles.radarWrap}>
        <svg viewBox="0 0 120 120" className={styles.radar} role="img" aria-label="Life balance radar">
          <g className={styles.radarGrid}>
            {ringPoints.map((ring) => (
              <polygon key={ring} points={ring} />
            ))}
            {RADAR_LABELS.map((_, index) => {
              const angle = -Math.PI / 2 + (Math.PI * 2 * index) / RADAR_LABELS.length;
              const x = 60 + Math.cos(angle) * 42;
              const y = 60 + Math.sin(angle) * 42;
              return <line key={`axis-${index}`} x1="60" y1="60" x2={x} y2={y} />;
            })}
          </g>
          <polygon points={points.join(' ')} className={styles.radarFill} />
        </svg>

        <div className={styles.radarLegend}>
          {RADAR_LABELS.map((label, index) => (
            <div key={label} className={styles.legendRow}>
              <span className={styles.legendLabel}>{label}</span>
              <span className={styles.legendValue}>{descriptor(values[index])}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
