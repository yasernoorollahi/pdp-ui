import styles from './Skeleton.module.css';

interface SkeletonProps {
  count?: number;
  height?: string;
  className?: string;
}

export const Skeleton = ({ count = 3, height, className }: SkeletonProps) => (
  <div className={styles.wrap}>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className={`${styles.skeleton} ${className ?? ''}`}
        style={{ height, animationDelay: `${i * 0.1}s` }}
      />
    ))}
  </div>
);
