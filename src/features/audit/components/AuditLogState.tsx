import { Button } from '../../../components/ui';
import styles from './AuditLogState.module.css';

interface AuditLogStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const AuditLogState = ({ title, message, actionLabel, onAction }: AuditLogStateProps) => (
  <div className={styles.state}>
    <div className={styles.icon}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    </div>
    <h4 className={styles.title}>{title}</h4>
    <p className={styles.message}>{message}</p>
    {actionLabel && onAction && (
      <Button variant="teal" onClick={onAction}>{actionLabel}</Button>
    )}
  </div>
);
