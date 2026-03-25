import { Badge, GlassPanel } from '../../../components/ui';
import type { JobLog } from '../../../services/system.service';
import styles from './JobExecutionHistory.module.css';

interface JobExecutionHistoryProps {
  jobs: JobLog[];
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString([], {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const getStatusVariant = (status: string) => {
  if (status === 'SUCCESS') return 'emerald' as const;
  if (status === 'FAILED') return 'red' as const;
  if (status === 'RUNNING') return 'gold' as const;
  return 'muted' as const;
};

export const JobExecutionHistory = ({ jobs }: JobExecutionHistoryProps) => {
  if (!jobs.length) {
    return (
      <GlassPanel className={styles.panel}>
        <div className={styles.empty}>No job executions have been recorded yet.</div>
      </GlassPanel>
    );
  }

  const recentRuns = [...jobs]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 8);

  const successCount = jobs.filter((job) => job.status === 'SUCCESS').length;
  const failedCount = jobs.filter((job) => job.status === 'FAILED').length;
  const runningCount = jobs.filter((job) => job.status === 'RUNNING').length;
  const averageDuration = Math.round(jobs.reduce((total, job) => total + job.duration, 0) / jobs.length);

  return (
    <GlassPanel className={styles.panel}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Recent execution activity</h3>
          <p className={styles.copy}>Latest scheduler runs from the live system overview feed.</p>
        </div>
      </div>

      <div className={styles.summary}>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Total Runs</p>
          <p className={styles.summaryValue}>{jobs.length}</p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Succeeded</p>
          <p className={styles.summaryValue}>{successCount}</p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Failed</p>
          <p className={styles.summaryValue}>{failedCount}</p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Running</p>
          <p className={styles.summaryValue}>{runningCount}</p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Avg Duration</p>
          <p className={styles.summaryValue}>{averageDuration}ms</p>
        </div>
      </div>

      <div className={styles.runs}>
        {recentRuns.map((job) => (
          <div key={job.id} className={styles.run}>
            <div className={styles.runTop}>
              <p className={styles.runName}>{job.jobName}</p>
              <div className={styles.runMeta}>
                <Badge variant={getStatusVariant(job.status)}>{job.status}</Badge>
                <Badge variant="muted">{job.duration}ms</Badge>
                <Badge variant="muted">{formatDateTime(job.startedAt)}</Badge>
              </div>
            </div>
            <p className={styles.runInfo}>
              Processed {job.processedCount} items
              {' - '}
              Finished {formatDateTime(job.finishedAt)}
            </p>
            {job.errorMessage && <p className={styles.error}>{job.errorMessage}</p>}
          </div>
        ))}
      </div>
    </GlassPanel>
  );
};
