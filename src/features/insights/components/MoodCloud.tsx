import { Card, Button, Skeleton } from '../../../components/ui';
import type { MoodWord } from '../../../services/insights.service';
import styles from './MoodCloud.module.css';

type MoodCloudProps = {
  data: MoodWord[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

const sizeClass = (value: number, max: number) => {
  const ratio = max === 0 ? 0 : value / max;
  if (ratio >= 0.75) return styles.sizeXL;
  if (ratio >= 0.55) return styles.sizeL;
  if (ratio >= 0.35) return styles.sizeM;
  return styles.sizeS;
};

export const MoodCloud = ({ data, loading, error, onRetry }: MoodCloudProps) => {
  if (loading) {
    return (
      <Card className={`${styles.card} glassCard`}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Mood Cloud</p>
            <h3 className={styles.title}>The emotional weather</h3>
          </div>
        </div>
        <Skeleton count={3} className={styles.skeletonRow} />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`${styles.card} glassCard`}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Mood Cloud</p>
            <h3 className={styles.title}>The emotional weather</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>We couldn’t load the mood cloud.</p>
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
            <p className={styles.kicker}>Mood Cloud</p>
            <h3 className={styles.title}>The emotional weather</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>No mood signals yet.</p>
          <p className={styles.stateHint}>We’ll start shaping this once reflections are captured.</p>
        </div>
      </Card>
    );
  }

  const max = Math.max(...data.map((item) => item.count), 0);

  return (
    <Card className={`${styles.card} glassCard`}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Mood Cloud</p>
          <h3 className={styles.title}>The emotional weather</h3>
        </div>
        <div className={styles.headerNote}>Dominant feelings from recent days.</div>
      </div>

      <div className={styles.cloud}>
        {data.map((item, index) => (
          <span
            key={`${item.word}-${index}`}
            className={`${styles.word} ${sizeClass(item.count, max)} ${index % 3 === 0 ? styles.wordAccent : ''}`}
          >
            {item.word}
          </span>
        ))}
      </div>
    </Card>
  );
};
