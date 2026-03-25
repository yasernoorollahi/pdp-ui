import type { ChangeEvent } from 'react';
import { Badge, Input, Switch } from '../../../components/ui';
import type { AdminJobConfig } from '../../../services/adminJobs.service';
import styles from './JobControlList.module.css';

interface JobControlListProps {
  jobs: AdminJobConfig[];
  draftValues: Record<string, boolean>;
  globalEnabled: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onResetSearch: () => void;
  onToggleJob: (jobKey: string, enabled: boolean) => void;
  onResetJob: (jobKey: string) => void;
  embedded?: boolean;
}

const SearchIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const resolveJobEnabled = (job: AdminJobConfig) =>
  job.overrideEnabled ?? job.configuredEnabled ?? job.effectiveEnabled ?? false;

const getSwitchDescription = (globalEnabled: boolean, draftEnabled: boolean) => {
  if (!globalEnabled) {
    return 'Disabled by global control';
  }

  return draftEnabled ? 'Applies immediately after save' : 'This job will remain off after save';
};

export const JobControlList = ({
  jobs,
  draftValues,
  globalEnabled,
  searchTerm,
  onSearchChange,
  onResetSearch,
  onToggleJob,
  onResetJob,
  embedded = false,
}: JobControlListProps) => {
  const filteredJobs = jobs.filter((job) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;
    return (
      job.jobKey.toLowerCase().includes(query) ||
      job.description.toLowerCase().includes(query)
    );
  });

  const content = (
    <>
      {!embedded ? (
        <div className={styles.toolbar}>
          <div className={styles.toolbarCopy}>
            <h3 className={styles.sectionTitle}>Per-job overrides</h3>
            <p className={styles.sectionText}>Search, override, or reset each scheduler independently.</p>
          </div>
          <Input
            aria-label="Search jobs"
            className={styles.search}
            icon={SearchIcon}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onSearchChange(event.target.value)}
            onClear={searchTerm ? onResetSearch : undefined}
            placeholder="Search by key or description"
            value={searchTerm}
          />
        </div>
      ) : null}

      {filteredJobs.length === 0 ? (
        <div className={styles.empty}>No jobs matched the current filter.</div>
      ) : (
        <div className={`${styles.list} ${embedded ? styles.listEmbedded : ''}`}>
          {filteredJobs.map((job) => {
            const baselineEnabled = resolveJobEnabled(job);
            const configuredEnabled = job.configuredEnabled ?? false;
            const draftEnabled = draftValues[job.jobKey] ?? baselineEnabled;
            const isDirty = draftEnabled !== baselineEnabled;
            const effectiveEnabled = globalEnabled && draftEnabled;

            return (
              <div
                key={job.jobKey}
                className={`${styles.row} ${embedded ? styles.rowEmbedded : ''} ${!effectiveEnabled && draftEnabled ? styles.rowMuted : ''}`}
              >
                <div className={styles.jobIdentity}>
                  <div className={styles.jobSummary}>
                    <p className={styles.jobName}>{job.jobKey}</p>
                    <p className={styles.jobDescription}>{job.description || 'No description provided.'}</p>
                  </div>
                  <div className={styles.meta}>
                    <Badge variant={configuredEnabled ? 'emerald' : 'muted'}>
                      Configured: {configuredEnabled ? 'On' : 'Off'}
                    </Badge>
                    <Badge variant={draftEnabled ? 'teal' : 'muted'}>
                      Override: {draftEnabled ? 'On' : 'Off'}
                    </Badge>
                    <Badge variant={effectiveEnabled ? 'emerald' : 'red'}>
                      Effective: {effectiveEnabled ? 'Running' : 'Stopped'}
                    </Badge>
                  </div>
                </div>

                <div className={styles.control}>
                  <Switch
                    aria-label={`Toggle ${job.jobKey}`}
                    checked={draftEnabled}
                    description={getSwitchDescription(globalEnabled, draftEnabled)}
                    label={draftEnabled ? 'Enabled' : 'Disabled'}
                    onChange={(checked) => onToggleJob(job.jobKey, checked)}
                  />
                </div>

                <div className={styles.actions}>
                  <button
                    className={styles.resetBtn}
                    disabled={!isDirty}
                    onClick={() => onResetJob(job.jobKey)}
                    type="button"
                  >
                    Reset
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className={styles.embeddedRoot}>{content}</div>;
  }

  return <div className={styles.panel}>{content}</div>;
};
