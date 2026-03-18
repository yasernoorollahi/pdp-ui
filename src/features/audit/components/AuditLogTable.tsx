import { Badge } from '../../../components/ui';
import type { BusinessAuditLog, SecurityAuditLog } from '../../../services/audit.service';
import styles from './AuditLogTable.module.css';

interface AuditLogTableProps {
  variant: 'security' | 'business';
  logs: SecurityAuditLog[] | BusinessAuditLog[];
}

const formatEventLabel = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const getSuccessVariant = (success: boolean) => (success ? 'emerald' : 'red');

export const AuditLogTable = ({ variant, logs }: AuditLogTableProps) => (
  <div className={styles.table}>
    <div className={`${styles.header} ${variant === 'security' ? styles.security : styles.business}`}>
      <span>Event</span>
      <span>User</span>
      <span>Details</span>
      <span>Meta</span>
    </div>
    <div className={styles.body}>
      {logs.map((log) => (
        <div
          key={log.id}
          className={`${styles.row} ${variant === 'security' ? styles.security : styles.business}`}
        >
          <div className={styles.eventCol}>
            <Badge variant="teal">{formatEventLabel(log.eventType)}</Badge>
            <Badge variant={getSuccessVariant(log.success)} dot>
              {log.success ? 'Success' : 'Failed'}
            </Badge>
          </div>
          <div className={styles.userCol}>
            <p className={styles.primary}>{log.email ?? 'Unknown email'}</p>
            <p className={styles.secondary}>{log.userId ?? 'Unknown user'}</p>
          </div>
          <div className={styles.detailsCol}>
            <p className={`${styles.primary} ${styles.detailsText}`}>{log.details || 'No details provided.'}</p>
            {variant === 'security' && (
              <div className={styles.chips}>
                <span className={styles.chip}>{(log as SecurityAuditLog).ipAddress ?? 'IP N/A'}</span>
                <span className={styles.chip}>{(log as SecurityAuditLog).userAgent ?? 'Agent N/A'}</span>
              </div>
            )}
          </div>
          <div className={styles.metaCol}>
            <p className={styles.primary}>{formatDateTime(log.createdAt)}</p>
            <p className={styles.secondary}>ID: {log.id.slice(0, 8)}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);
