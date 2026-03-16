import { Skeleton } from '../../../components/ui';
import type { PdpMetric } from '../../../services/pdpMetrics.service';
import pageStyles from '../AdminStatsPage.module.css';
import { PdpMetricCard, type MetricKind } from './PdpMetricCard';
import styles from './PdpMetricsTab.module.css';

const METRIC_ORDER = [
  'pdp.auth.login.duration',
  'pdp.auth.login.failed',
  'pdp.auth.login.success',
  'pdp.auth.token.refresh',
  'pdp.extraction.failed',
  'pdp.extraction.requested',
  'pdp.insights.discipline',
  'pdp.insights.energy',
  'pdp.insights.friction',
  'pdp.insights.moods',
  'pdp.insights.motivation',
  'pdp.insights.social',
  'pdp.insights.summary',
  'pdp.insights.timeline',
  'pdp.insights.today',
  'pdp.item.archived',
  'pdp.item.create.duration',
  'pdp.item.created',
  'pdp.jobs.execution.duration',
  'pdp.jobs.execution.success',
  'pdp.moderation.case.auto_blocked',
  'pdp.moderation.case.created',
  'pdp.moderation.case.state.transition',
  'pdp.rate_limit.hit',
  'pdp.signal_engine.failure',
  'pdp.signal_engine.signals_stored',
  'pdp.signal_engine.success',
  'pdp.signal_normalization.failure',
  'pdp.signal_normalization.signals_normalized',
  'pdp.signal_normalization.success',
  'pdp.test_data.daily_behavior.seeded',
  'pdp.user_message.created',
  'pdp.user_message.deleted',
  'pdp.user_message.processed',
  'pdp.user_message.updated',
];

const CATEGORY_ORDER = [
  'auth',
  'extraction',
  'insights',
  'item',
  'jobs',
  'moderation',
  'rate_limit',
  'signal_engine',
  'signal_normalization',
  'test_data',
  'user_message',
  'other',
];

const CATEGORY_LABELS: Record<string, { title: string; badge: string }> = {
  auth: { title: 'Authentication', badge: 'Access' },
  extraction: { title: 'Extraction', badge: 'Pipeline' },
  insights: { title: 'Insights', badge: 'Signals' },
  item: { title: 'Items', badge: 'Content' },
  jobs: { title: 'Jobs', badge: 'Workers' },
  moderation: { title: 'Moderation', badge: 'Safety' },
  rate_limit: { title: 'Rate Limit', badge: 'Guardrail' },
  signal_engine: { title: 'Signal Engine', badge: 'Processing' },
  signal_normalization: { title: 'Signal Normalization', badge: 'Normalization' },
  test_data: { title: 'Test Data', badge: 'Seeding' },
  user_message: { title: 'User Messages', badge: 'Messaging' },
  other: { title: 'Other', badge: 'Misc' },
};

const orderMap = new Map(METRIC_ORDER.map((name, index) => [name, index]));

