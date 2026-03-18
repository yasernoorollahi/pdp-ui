import { Skeleton } from '../../../components/ui';
import styles from './AuditLogSkeleton.module.css';

export const AuditLogSkeleton = () => (
  <div className={styles.wrap}>
    <Skeleton count={4} className={styles.row} />
  </div>
);
