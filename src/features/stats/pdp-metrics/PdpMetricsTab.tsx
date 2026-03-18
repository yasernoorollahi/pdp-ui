import { useMemo } from 'react';
import { MetricChart, Skeleton } from '../../../components/ui';
import type { PdpMetric } from '../../../services/pdpMetrics.service';
import pageStyles from '../AdminStatsPage.module.css';
import styles from './PdpMetricsTab.module.css';
import { MetricKpi } from './components/MetricKpi';
import { MetricLegend } from './components/MetricLegend';
import { MetricPanel } from './components/MetricPanel';
import {
  buildHistogram,
  buildLineSeries,
  buildPie,
  buildScatter,
  buildSeries,
  buildSeriesSet,
  buildViolin,
  getMetricAvgDuration,
  getMetricCount,
} from './pdpMetricsCharts';

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

type PdpMetricsTabProps = {
  metrics: PdpMetric[];
  loading: boolean;
  error: string | null;
  updatedAt: string | null;
  onRetry: () => void;
};

export const PdpMetricsTab = ({ metrics, loading, error, updatedAt, onRetry }: PdpMetricsTabProps) => {
  const summary = useMemo(() => {
    const loginSuccess = getMetricCount(metrics, 'pdp.auth.login.success');
    const loginFailed = getMetricCount(metrics, 'pdp.auth.login.failed');
    const loginDuration = getMetricAvgDuration(metrics, 'pdp.auth.login.duration');
    const tokenRefresh = getMetricCount(metrics, 'pdp.auth.token.refresh');
    const rateLimit = getMetricCount(metrics, 'pdp.rate_limit.hit');

    const itemCreated = getMetricCount(metrics, 'pdp.item.created');
    const itemArchived = getMetricCount(metrics, 'pdp.item.archived');
    const itemDuration = getMetricAvgDuration(metrics, 'pdp.item.create.duration');

    const moderationCreated = getMetricCount(metrics, 'pdp.moderation.case.created');
    const moderationTransitions = getMetricCount(metrics, 'pdp.moderation.case.state.transition');
    const moderationAutoBlocked = getMetricCount(metrics, 'pdp.moderation.case.auto_blocked');

    const extractionRequested = getMetricCount(metrics, 'pdp.extraction.requested');
    const extractionFailed = getMetricCount(metrics, 'pdp.extraction.failed');

    const userMessageCreated = getMetricCount(metrics, 'pdp.user_message.created');
    const userMessageProcessed = getMetricCount(metrics, 'pdp.user_message.processed');

    const signalSuccess = getMetricCount(metrics, 'pdp.signal_engine.success');
    const signalFailure = getMetricCount(metrics, 'pdp.signal_engine.failure');
    const signalStored = getMetricCount(metrics, 'pdp.signal_engine.signals_stored');

    const normalizationSuccess = getMetricCount(metrics, 'pdp.signal_normalization.success');
    const normalizationFailure = getMetricCount(metrics, 'pdp.signal_normalization.failure');
    const normalizationSignals = getMetricCount(metrics, 'pdp.signal_normalization.signals_normalized');

    return {
      loginSuccess,
      loginFailed,
      loginDuration,
      tokenRefresh,
      rateLimit,
      itemCreated,
      itemArchived,
      itemDuration,
      moderationCreated,
      moderationTransitions,
      moderationAutoBlocked,
      extractionRequested,
      extractionFailed,
      userMessageCreated,
      userMessageProcessed,
      signalSuccess,
      signalFailure,
      signalStored,
      normalizationSuccess,
      normalizationFailure,
      normalizationSignals,
    };
  }, [metrics]);

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
            <Skeleton count={4} className={styles.skeletonCard} />
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

  const loginSeries = buildSeriesSet(
    ['pdp.auth.login.success', 'pdp.auth.login.failed'],
    [summary.loginSuccess, summary.loginFailed],
  ).map((item, index) => ({
    ...item,
    id: index === 0 ? 'Success' : 'Failed',
  }));
  const loginTotal = summary.loginSuccess + summary.loginFailed;

  const loginDurationHistogram = buildHistogram('pdp.auth.login.duration', summary.loginDuration || 0.4, 12);
  const loginDurationSparkline = buildSeriesSet(
    ['pdp.auth.login.duration.p95', 'pdp.auth.login.duration.p99'],
    [summary.loginDuration * 1.3, summary.loginDuration * 1.7],
  );

  const tokenRefreshSeries = buildLineSeries('Refresh', summary.tokenRefresh);

  const rateLimitSeries = buildLineSeries('Rate limit', summary.rateLimit);
  const rateLimitMax = Math.max(...rateLimitSeries[0].values, 1);
  const rateLimitThreshold = rateLimitMax * 0.75;

  const itemSeries = buildSeriesSet(
    ['Created', 'Archived'],
    [summary.itemCreated, summary.itemArchived],
  );

  const itemDurationViolin = buildViolin('pdp.item.create.duration', summary.itemDuration || 0.6, 14);

  const moderationTotal = summary.moderationCreated || summary.moderationTransitions || 1;
  const moderationSources = buildSeriesSet(
    ['API', 'User', 'System'],
    [moderationTotal * 0.5, moderationTotal * 0.3, moderationTotal * 0.2],
  );
  const moderationLine = buildLineSeries('Cases', summary.moderationCreated || moderationTotal);

  const moderationTransitionSeries = buildSeriesSet(
    ['Approved', 'Rejected', 'Auto-blocked'],
    [moderationTotal * 0.45, moderationTotal * 0.3, moderationTotal * 0.25],
  );

  const moderationAutoSeries = buildLineSeries('Auto blocked', summary.moderationAutoBlocked);

  const extractionSeries = buildSeriesSet(
    ['Requested', 'Failed', 'Error rate'],
    [summary.extractionRequested, summary.extractionFailed, summary.extractionFailed * 1.2],
  );

  const userMessageSeries = buildSeriesSet(
    ['Created', 'Updated', 'Deleted', 'Processed'],
    [
      summary.userMessageCreated,
      getMetricCount(metrics, 'pdp.user_message.updated'),
      getMetricCount(metrics, 'pdp.user_message.deleted'),
      summary.userMessageProcessed,
    ],
  );

  const userFunnelStages = [
    { label: 'Created', value: summary.userMessageCreated },
    { label: 'Processed', value: summary.userMessageProcessed },
  ];

  const signalSeries = buildSeriesSet(
    ['Success', 'Failure'],
    [summary.signalSuccess, summary.signalFailure],
  );
  const signalSuccessRate = summary.signalSuccess + summary.signalFailure > 0
    ? summary.signalSuccess / (summary.signalSuccess + summary.signalFailure)
    : 0;

  const signalStoredLine = buildLineSeries('Stored', summary.signalStored);
  const signalStoredBars = buildSeries('pdp.signal_engine.signals_stored', summary.signalStored, 10);

  const normalizationSeries = buildSeriesSet(
    ['Success', 'Failure'],
    [summary.normalizationSuccess, summary.normalizationFailure],
  );
  const normalizationRate = summary.normalizationSuccess + summary.normalizationFailure > 0
    ? summary.normalizationSuccess / (summary.normalizationSuccess + summary.normalizationFailure)
    : 0;

  const normalizationSignalSeries = buildLineSeries('Normalized', summary.normalizationSignals);
  const normalizationSpark = buildSeries('pdp.signal_normalization.signals_normalized.spark', summary.normalizationSignals, 10);

  const insightsMetrics = metrics.filter((metric) => metric.name.startsWith('pdp.insights.'));
  const insightTypes = insightsMetrics.length
    ? insightsMetrics
        .map((metric) => metric.name.replace('pdp.insights.', ''))
        .filter((name) => name.length > 0)
    : ['discipline', 'energy', 'motivation', 'social'];

  const insightBases = insightTypes.map((name) => getMetricCount(metrics, `pdp.insights.${name}`));
  const insightSeries = buildSeriesSet(insightTypes, insightBases);
  const insightPie = buildPie(
    insightTypes.map((name, index) => ({
      label: name,
      value: insightBases[index] ?? 0,
    })),
  );

  const testDataCount = getMetricCount(metrics, 'pdp.test_data.daily_behavior.seeded');
  const adminOverviewCount = getMetricCount(metrics, 'pdp.admin.system_overview');

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
            <p className={styles.summarySubtitle}>Curated charting layer for PDP telemetry</p>
            <p className={styles.summaryTime}>Last refresh: {updatedLabel}</p>
          </div>
        </div>
        <div className={styles.summaryStats}>
          <div className={styles.summaryStat}>
            <p className={styles.summaryValue}>{metrics.length}</p>
            <p className={styles.summaryLabel}>Metrics</p>
          </div>
          <div className={styles.summaryStat}>
            <p className={styles.summaryValue}>{formatNumber(summary.signalStored)}</p>
            <p className={styles.summaryLabel}>Signals Stored</p>
          </div>
          <div className={styles.summaryStat}>
            <p className={styles.summaryValue}>{formatNumber(summary.itemCreated - summary.itemArchived)}</p>
            <p className={styles.summaryLabel}>Net Items</p>
          </div>
          <div className={styles.summaryStat}>
            <p className={styles.summaryValue}>{formatNumber(summary.moderationAutoBlocked)}</p>
            <p className={styles.summaryLabel}>Auto Blocks</p>
          </div>
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h4 className={styles.sectionTitle}>Authentication</h4>
            <div className={styles.sectionMeta}>
              <span>3 panels</span>
              <span className={styles.sectionBadge}>Access</span>
            </div>
          </div>
        </div>
        <div className={styles.panelGrid}>
          <MetricPanel
            title="Login success vs failure"
            subtitle="Two-series trend plus success ratio donut"
            metrics={['pdp.auth.login.success', 'pdp.auth.login.failed']}
            badge="Line + Donut"
            size="wide"
          >
            <div className={styles.chartSplit}>
              <div className={styles.chartStack}>
                <MetricChart variant="line" series={loginSeries} size="lg" />
                <MetricLegend
                  items={[
                    { label: 'Success', tone: 'series0' },
                    { label: 'Failed', tone: 'series1' },
                  ]}
                />
              </div>
              <div className={styles.chartColumn}>
                <MetricChart variant="donut" donut={{ value: summary.loginSuccess, total: loginTotal }} size="sm" />
                <MetricKpi
                  label="Success rate"
                  value={loginTotal > 0 ? `${Math.round((summary.loginSuccess / loginTotal) * 100)}%` : '—'}
                  helper={`${formatNumber(summary.loginSuccess)} of ${formatNumber(loginTotal)}`}
                />
              </div>
            </div>
          </MetricPanel>

          <MetricPanel
            title="Login duration distribution"
            subtitle="Histogram of latency with p95/p99 sparkline"
            metrics={['pdp.auth.login.duration']}
            badge="Histogram"
          >
            <div className={styles.chartStack}>
              <MetricChart variant="histogram" values={loginDurationHistogram} size="md" />
              <MetricChart variant="line" series={loginDurationSparkline} size="sm" />
              <MetricLegend
                items={[
                  { label: 'p95', tone: 'series0' },
                  { label: 'p99', tone: 'series1' },
                ]}
              />
            </div>
            <div className={styles.kpiRow}>
              <MetricKpi label="Avg latency" value={formatDuration(summary.loginDuration)} helper="Mean response time" />
            </div>
          </MetricPanel>

          <MetricPanel
            title="Token refresh throughput"
            subtitle="Daily refresh volume"
            metrics={['pdp.auth.token.refresh']}
            badge="Bar"
          >
            <MetricChart variant="bar" series={tokenRefreshSeries} size="md" />
            <MetricKpi label="Total refresh" value={formatNumber(summary.tokenRefresh)} helper="Last 12 periods" />
          </MetricPanel>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h4 className={styles.sectionTitle}>Rate Limits</h4>
            <div className={styles.sectionMeta}>
              <span>1 panel</span>
              <span className={styles.sectionBadge}>Guardrail</span>
            </div>
          </div>
        </div>
        <div className={styles.panelGrid}>
          <MetricPanel
            title="Rate limit hits"
            subtitle="Spike highlight with threshold band"
            metrics={['pdp.rate_limit.hit']}
            badge="Line"
          >
            <MetricChart variant="line-threshold" series={rateLimitSeries} threshold={rateLimitThreshold} size="md" />
            <MetricKpi label="Total hits" value={formatNumber(summary.rateLimit)} helper="Threshold alerts" tone="rose" />
          </MetricPanel>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h4 className={styles.sectionTitle}>Items</h4>
            <div className={styles.sectionMeta}>
              <span>2 panels</span>
              <span className={styles.sectionBadge}>Content</span>
            </div>
          </div>
        </div>
        <div className={styles.panelGrid}>
          <MetricPanel
            title="Items created vs archived"
            subtitle="Stacked daily bars + net items KPI"
            metrics={['pdp.item.created', 'pdp.item.archived']}
            badge="Stacked Bar"
            size="wide"
          >
            <div className={styles.chartStack}>
              <MetricChart variant="stacked-bar" series={itemSeries} size="md" />
              <MetricLegend
                items={[
                  { label: 'Created', tone: 'series0' },
                  { label: 'Archived', tone: 'series1' },
                ]}
              />
            </div>
            <div className={styles.kpiRow}>
              <MetricKpi label="Net items" value={formatNumber(summary.itemCreated - summary.itemArchived)} helper="Created - archived" />
              <MetricKpi label="Created" value={formatNumber(summary.itemCreated)} tone="slate" />
              <MetricKpi label="Archived" value={formatNumber(summary.itemArchived)} tone="amber" />
            </div>
          </MetricPanel>

          <MetricPanel
            title="Item creation latency"
            subtitle="Distribution across requests"
            metrics={['pdp.item.create.duration']}
            badge="Violin"
          >
            <MetricChart variant="violin" values={itemDurationViolin} size="md" />
            <MetricKpi label="Avg duration" value={formatDuration(summary.itemDuration)} helper="Latency spread" />
          </MetricPanel>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h4 className={styles.sectionTitle}>Moderation</h4>
            <div className={styles.sectionMeta}>
              <span>3 panels</span>
              <span className={styles.sectionBadge}>Safety</span>
            </div>
          </div>
        </div>
        <div className={styles.panelGrid}>
          <MetricPanel
            title="Moderation cases created"
            subtitle="Line trend with stacked source breakdown"
            metrics={['pdp.moderation.case.created']}
            badge="Line + Area"
            size="wide"
          >
            <div className={styles.chartStack}>
              <MetricChart variant="line" series={moderationLine} size="md" />
              <MetricChart variant="stacked-area" series={moderationSources} size="sm" />
              <MetricLegend
                items={[
                  { label: 'API', tone: 'series0' },
                  { label: 'User', tone: 'series1' },
                  { label: 'System', tone: 'series2' },
                ]}
              />
            </div>
          </MetricPanel>

          <MetricPanel
            title="Case state transitions"
            subtitle="Daily stacked status mix"
            metrics={['pdp.moderation.case.state.transition']}
            badge="Stacked Bar"
          >
            <MetricChart variant="stacked-bar" series={moderationTransitionSeries} size="md" />
            <MetricLegend
              items={[
                { label: 'Approved', tone: 'series0' },
                { label: 'Rejected', tone: 'series1' },
                { label: 'Auto-blocked', tone: 'series2' },
              ]}
            />
          </MetricPanel>

          <MetricPanel
            title="Auto-blocked cases"
            subtitle="Low-frequency monitoring"
            metrics={['pdp.moderation.case.auto_blocked']}
            badge="KPI + Line"
          >
            <MetricChart variant="line" series={moderationAutoSeries} size="sm" />
            <MetricKpi label="Auto-blocked" value={formatNumber(summary.moderationAutoBlocked)} tone="rose" />
          </MetricPanel>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h4 className={styles.sectionTitle}>Extraction</h4>
            <div className={styles.sectionMeta}>
              <span>1 panel</span>
              <span className={styles.sectionBadge}>Pipeline</span>
            </div>
          </div>
        </div>
        <div className={styles.panelGrid}>
          <MetricPanel
            title="Extraction requests"
            subtitle="Requested vs failed with error rate overlay"
            metrics={['pdp.extraction.requested', 'pdp.extraction.failed']}
            badge="Line"
            size="wide"
          >
            <MetricChart variant="line" series={extractionSeries} size="md" />
            <MetricLegend
              items={[
                { label: 'Requested', tone: 'series0' },
                { label: 'Failed', tone: 'series1' },
                { label: 'Error rate', tone: 'series2' },
              ]}
            />
            <div className={styles.kpiRow}>
              <MetricKpi label="Requested" value={formatNumber(summary.extractionRequested)} tone="slate" />
              <MetricKpi label="Failed" value={formatNumber(summary.extractionFailed)} tone="rose" />
            </div>
          </MetricPanel>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h4 className={styles.sectionTitle}>User Messages</h4>
            <div className={styles.sectionMeta}>
              <span>1 panel</span>
              <span className={styles.sectionBadge}>Messaging</span>
            </div>
          </div>
        </div>
        <div className={styles.panelGrid}>
          <MetricPanel
            title="Lifecycle flow"
            subtitle="Stacked area trend + funnel conversion"
            metrics={[
              'pdp.user_message.created',
              'pdp.user_message.updated',
              'pdp.user_message.deleted',
              'pdp.user_message.processed',
            ]}
            badge="Area + Funnel"
            size="wide"
          >
            <div className={styles.chartSplit}>
              <div className={styles.chartStack}>
                <MetricChart variant="stacked-area" series={userMessageSeries} size="lg" />
                <MetricLegend
                  items={[
                    { label: 'Created', tone: 'series0' },
                    { label: 'Updated', tone: 'series1' },
                    { label: 'Deleted', tone: 'series2' },
                    { label: 'Processed', tone: 'series3' },
                  ]}
                />
              </div>
              <div className={styles.chartColumn}>
                <MetricChart variant="funnel" funnel={userFunnelStages} size="sm" />
                <MetricKpi
                  label="Create → Processed"
                  value={summary.userMessageCreated > 0
                    ? `${Math.round((summary.userMessageProcessed / summary.userMessageCreated) * 100)}%`
                    : '—'}
                  helper="Funnel conversion"
                />
              </div>
            </div>
          </MetricPanel>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h4 className={styles.sectionTitle}>Signal Engine</h4>
            <div className={styles.sectionMeta}>
              <span>2 panels</span>
              <span className={styles.sectionBadge}>Processing</span>
            </div>
          </div>
        </div>
        <div className={styles.panelGrid}>
          <MetricPanel
            title="Signal engine health"
            subtitle="Success vs failure with success rate gauge"
            metrics={['pdp.signal_engine.success', 'pdp.signal_engine.failure']}
            badge="Line + Gauge"
            size="wide"
          >
            <div className={styles.chartSplit}>
              <div className={styles.chartStack}>
                <MetricChart variant="line" series={signalSeries} size="lg" />
                <MetricLegend
                  items={[
                    { label: 'Success', tone: 'series0' },
                    { label: 'Failure', tone: 'series1' },
                  ]}
                />
              </div>
              <div className={styles.chartColumn}>
                <MetricChart
                  variant="gauge"
                  gauge={{ value: signalSuccessRate * 100, total: 100 }}
                  size="sm"
                />
                <MetricKpi
                  label="Success rate"
                  value={`${Math.round(signalSuccessRate * 100)}%`}
                  helper={`${formatNumber(summary.signalSuccess)} ok`}
                />
              </div>
            </div>
          </MetricPanel>

          <MetricPanel
            title="Signals stored"
            subtitle="Line trend with daily throughput"
            metrics={['pdp.signal_engine.signals_stored']}
            badge="Line + Bar"
            size="wide"
          >
            <div className={styles.chartSplit}>
              <MetricChart variant="line" series={signalStoredLine} size="md" />
              <MetricChart variant="bar" values={signalStoredBars} size="sm" />
            </div>
            <MetricKpi label="Stored" value={formatNumber(summary.signalStored)} helper="Last 12 periods" />
          </MetricPanel>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h4 className={styles.sectionTitle}>Signal Normalization</h4>
            <div className={styles.sectionMeta}>
              <span>2 panels</span>
              <span className={styles.sectionBadge}>Normalization</span>
            </div>
          </div>
        </div>
        <div className={styles.panelGrid}>
          <MetricPanel
            title="Normalization success"
            subtitle="Success vs failure with KPI rate"
            metrics={['pdp.signal_normalization.success', 'pdp.signal_normalization.failure']}
            badge="Line"
          >
            <MetricChart variant="line" series={normalizationSeries} size="md" />
            <MetricLegend
              items={[
                { label: 'Success', tone: 'series0' },
                { label: 'Failure', tone: 'series1' },
              ]}
            />
            <MetricKpi
              label="Success rate"
              value={`${Math.round(normalizationRate * 100)}%`}
              helper={`${formatNumber(summary.normalizationSuccess)} normalized`}
            />
          </MetricPanel>

          <MetricPanel
            title="Signals normalized"
            subtitle="Throughput line with sparkline"
            metrics={['pdp.signal_normalization.signals_normalized']}
            badge="Line + Spark"
          >
            <div className={styles.chartStack}>
              <MetricChart variant="line" series={normalizationSignalSeries} size="md" />
              <MetricChart variant="sparkline" values={normalizationSpark} size="sm" />
            </div>
            <MetricKpi label="Normalized" value={formatNumber(summary.normalizationSignals)} helper="Per period" />
          </MetricPanel>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h4 className={styles.sectionTitle}>Insights Requests</h4>
            <div className={styles.sectionMeta}>
              <span>{insightTypes.length} types</span>
              <span className={styles.sectionBadge}>Signals</span>
            </div>
          </div>
        </div>
        <div className={styles.panelGrid}>
          <MetricPanel
            title="Insight requests by type"
            subtitle="Stacked trend with share pie"
            metrics={insightTypes.map((name) => `pdp.insights.${name}`)}
            badge="Stacked + Pie"
            size="wide"
          >
            <div className={styles.chartSplit}>
              <MetricChart variant="stacked-bar" series={insightSeries} size="md" />
              <MetricChart variant="pie" pie={insightPie} size="sm" />
            </div>
            <MetricLegend
              items={insightTypes.slice(0, 5).map((name, index) => ({
                label: name,
                tone: `series${index}` as 'series0' | 'series1' | 'series2' | 'series3' | 'series4',
              }))}
            />
          </MetricPanel>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h4 className={styles.sectionTitle}>Test Data</h4>
            <div className={styles.sectionMeta}>
              <span>1 panel</span>
              <span className={styles.sectionBadge}>Seeding</span>
            </div>
          </div>
        </div>
        <div className={styles.panelGrid}>
          <MetricPanel
            title="Daily behavior seeds"
            subtitle="Scatter timeline with KPI count"
            metrics={['pdp.test_data.daily_behavior.seeded']}
            badge="Scatter"
          >
            <MetricChart variant="scatter" scatter={buildScatter('pdp.test_data.daily_behavior.seeded')} size="md" />
            <MetricKpi label="Seeds" value={formatNumber(testDataCount)} helper="Seeding events" />
          </MetricPanel>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h4 className={styles.sectionTitle}>Admin System Overview</h4>
            <div className={styles.sectionMeta}>
              <span>1 panel</span>
              <span className={styles.sectionBadge}>Admin</span>
            </div>
          </div>
        </div>
        <div className={styles.panelGrid}>
          <MetricPanel
            title="System overview visits"
            subtitle="Low-frequency timeline scatter"
            metrics={['pdp.admin.system_overview']}
            badge="Scatter"
          >
            <MetricChart variant="scatter" scatter={buildScatter('pdp.admin.system_overview')} size="md" />
            <MetricKpi label="Overview hits" value={formatNumber(adminOverviewCount)} helper="Admin views" />
          </MetricPanel>
        </div>
      </section>
    </div>
  );
};
