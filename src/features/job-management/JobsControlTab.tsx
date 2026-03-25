import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Badge, Button, GlassPanel, Skeleton, Switch } from '../../components/ui';
import { adminJobsService, type AdminJobsConfigResponse } from '../../services/adminJobs.service';
import type { JobLog } from '../../services/system.service';
import { JobControlList } from './components/JobControlList';
import { JobControlSummary } from './components/JobControlSummary';
import { JobExecutionHistory } from './components/JobExecutionHistory';
import { JobOverrideAuditPanel } from './components/JobOverrideAuditPanel';
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

const formatGeneratedAt = (value: string) =>
  new Date(value).toLocaleString([], {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

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
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<string | null>(null);
  const [auditItems, setAuditItems] = useState<Awaited<ReturnType<typeof adminJobsService.getJobOverrideAudit>>>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState<string | null>(null);

  const hydrateFromConfig = (nextConfig: AdminJobsConfigResponse) => {
    setConfig(nextConfig);
    setDraftGlobalEnabled(resolveGlobalEnabled(nextConfig));
    setDraftJobs(buildDraftMap(nextConfig));
  };

  const loadConfig = async (withLoader = false) => {
    if (withLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError(null);

    try {
      const response = await adminJobsService.getJobsConfig();
      hydrateFromConfig(response);
      setLoadedAt(new Date().toISOString());
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Failed to load jobs configuration.'));
    } finally {
      if (withLoader) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  const loadAudit = async (withLoader = false) => {
    if (withLoader) {
      setAuditLoading(true);
    }

    setAuditError(null);

    try {
      const response = await adminJobsService.getJobOverrideAudit();
      setAuditItems(
        [...response].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
      );
    } catch (requestError) {
      setAuditError(getErrorMessage(requestError, 'Latest DB override changes endpoint is unavailable.'));
    } finally {
      if (withLoader) {
        setAuditLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadConfig(true);
    void loadAudit(true);
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

  const handleRefresh = async () => {
    setFeedback(null);
    await Promise.all([loadConfig(false), loadAudit(false)]);
  };

  const handleResetAll = () => {
    if (!config) return;
    setFeedback(null);
    setDraftGlobalEnabled(resolveGlobalEnabled(config));
    setDraftJobs(buildDraftMap(config));
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
      await loadAudit(false);
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
      <GlassPanel className={styles.hero}>
        <div className={styles.heroTop}>
          <div>
            <p className={styles.eyebrow}>Job Management</p>
            <h2 className={styles.title}>Control scheduler availability from one place</h2>
            <p className={styles.description}>
              Global shutdown and per-job overrides are staged locally first, then persisted together so admins can make safe coordinated changes.
            </p>
          </div>
          <div className={styles.meta}>
            <Badge variant={draftGlobalEnabled ? 'emerald' : 'red'}>
              Global: {draftGlobalEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
            <Badge variant={(config.globalOverride ?? false) ? 'gold' : 'muted'}>
              Global override: {(config.globalOverride ?? false) ? 'Manual' : 'Default'}
            </Badge>
            <Badge variant={jobDiagnostics.invalidKeys.length === 0 ? 'emerald' : 'red'}>
              Keys: {config.jobs.length}/{ALLOWED_JOB_KEYS.length}
            </Badge>
            <Badge variant="muted">Generated: {formatGeneratedAt(config.generatedAt)}</Badge>
          </div>
        </div>

        <div className={styles.heroBody}>
          <div className={styles.globalCard}>
            <div className={styles.globalHeader}>
              <div>
                <h3 className={styles.cardTitle}>Global execution switch</h3>
                <p className={styles.cardText}>
                  Turn every scheduler on or off instantly. Per-job overrides stay stored locally and on the server, but effective execution follows the global switch.
                </p>
              </div>
              <Switch
                aria-label="Toggle all jobs"
                checked={draftGlobalEnabled}
                label={draftGlobalEnabled ? 'All jobs enabled' : 'All jobs paused'}
                onChange={setDraftGlobalEnabled}
              />
            </div>

            <div className={styles.globalMeta}>
              <div className={styles.metaCard}>
                <p className={styles.metaLabel}>Draft state</p>
                <p className={styles.metaValue}>{draftGlobalEnabled ? 'Schedulers can run' : 'Schedulers are suppressed'}</p>
              </div>
              <div className={styles.metaCard}>
                <p className={styles.metaLabel}>Unsaved changes</p>
                <p className={styles.metaValue}>{isDirty ? 'Pending review' : 'None'}</p>
              </div>
              <div className={styles.metaCard}>
                <p className={styles.metaLabel}>Jobs loaded</p>
                <p className={styles.metaValue}>{config.jobs.length} returned by GET /api/admin/jobs</p>
              </div>
              <div className={styles.metaCard}>
                <p className={styles.metaLabel}>Last fetch</p>
                <p className={styles.metaValue}>{loadedAt ? formatGeneratedAt(loadedAt) : 'Waiting for first successful load'}</p>
              </div>
            </div>
          </div>

          <div className={styles.statusCard}>
            <div className={styles.statusHeader}>
              <div>
                <h3 className={styles.cardTitle}>Control status</h3>
                <p className={styles.cardText}>Quick read on what will happen if you save the current draft.</p>
              </div>
            </div>

            <div className={styles.statusStack}>
              <div className={styles.statusItem}>
                <p className={styles.statusLabel}>Effective enabled jobs</p>
                <p className={styles.statusValue}>{summary.enabledJobs} of {summary.totalJobs}</p>
              </div>
              <div className={styles.statusItem}>
                <p className={styles.statusLabel}>Manual overrides</p>
                <p className={styles.statusValue}>{summary.overriddenJobs} jobs differ from configured defaults</p>
              </div>
              <div className={styles.statusItem}>
                <p className={styles.statusLabel}>Global suppression</p>
                <p className={styles.statusValue}>{summary.blockedJobs} enabled jobs would stay paused if global is off</p>
              </div>
              <div className={styles.statusItem}>
                <p className={styles.statusLabel}>Expected keys</p>
                <p className={styles.statusValue}>
                  {jobDiagnostics.missingKeys.length === 0
                    ? 'All expected job keys are present'
                    : `Missing: ${jobDiagnostics.missingKeys.join(', ')}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <div className={styles.actionsLeft}>
            <Button loading={refreshing} onClick={() => void handleRefresh()} variant="ghost">Refresh</Button>
            <Button disabled={!isDirty || saving} onClick={handleResetAll} variant="ghost">Reset draft</Button>
          </div>
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

      <JobControlSummary
        blockedJobs={summary.blockedJobs}
        enabledJobs={summary.enabledJobs}
        overriddenJobs={summary.overriddenJobs}
        totalJobs={summary.totalJobs}
      />

      <JobOverrideAuditPanel
        error={auditError}
        items={auditItems.slice(0, 6)}
        loading={auditLoading}
      />

      <JobControlList
        draftValues={draftJobs}
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
        onToggleJob={(jobKey, enabled) =>
          setDraftJobs((current) => ({
            ...current,
            [jobKey]: enabled,
          }))
        }
        searchTerm={searchTerm}
      />

      <JobExecutionHistory jobs={recentJobs} />
    </div>
  );
};
