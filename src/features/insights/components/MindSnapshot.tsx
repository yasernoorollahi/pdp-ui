import { Card, Button, Skeleton } from '../../../components/ui';
import type { MindSnapshot as MindSnapshotData } from '../../../services/insights.service';
import styles from './MindSnapshot.module.css';

type MindSnapshotProps = {
  data: MindSnapshotData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const normalizeCount = (value: number, max = 5) => clamp01(value / max);

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

const buildSegments = (value: number) => {
  const filled = Math.round(clamp01(value) * 10);
  return Array.from({ length: 10 }, (_, index) => index < filled);
};

export const MindSnapshot = ({ data, loading, error, onRetry }: MindSnapshotProps) => {
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
  const frictionScore = normalizeCount(data.friction, 4);
  const socialScore = normalizeCount(data.social, 4);
  const disciplineScore = normalizeCount(data.discipline, 4);

  const rows = [
    {
      label: 'Energy',
      value: energyScore,
      descriptor: scoreLabel(energyScore),
      variant: 'energy',
    },
    {
      label: 'Motivation',
      value: motivationScore,
      descriptor: scoreLabel(motivationScore),
      variant: 'motivation',
    },
    {
      label: 'Friction',
      value: frictionScore,
      descriptor: frictionLabel(frictionScore),
      variant: 'friction',
    },
    {
      label: 'Social',
      value: socialScore,
      descriptor: socialLabel(socialScore),
      variant: 'social',
    },
    {
      label: 'Discipline',
      value: disciplineScore,
      descriptor: disciplineLabel(disciplineScore),
      variant: 'discipline',
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

      <div className={styles.rows}>
        {rows.map((row) => (
          <div key={row.label} className={styles.row}>
            <div className={styles.rowHeader}>
              <span className={styles.rowLabel}>{row.label}</span>
              <span className={`${styles.rowDescriptor} ${styles[row.variant]}`}>{row.descriptor}</span>
            </div>
            <div className={styles.bar}>
              {buildSegments(row.value).map((active, index) => (
                <span
                  key={`${row.label}-${index}`}
                  className={`${styles.barSegment} ${active ? styles.barSegmentActive : ''} ${styles[row.variant]}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
