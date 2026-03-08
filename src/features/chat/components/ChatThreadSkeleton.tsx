import { Skeleton } from '../../../components/ui';
import styles from './ChatThreadSkeleton.module.css';

export const ChatThreadSkeleton = () => {
  return (
    <section className={styles.skeletonWrap} aria-hidden>
      <div className={styles.leftRow}>
        <Skeleton count={1} className={styles.shortLine} />
      </div>
      <div className={styles.rightRow}>
        <Skeleton count={1} className={styles.longLine} />
      </div>
      <div className={styles.leftRow}>
        <Skeleton count={1} className={styles.longLine} />
      </div>
      <div className={styles.rightRow}>
        <Skeleton count={1} className={styles.mediumLine} />
      </div>
      <div className={styles.leftRow}>
        <Skeleton count={1} className={styles.mediumLine} />
      </div>
    </section>
  );
};
