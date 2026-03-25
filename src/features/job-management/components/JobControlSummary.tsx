import { GlassPanel } from '../../../components/ui';
import styles from './JobControlSummary.module.css';

interface JobControlSummaryProps {
  totalJobs: number;
  enabledJobs: number;
  overriddenJobs: number;
  blockedJobs: number;
}

const summaryItems = [
  {
    key: 'total',
    label: 'Registered Jobs',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path d="M8 20h8" />
        <path d="M12 18v2" />
      </svg>
    ),
    tone: 'blue',
  },
  {
    key: 'enabled',
    label: 'Effective Enabled',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    tone: 'teal',
  },
  {
    key: 'overridden',
    label: 'Manual Overrides',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
        <path d="M14.7 6.3a1 1 0 0 1 1.4 0l1.6 1.6a1 1 0 0 1 0 1.4L9 18l-4 1 1-4 8.7-8.7Z" />
      </svg>
    ),
    tone: 'gold',
  },
  {
    key: 'blocked',
    label: 'Suppressed Globally',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
        <circle cx="12" cy="12" r="9" />
        <path d="M8.5 8.5l7 7" />
      </svg>
    ),
    tone: 'red',
  },
];

export const JobControlSummary = ({
  totalJobs,
  enabledJobs,
  overriddenJobs,
  blockedJobs,
}: JobControlSummaryProps) => {
  const values: Record<string, number> = {
    total: totalJobs,
    enabled: enabledJobs,
    overridden: overriddenJobs,
    blocked: blockedJobs,
  };

  return (
    <div className={styles.grid}>
      {summaryItems.map((item) => (
        <GlassPanel key={item.key} className={styles.card}>
          <div className={`${styles.iconWrap} ${styles[item.tone as 'blue' | 'teal' | 'gold' | 'red']}`}>
            {item.icon}
          </div>
          <div>
            <p className={styles.value}>{values[item.key]}</p>
            <p className={styles.label}>{item.label}</p>
          </div>
        </GlassPanel>
      ))}
    </div>
  );
};
