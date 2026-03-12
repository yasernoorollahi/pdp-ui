import { Card, Button, Skeleton } from '../../../components/ui';
import type { TimelinePoint } from '../../../services/insights.service';
import { ResponsiveRadar } from '@nivo/radar';
import styles from './NewLifeBalanceRadar.module.css';

type NewLifeBalanceRadarProps = {
  data: TimelinePoint[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

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

export const NewLifeBalanceRadar = ({ data, loading, error, onRetry }: NewLifeBalanceRadarProps) => {
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

  const radarData = [
    {
      dimension: 'Work',
      value: clamp01((motivationAvg + disciplineAvg) / 2),
    },
    {
      dimension: 'Health',
      value: clamp01((energyAvg + (1 - frictionAvg)) / 2),
    },
    {
      dimension: 'Social',
      value: socialAvg,
    },
    {
      dimension: 'Discipline',
      value: disciplineAvg,
    },
    {
      dimension: 'Energy',
      value: energyAvg,
    },
  ];

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
        <div className={styles.radarChart}>
          <ResponsiveRadar
            data={radarData}
            keys={['value']}
            indexBy="dimension"
            maxValue={1}
            margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
            curve="linearClosed"
            borderWidth={2}
            borderColor="#2dd4bf"
            gridLevels={5}
            gridShape="linear"
            dotSize={6}
            dotColor="#2dd4bf"
            dotBorderWidth={2}
            dotBorderColor="#0d9488"
            colors={['rgba(45, 212, 191, 0.2)']}
            fillOpacity={0.3}
            blendMode="screen"
            isInteractive={false}
            theme={{
              text: {
                fill: '#94a3b8',
                fontSize: 11,
              },
              grid: {
                line: {
                  stroke: 'rgba(255,255,255,0.08)',
                  strokeWidth: 1,
                },
              },
            }}
          />
        </div>

        <div className={styles.radarLegend}>
          {radarData.map((item) => (
            <div key={item.dimension} className={styles.legendRow}>
              <span className={styles.legendLabel}>{item.dimension}</span>
              <span className={styles.legendValue}>{descriptor(item.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
