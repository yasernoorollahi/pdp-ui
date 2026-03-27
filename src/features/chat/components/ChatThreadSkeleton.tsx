import styles from './ChatThreadSkeleton.module.css';

export const ChatThreadSkeleton = () => {
  return (
    <section className={styles.skeletonWrap} aria-hidden>
      <div className={styles.headerRow}>
        <div className={styles.titleBlock} />
        <div className={styles.pillBlock} />
      </div>
      <div className={styles.leftRow}>
        <div className={`${styles.bubble} ${styles.shortLine}`} />
      </div>
      <div className={styles.rightRow}>
        <div className={`${styles.bubble} ${styles.longLine}`} />
      </div>
      <div className={styles.leftRow}>
        <div className={`${styles.bubble} ${styles.longLine}`} />
      </div>
      <div className={styles.rightRow}>
        <div className={`${styles.bubble} ${styles.mediumLine}`} />
      </div>
      <div className={styles.leftRow}>
        <div className={`${styles.bubble} ${styles.mediumLine}`} />
      </div>
    </section>
  );
};
