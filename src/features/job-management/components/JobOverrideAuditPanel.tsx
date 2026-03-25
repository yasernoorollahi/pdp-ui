import { Badge, GlassPanel } from '../../../components/ui';
import type { AdminJobOverrideAuditItem } from '../../../services/adminJobs.service';
import styles from './JobOverrideAuditPanel.module.css';

interface JobOverrideAuditPanelProps {
  items: AdminJobOverrideAuditItem[];
  loading: boolean;
  error: string | null;
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString([], {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const normalizeJobKey = (item: AdminJobOverrideAuditItem) => item.jobKey ?? item.jobkey ?? 'UnknownJob';

export const JobOverrideAuditPanel = ({ items, loading, error }: JobOverrideAuditPanelProps) => (
  <GlassPanel className={styles.panel}>
    <div className={styles.header}>
      <div>
        <h3 className={styles.title}>Latest DB override changes</h3>
        <p className={styles.copy}>
          Shows the latest persisted override mutations so the UI can verify that database-level changes were actually written.
        </p>
      </div>
      <div className={styles.meta}>
        <Badge variant={loading ? 'gold' : error ? 'red' : 'emerald'}>
          {loading ? 'Loading DB changes' : error ? 'DB feed unavailable' : 'DB feed connected'}
        </Badge>
      </div>
    </div>

    {loading ? (
      <div className={styles.state}>Loading latest override changes from the database-backed endpoint...</div>
    ) : error ? (
      <div className={styles.state}>{error}</div>
    ) : items.length === 0 ? (
      <div className={styles.state}>No persisted override changes were returned by the audit endpoint yet.</div>
    ) : (
      <div className={styles.list}>
        {items.map((item, index) => (
          <div className={styles.item} key={`${normalizeJobKey(item)}-${item.updatedAt}-${index}`}>
            <div>
              <p className={styles.jobName}>{normalizeJobKey(item)}</p>
              <p className={styles.details}>
                Updated at {formatDateTime(item.updatedAt)}
                {' · '}
                Updated by {item.updatedBy || 'unknown'}
              </p>
            </div>
            <div className={styles.status}>
              <Badge variant={item.enabledOverride ? 'teal' : 'red'}>
                Override: {item.enabledOverride ? 'Enabled' : 'Disabled'}
              </Badge>
              <Badge variant="muted">{formatDateTime(item.updatedAt)}</Badge>
            </div>
          </div>
        ))}
      </div>
    )}
  </GlassPanel>
);
