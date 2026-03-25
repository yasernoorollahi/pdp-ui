import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Button, GlassPanel, Skeleton, Switch } from '../../components/ui';
import { adminJobsService, type AdminJobsConfigResponse } from '../../services/adminJobs.service';
import type { JobLog } from '../../services/system.service';
import { JobControlList } from './components/JobControlList';
import { JobControlSummary } from './components/JobControlSummary';
import { JobExecutionHistory } from './components/JobExecutionHistory';
import styles from './JobsControlTab.module.css';

interface JobsControlTabProps {
  recentJobs: JobLog[];
}

const ALLOWED_JOB_KEYS = [
  'UserMessageAnalysisJob',
  'AiSignalEngineJob',
  'SignalNormalizationJob',
  'PurgeExpiredRefreshTokensJob',
  'NotificationEmailJob',
  'TestDataSeedingJob',
] as const;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || fallback;
  }

  return fallback;
};

const resolveGlobalEnabled = (config: Pick<AdminJobsConfigResponse, 'globalEnabled'>) =>
  config.globalEnabled ?? false;

const resolveJobEnabled = (job: AdminJobsConfigResponse['jobs'][number]) =>
  job.overrideEnabled ?? job.configuredEnabled ?? job.effectiveEnabled ?? false;

const buildDraftMap = (config: AdminJobsConfigResponse) =>
  Object.fromEntries(config.jobs.map((job) => [job.jobKey, resolveJobEnabled(job)]));

