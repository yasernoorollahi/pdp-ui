import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, GlassPanel } from '../../../components/ui';
import type { JobLog } from '../../../services/system.service';
import styles from './JobExecutionHistory.module.css';

interface JobExecutionHistoryProps {
  jobs: JobLog[];
}

interface JobExecutionSummary {
  latestRun: JobLog;
  successfulRuns: number;
  totalRuns: number;
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
  const [highlightedJobNames, setHighlightedJobNames] = useState<string[]>([]);
  const previousLatestRunIdsRef = useRef<Record<string, string> | null>(null);
  const highlightTimeoutsRef = useRef<Record<string, number>>({});

  const recentJobSummaries = useMemo(
    () => Object.values(
      jobs.reduce<Record<string, JobExecutionSummary>>((accumulator, job) => {
        const existing = accumulator[job.jobName];

        if (!existing) {
          accumulator[job.jobName] = {
            latestRun: job,
            successfulRuns: job.status === 'SUCCESS' ? 1 : 0,
            totalRuns: 1,
          };
          return accumulator;
        }

        const hasNewerRun = new Date(job.startedAt).getTime() > new Date(existing.latestRun.startedAt).getTime();
        accumulator[job.jobName] = {
          latestRun: hasNewerRun ? job : existing.latestRun,
          successfulRuns: existing.successfulRuns + (job.status === 'SUCCESS' ? 1 : 0),
          totalRuns: existing.totalRuns + 1,
        };

        return accumulator;
      }, {})
    )
      .sort((a, b) => new Date(b.latestRun.startedAt).getTime() - new Date(a.latestRun.startedAt).getTime())
      .slice(0, 8),
    [jobs]
  );

  useEffect(() => {
    const previousLatestRunIds = previousLatestRunIdsRef.current;
    const nextLatestRunIds = Object.fromEntries(
      recentJobSummaries.map((summary) => [summary.latestRun.jobName, summary.latestRun.id])
    );

    if (previousLatestRunIds) {
      const updatedJobNames = recentJobSummaries
        .map((summary) => summary.latestRun.jobName)
        .filter((jobName) => previousLatestRunIds[jobName] !== nextLatestRunIds[jobName]);

      if (updatedJobNames.length > 0) {
        setHighlightedJobNames((current) => Array.from(new Set([...current, ...updatedJobNames])));

        updatedJobNames.forEach((jobName) => {
          window.clearTimeout(highlightTimeoutsRef.current[jobName]);
          highlightTimeoutsRef.current[jobName] = window.setTimeout(() => {
            setHighlightedJobNames((current) => current.filter((name) => name !== jobName));
            delete highlightTimeoutsRef.current[jobName];
          }, 3200);
        });
      }
    }

    previousLatestRunIdsRef.current = nextLatestRunIds;
  }, [recentJobSummaries]);

  useEffect(() => () => {
    Object.values(highlightTimeoutsRef.current).forEach((timeoutId) => window.clearTimeout(timeoutId));
  }, []);

  if (!jobs.length) {
    return (
      <GlassPanel className={styles.panel}>
        <div className={styles.empty}>No job executions have been recorded yet.</div>
      </GlassPanel>
    );
  }

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
        {recentJobSummaries.map(({ latestRun, successfulRuns, totalRuns }) => (
          <div
            key={latestRun.jobName}
            className={`${styles.run} ${highlightedJobNames.includes(latestRun.jobName) ? styles.runHighlight : ''}`}
          >
            <div className={styles.runTop}>
              <div className={styles.runTitleBlock}>
                <p className={styles.runName}>{latestRun.jobName}</p>
                {successfulRuns ? (
                  <div
                    aria-label={`${successfulRuns} successful runs`}
                    className={styles.successDots}
                  >
                    {Array.from({ length: successfulRuns }).map((_, index) => (
                      <span
                        key={`${latestRun.jobName}-success-${index + 1}`}
                        className={styles.successDot}
                        title={`Successful run ${index + 1}`}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
              <div className={styles.runMeta}>
                <Badge variant={getStatusVariant(latestRun.status)}>{latestRun.status}</Badge>
                <Badge variant="muted">{latestRun.duration}ms</Badge>
                <Badge variant="muted">{formatDateTime(latestRun.startedAt)}</Badge>
              </div>
            </div>
            <p className={styles.runInfo}>
              Processed {latestRun.processedCount} items
              {' - '}
              Finished {formatDateTime(latestRun.finishedAt)}
              {' - '}
              {totalRuns} total run{totalRuns === 1 ? '' : 's'}
            </p>
            {latestRun.errorMessage && <p className={styles.error}>{latestRun.errorMessage}</p>}
          </div>
        ))}
      </div>
    </GlassPanel>
  );
};