const formatNumber = (value: number) => {
  if (!Number.isFinite(value)) return '—';
  return value >= 1000 ? value.toLocaleString('en-US') : value.toFixed(0);
};

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '—';
  if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
  if (seconds < 60) return `${seconds.toFixed(2)}s`;
  const mins = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${mins}m ${remaining.toFixed(1)}s`;
};

const toTitle = (value: string) =>
  value
    .split(/[_\.]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getCategory = (name: string) => {
  const category = name.replace(/^pdp\./, '').split('.')[0] ?? 'other';
  return CATEGORY_LABELS[category] ? category : 'other';
};

const getMetricKind = (name: string, measurements: PdpMetric['measurements']): MetricKind => {
  const lower = name.toLowerCase();
  const hasDuration = lower.includes('duration') || measurements.some((m) => m.statistic === 'TOTAL_TIME');
  if (hasDuration) return 'duration';
  if (lower.includes('failed') || lower.includes('failure')) return 'error';
  if (lower.includes('rate_limit')) return 'warning';
  if (lower.includes('success') || lower.includes('created') || lower.includes('processed') || lower.includes('signals')) return 'success';
  if (lower.includes('deleted')) return 'error';
  if (lower.includes('updated')) return 'info';
  if (lower.includes('insights') || lower.includes('timeline') || lower.includes('summary') || lower.includes('moods')) return 'insight';
  return 'neutral';
};

const getMetricBadge = (kind: MetricKind) => {
  switch (kind) {
    case 'duration':
      return 'Timer';
    case 'success':
      return 'Volume';
    case 'error':
      return 'Error';
    case 'warning':
      return 'Alert';
    case 'info':
      return 'Info';
    case 'insight':
      return 'Insight';
    default:
      return 'Metric';
  }
};

const getPrimaryValue = (metric: PdpMetric) => {
  const stats = new Map(metric.measurements.map((m) => [m.statistic, m.value]));
  const count = stats.get('COUNT') ?? stats.get('VALUE') ?? 0;
  if (stats.has('TOTAL_TIME') && (stats.get('COUNT') ?? 0) > 0) {
    const avg = (stats.get('TOTAL_TIME') ?? 0) / (stats.get('COUNT') ?? 1);
    return {
      value: avg,
      label: 'Avg Duration',
      display: formatDuration(avg),
      secondary: [
        { label: 'Count', value: formatNumber(stats.get('COUNT') ?? 0) },
        { label: 'Max', value: formatDuration(stats.get('MAX') ?? 0) },
      ],
    };
  }

  if (stats.has('COUNT')) {
    return {
      value: stats.get('COUNT') ?? 0,
      label: 'Count',
      display: formatNumber(stats.get('COUNT') ?? 0),
      secondary: [
        { label: 'Value', value: formatNumber(stats.get('VALUE') ?? stats.get('COUNT') ?? 0) },
        { label: 'Max', value: formatNumber(stats.get('MAX') ?? stats.get('COUNT') ?? 0) },
      ],
    };
  }

  return {
    value: count,
    label: 'Value',
    display: formatNumber(count),
    secondary: [
      { label: 'Total', value: formatNumber(count) },
      { label: 'Max', value: formatNumber(stats.get('MAX') ?? count) },
    ],
  };
};

const getLevel = (value: number, max: number): 1 | 2 | 3 | 4 | 5 => {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 1;
  const ratio = value / max;
  if (ratio >= 0.85) return 5;
  if (ratio >= 0.6) return 4;
  if (ratio >= 0.4) return 3;
  if (ratio >= 0.2) return 2;
  return 1;
};

const buildSections = (metrics: PdpMetric[]) => {
  const grouped: Record<string, PdpMetric[]> = {};
  metrics.forEach((metric) => {
    const category = getCategory(metric.name);
    grouped[category] = grouped[category] ?? [];
    grouped[category].push(metric);
  });

  return CATEGORY_ORDER.filter((category) => grouped[category]?.length).map((category) => ({
    category,
    title: CATEGORY_LABELS[category]?.title ?? toTitle(category),
    badge: CATEGORY_LABELS[category]?.badge ?? 'Group',
    metrics: grouped[category]
      .slice()
      .sort((a, b) => {
        const orderA = orderMap.get(a.name) ?? 9999;
        const orderB = orderMap.get(b.name) ?? 9999;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      }),
  }));
};

const getMetricTitle = (name: string) => {
  const parts = name.replace(/^pdp\./, '').split('.');
  return toTitle(parts.slice(1).join('.')) || toTitle(parts.join('.'));
};

type PdpMetricsTabProps = {
  metrics: PdpMetric[];
  loading: boolean;
  error: string | null;
  updatedAt: string | null;
  onRetry: () => void;
};

export const PdpMetricsTab = ({ metrics, loading, error, updatedAt, onRetry }: PdpMetricsTabProps) => {
  const sections = buildSections(metrics);
  const totalCount = metrics.length;
  const totalCategories = sections.length;
  const updatedLabel = updatedAt ? new Date(updatedAt).toLocaleTimeString() : '—';

  if (loading && metrics.length === 0) {
    return (
      <div className={styles.tabWrap}>
        <div className={`${pageStyles.glassCard} ${styles.summaryCard}`}>
          <div className={styles.summaryHeader}>
            <div className={styles.summaryIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <div>
              <h3 className={styles.summaryTitle}>PDP Metrics</h3>
              <p className={styles.summarySubtitle}>Loading metrics from /actuator/metrics</p>
            </div>
          </div>
          <div className={styles.skeletonGrid}>
            <Skeleton count={6} className={styles.skeletonCard} />
          </div>
        </div>
      </div>
    );
  }

  if (error && metrics.length === 0) {
    return (
      <div className={styles.tabWrap}>
        <div className={styles.errorState}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="36" height="36">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h3 className={styles.stateTitle}>Unable to load PDP metrics</h3>
          <p className={styles.stateText}>{error}</p>
          <button type="button" onClick={onRetry} className={styles.errorButton}>
            Retry Metrics
          </button>
        </div>
      </div>
    );
  }

  if (!loading && metrics.length === 0) {
    return (
      <div className={styles.tabWrap}>
        <div className={styles.emptyState}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="36" height="36">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
          </svg>
          <h3 className={styles.stateTitle}>No PDP metrics yet</h3>
          <p className={styles.stateText}>Metrics with the `pdp.` prefix will appear here once they start emitting.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tabWrap}>
      <div className={`${pageStyles.glassCard} ${styles.summaryCard}`}>
        <div className={styles.summaryHeader}>
          <div className={styles.summaryIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <div>
            <h3 className={styles.summaryTitle}>PDP Metrics</h3>
            <p className={styles.summarySubtitle}>Live counters and timers streamed from /actuator/metrics</p>
            <p className={styles.summaryTime}>Last refresh: {updatedLabel}</p>
          </div>
        </div>
        <div className={styles.summaryStats}>
          <div className={styles.summaryStat}>
            <p className={styles.summaryValue}>{totalCount}</p>
            <p className={styles.summaryLabel}>Metrics</p>
          </div>
          <div className={styles.summaryStat}>
            <p className={styles.summaryValue}>{totalCategories}</p>
            <p className={styles.summaryLabel}>Categories</p>
          </div>
          <div className={styles.summaryStat}>
            <p className={styles.summaryValue}>{metrics.filter((m) => m.name.includes('failed')).length}</p>
            <p className={styles.summaryLabel}>Failure Counters</p>
          </div>
          <div className={styles.summaryStat}>
            <p className={styles.summaryValue}>{metrics.filter((m) => m.name.includes('duration')).length}</p>
            <p className={styles.summaryLabel}>Timers</p>
          </div>
        </div>
      </div>

      {sections.map((section) => {
        const values = section.metrics.map((metric) => getPrimaryValue(metric).value);
        const maxValue = values.length ? Math.max(...values) : 0;
        return (
          <section key={section.category} className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h4 className={styles.sectionTitle}>{section.title}</h4>
                <div className={styles.sectionMeta}>
                  <span>{section.metrics.length} metrics</span>
                  <span className={styles.sectionBadge}>{section.badge}</span>
                </div>
              </div>
            </div>
            <div className={styles.metricsGrid}>
              {section.metrics.map((metric) => {
                const summary = getPrimaryValue(metric);
                const kind = getMetricKind(metric.name, metric.measurements);
                return (
                  <PdpMetricCard
                    key={metric.name}
                    title={getMetricTitle(metric.name)}
                    metricKey={metric.name}
                    primaryValue={summary.display}
                    primaryLabel={summary.label}
                    secondary={summary.secondary}
                    kind={kind}
                    level={getLevel(summary.value, maxValue)}
                    badge={getMetricBadge(kind)}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};