export const JobsControlTab = ({ recentJobs }: JobsControlTabProps) => {
  const [config, setConfig] = useState<AdminJobsConfigResponse | null>(null);
  const [draftGlobalEnabled, setDraftGlobalEnabled] = useState(true);
  const [draftJobs, setDraftJobs] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const hydrateFromConfig = (nextConfig: AdminJobsConfigResponse) => {
    setConfig(nextConfig);
    setDraftGlobalEnabled(resolveGlobalEnabled(nextConfig));
    setDraftJobs(buildDraftMap(nextConfig));
  };

  const loadConfig = async (withLoader = false) => {
    if (withLoader) {
      setLoading(true);
    }

    setError(null);

    try {
      const response = await adminJobsService.getJobsConfig();
      hydrateFromConfig(response);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Failed to load jobs configuration.'));
    } finally {
      if (withLoader) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadConfig(true);
  }, []);

  const isDirty = useMemo(() => {
    if (!config) return false;

    if (draftGlobalEnabled !== resolveGlobalEnabled(config)) return true;

    return config.jobs.some((job) => (draftJobs[job.jobKey] ?? resolveJobEnabled(job)) !== resolveJobEnabled(job));
  }, [config, draftGlobalEnabled, draftJobs]);

  const summary = useMemo(() => {
    if (!config) {
      return {
        totalJobs: 0,
        enabledJobs: 0,
        overriddenJobs: 0,
        blockedJobs: 0,
      };
    }

    const totalJobs = config.jobs.length;
    const enabledJobs = config.jobs.filter((job) => draftGlobalEnabled && (draftJobs[job.jobKey] ?? resolveJobEnabled(job))).length;
    const overriddenJobs = config.jobs.filter((job) => (draftJobs[job.jobKey] ?? resolveJobEnabled(job)) !== (job.configuredEnabled ?? false)).length;
    const blockedJobs = config.jobs.filter((job) => !draftGlobalEnabled && (draftJobs[job.jobKey] ?? resolveJobEnabled(job))).length;

    return {
      totalJobs,
      enabledJobs,
      overriddenJobs,
      blockedJobs,
    };
  }, [config, draftGlobalEnabled, draftJobs]);

  const jobDiagnostics = useMemo(() => {
    if (!config) {
      return {
        invalidKeys: [] as string[],
        missingKeys: [...ALLOWED_JOB_KEYS],
        canSave: false,
      };
    }

    const responseKeys = config.jobs.map((job) => job.jobKey);
    const invalidKeys = responseKeys.filter((key) => !ALLOWED_JOB_KEYS.includes(key as typeof ALLOWED_JOB_KEYS[number]));
    const missingKeys = ALLOWED_JOB_KEYS.filter((key) => !responseKeys.includes(key));

    return {
      invalidKeys,
      missingKeys,
      canSave: invalidKeys.length === 0,
    };
  }, [config]);

  const handleGlobalToggle = (enabled: boolean) => {
    setDraftGlobalEnabled(enabled);

    if (config) {
      setDraftJobs(
        Object.fromEntries(config.jobs.map((job) => [job.jobKey, enabled])),
      );
    }
  };

  const handleJobToggle = (jobKey: string, enabled: boolean) => {
    setDraftJobs((current) => {
      const next = {
        ...current,
        [jobKey]: enabled,
      };

      if (!config) {
        return next;
      }

      const anyEnabled = config.jobs.some((job) => next[job.jobKey] ?? resolveJobEnabled(job));
      setDraftGlobalEnabled(anyEnabled);

      return next;
    });
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await adminJobsService.updateJobsConfig({
        globalEnabled: draftGlobalEnabled,
        jobs: config.jobs.map((job) => ({
          jobKey: job.jobKey,
          enabled: draftJobs[job.jobKey] ?? resolveJobEnabled(job),
        })),
      });

      hydrateFromConfig(response);
      setFeedback('Job controls updated successfully.');
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Failed to save jobs configuration.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <GlassPanel className={styles.skeleton}>
          <Skeleton className={styles.skeletonBlock} count={2} />
          <Skeleton className={styles.skeletonBlock} count={3} />
        </GlassPanel>
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className={styles.container}>
        <GlassPanel className={styles.error}>
          <h3 className={styles.errorTitle}>Unable to load job controls</h3>
          <p className={styles.errorText}>{error}</p>
          <div>
            <Button onClick={() => void loadConfig(true)} variant="red">Retry</Button>
          </div>
        </GlassPanel>
        <JobExecutionHistory jobs={recentJobs} />
      </div>
    );
  }

  if (!config || config.jobs.length === 0) {
    return (
      <div className={styles.container}>
        <GlassPanel className={styles.empty}>
          <h3 className={styles.emptyTitle}>No jobs available</h3>
          <p className={styles.emptyText}>
            The admin jobs endpoint returned an empty configuration. Once schedulers are registered, controls will appear here.
          </p>
          <div>
            <Button onClick={() => void loadConfig(true)} variant="ghost">Refresh</Button>
          </div>
        </GlassPanel>
        <JobExecutionHistory jobs={recentJobs} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <JobControlSummary
        blockedJobs={summary.blockedJobs}
        enabledJobs={summary.enabledJobs}
        overriddenJobs={summary.overriddenJobs}
        totalJobs={summary.totalJobs}
      />

      <GlassPanel className={styles.hero}>
        <div className={styles.heroTop}>
          <div>
            <p className={styles.eyebrow}>Job Management</p>
            <h2 className={styles.title}>Global and per-job controls</h2>
          </div>
        </div>

        <div className={styles.heroBody}>
          <div className={styles.globalCard}>
            <div className={styles.globalHeader}>
              <div>
                <h3 className={styles.cardTitle}>Global execution</h3>
                <p className={styles.cardText}>Turn all schedulers on or off, then adjust individual jobs below.</p>
              </div>
              <Switch
                aria-label="Toggle all jobs"
                checked={draftGlobalEnabled}
                label={draftGlobalEnabled ? 'Enabled' : 'Disabled'}
                onChange={handleGlobalToggle}
              />
            </div>

            <JobControlList
              draftValues={draftJobs}
              embedded
              globalEnabled={draftGlobalEnabled}
              jobs={config.jobs}
              onResetJob={(jobKey) =>
                setDraftJobs((current) => {
                  const next = { ...current };
                  const job = config.jobs.find((entry) => entry.jobKey === jobKey);

                  if (job) {
                    next[jobKey] = resolveJobEnabled(job);
                  }

                  return next;
                })
              }
              onResetSearch={() => setSearchTerm('')}
              onSearchChange={setSearchTerm}
              onToggleJob={handleJobToggle}
              searchTerm={searchTerm}
            />
          </div>
        </div>

        <div className={styles.actions}>
          <div className={styles.actionsRight}>
            <Button disabled={!isDirty || !jobDiagnostics.canSave} loading={saving} onClick={handleSave} variant="teal">
              Save changes
            </Button>
          </div>
        </div>

        {error && <div className={`${styles.banner} ${styles.bannerError}`}>{error}</div>}
        {jobDiagnostics.invalidKeys.length > 0 && (
          <div className={`${styles.banner} ${styles.bannerError}`}>
            Invalid job key(s) from API: {jobDiagnostics.invalidKeys.join(', ')}. Save is disabled until the backend returns valid keys.
          </div>
        )}
        {jobDiagnostics.missingKeys.length > 0 && (
          <div className={`${styles.banner} ${styles.bannerWarning}`}>
            API returned {config.jobs.length} jobs. Missing expected key(s): {jobDiagnostics.missingKeys.join(', ')}.
          </div>
        )}
        {feedback && <div className={`${styles.banner} ${styles.bannerSuccess}`}>{feedback}</div>}
      </GlassPanel>

      <JobExecutionHistory jobs={recentJobs} />
    </div>
  );
};
