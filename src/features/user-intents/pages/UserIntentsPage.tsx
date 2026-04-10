import { useEffect, useMemo, useRef, useState } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import * as echarts from 'echarts/core';
import { TooltipComponent, LegendComponent } from 'echarts/components';
import { PieChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { insightExplorerService } from '../../../services/insightExplorer.service';
import type { InsightExplorerNormalizedData, InsightExplorerResponse, UserIntentRecord } from '../../insight-explorer/types';
import styles from './UserIntentsPage.module.css';

echarts.use([TooltipComponent, LegendComponent, PieChart, CanvasRenderer]);

type LoadState = {
  loading: boolean;
  error: string | null;
  response: InsightExplorerResponse | null;
};

type IntentTypeSummary = {
  type: string;
  count: number;
  descriptions: Array<{ text: string; count: number }>;
  scopes: string[];
  latestAt: string;
  activityLabels: string[];
};

const EMPTY_DATASET: InsightExplorerNormalizedData = {
  user_activities: [],
  user_cognitive_states: [],
  user_context: [],
  user_entities: [],
  user_intents: [],
  user_projects: [],
  user_tone_states: [],
  user_topics: [],
  user_tools: [],
};

const TYPE_COLORS = ['#7dd3fc', '#67e8f9', '#a78bfa', '#f9a8d4', '#f59e0b', '#34d399', '#fb7185'];

const formatError = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  return 'Unexpected error while loading intent data.';
};

const sentenceCase = (value: string) =>
  value.length > 0 ? `${value.slice(0, 1).toUpperCase()}${value.slice(1).toLowerCase()}` : value;

const formatDate = (value: string) => {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(timestamp);
};

const buildIntentSummary = (dataset: InsightExplorerNormalizedData) => {
  const activitiesById = new Map(dataset.user_activities.map((activity) => [activity.id, activity]));
  const types = new Map<string, IntentTypeSummary>();
  const scopeCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();

  dataset.user_intents.forEach((intent: UserIntentRecord) => {
    const type = (intent.intent_type ?? intent.tag ?? 'UNKNOWN').trim().toUpperCase() || 'UNKNOWN';
    const description = (intent.description ?? intent.label ?? 'Unknown').trim();
    const scope = (intent.temporal_scope ?? 'Unspecified').trim();
    const activityLabel = activitiesById.get(intent.activity_id)?.label;
    const occurredAt = activitiesById.get(intent.activity_id)?.occurred_at ?? new Date().toISOString();
    const current = types.get(type) ?? {
      type,
      count: 0,
      descriptions: [],
      scopes: [],
      latestAt: occurredAt,
      activityLabels: [],
    };

    current.count += 1;
    if (!current.scopes.includes(scope)) current.scopes.push(scope);
    if (activityLabel && !current.activityLabels.includes(activityLabel)) current.activityLabels.push(activityLabel);
    if (new Date(occurredAt).getTime() > new Date(current.latestAt).getTime()) current.latestAt = occurredAt;

    const existingDescription = current.descriptions.find((item) => item.text === description);
    if (existingDescription) existingDescription.count += 1;
    else current.descriptions.push({ text: description, count: 1 });

    types.set(type, current);
    scopeCounts.set(scope, (scopeCounts.get(scope) ?? 0) + 1);
    tagCounts.set(intent.tag, (tagCounts.get(intent.tag) ?? 0) + 1);
  });

  const typeSummaries = Array.from(types.values())
    .map((item) => ({
      ...item,
      descriptions: [...item.descriptions].sort((left, right) => right.count - left.count || left.text.localeCompare(right.text)),
      activityLabels: item.activityLabels.slice(0, 4),
      scopes: item.scopes.slice(0, 4),
    }))
    .sort((left, right) => right.count - left.count || left.type.localeCompare(right.type));

  const scopeData = Array.from(scopeCounts.entries())
    .map(([scope, count]) => ({ scope, count }))
    .sort((left, right) => right.count - left.count || left.scope.localeCompare(right.scope));

  const dominantScope = scopeData[0]?.scope ?? 'Unspecified';
  const dominantTag = Array.from(tagCounts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'general';

  return {
    typeSummaries,
    scopeData,
    dominantScope,
    dominantTag,
    totalIntents: dataset.user_intents.length,
  };
};

const IntentTypeDonut = ({ data }: { data: Array<{ type: string; count: number }> }) => {
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    const chart = echarts.init(chartRef.current);
    chart.setOption({
      tooltip: {
        trigger: 'item',
        confine: true,
        backgroundColor: 'rgba(6, 12, 16, 0.92)',
        borderColor: 'rgba(125, 211, 252, 0.24)',
        borderWidth: 1,
        textStyle: { color: '#e8f5f3', fontSize: 12 },
        formatter: (params: { name?: string; value?: number; percent?: number }) =>
          `${params.name}<br/>${params.value} intents · ${params.percent}%`,
      },
      legend: {
        bottom: 0,
        icon: 'circle',
        textStyle: {
          color: 'rgba(226, 232, 240, 0.72)',
          fontSize: 11,
        },
      },
      series: [
        {
          type: 'pie',
          radius: ['52%', '74%'],
          center: ['50%', '42%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderColor: 'rgba(5, 9, 18, 0.9)',
            borderWidth: 3,
          },
          label: {
            show: true,
            color: 'rgba(248, 250, 252, 0.9)',
            formatter: '{b|{b}}\n{c|{c}}',
            rich: {
              b: { fontSize: 11, fontWeight: 700, lineHeight: 18 },
              c: { fontSize: 10, color: 'rgba(191, 219, 254, 0.8)' },
            },
          },
          labelLine: {
            lineStyle: { color: 'rgba(148, 163, 184, 0.5)' },
          },
          data: data.map((item, index) => ({
            name: sentenceCase(item.type),
            value: item.count,
            itemStyle: { color: TYPE_COLORS[index % TYPE_COLORS.length] },
          })),
        },
      ],
      animationDuration: 900,
    });

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [data]);

  return <div ref={chartRef} className={styles.donutChart} />;
};

export const UserIntentsPage = () => {
  const [state, setState] = useState<LoadState>({
    loading: true,
    error: null,
    response: null,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setState({ loading: true, error: null, response: null });
      try {
        const response = await insightExplorerService.getExplorerData();
        if (cancelled) return;
        setState({ loading: false, error: null, response });
      } catch (error) {
        if (cancelled) return;
        setState({ loading: false, error: formatError(error), response: null });
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const dataset = state.response?.data ?? EMPTY_DATASET;
  const summary = useMemo(() => buildIntentSummary(dataset), [dataset]);

  if (state.loading) {
    return (
      <div className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.loadingLineLong} />
          <div className={styles.loadingLineShort} />
        </section>
      </div>
    );
  }

  if (state.error && !state.response) {
    return (
      <div className={styles.page}>
        <section className={styles.emptyState}>
          <h2>We couldn&apos;t load user intents.</h2>
          <p>{state.error}</p>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Intent Field</p>
          <h2>A living map of goals, plans, decisions, and commitments.</h2>
          <p className={styles.heroText}>
            Instead of a flat table, this page shows how the user&apos;s intent signals distribute by type, how far they
            stretch through time, and which descriptions keep repeating underneath the conversation stream.
          </p>
        </div>
        <div className={styles.heroStats}>
          <div className={styles.statCard}>
            <span>Total intents</span>
            <strong>{summary.totalIntents}</strong>
          </div>
          <div className={styles.statCard}>
            <span>Unique intent types</span>
            <strong>{summary.typeSummaries.length}</strong>
          </div>
          <div className={styles.statCard}>
            <span>Dominant scope</span>
            <strong>{summary.dominantScope}</strong>
          </div>
        </div>
      </section>

      {state.response?.message ? <p className={styles.banner}>{state.response.message}</p> : null}

      {summary.totalIntents === 0 ? (
        <section className={styles.emptyState}>
          <h2>No intents yet</h2>
          <p>Once intent extraction starts producing goals, plans, or decisions, they&apos;ll appear here.</p>
        </section>
      ) : (
        <>
          <section className={styles.chartGrid}>
            <article className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <div>
                  <p className={styles.chartKicker}>Intent Mix</p>
                  <h3>Distribution by intent type</h3>
                </div>
                <span className={styles.inlineMeta}>Primary domain: {sentenceCase(summary.dominantTag)}</span>
              </div>
              <IntentTypeDonut data={summary.typeSummaries.map((item) => ({ type: item.type, count: item.count }))} />
            </article>

            <article className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <div>
                  <p className={styles.chartKicker}>Temporal Reach</p>
                  <h3>How intents spread across time scopes</h3>
                </div>
                <span className={styles.inlineMeta}>{summary.scopeData.length} scopes tracked</span>
              </div>
              <div className={styles.barChartWrap}>
                <ResponsiveBar
                  data={summary.scopeData}
                  keys={['count']}
                  indexBy="scope"
                  layout="horizontal"
                  margin={{ top: 12, right: 24, bottom: 8, left: 110 }}
                  padding={0.34}
                  valueScale={{ type: 'linear', min: 0 }}
                  colors={({ index }) => TYPE_COLORS[index % TYPE_COLORS.length]}
                  borderRadius={10}
                  enableGridX
                  enableGridY={false}
                  axisBottom={null}
                  axisLeft={{
                    tickSize: 0,
                    tickPadding: 12,
                  }}
                  label={(datum) => `${datum.value}`}
                  labelTextColor="#f8fafc"
                  theme={{
                    text: { fill: '#e2e8f0', fontSize: 12 },
                    axis: { ticks: { text: { fill: 'rgba(191, 219, 254, 0.72)', fontSize: 11 } } },
                    grid: { line: { stroke: 'rgba(148, 163, 184, 0.12)', strokeWidth: 1 } },
                    tooltip: {
                      container: {
                        background: 'rgba(6, 12, 16, 0.92)',
                        color: '#e8f5f3',
                        borderRadius: 12,
                        border: '1px solid rgba(125, 211, 252, 0.24)',
                        padding: '8px 12px',
                      },
                    },
                  }}
                  tooltip={(datum) => (
                    <div className={styles.tooltip}>
                      <strong>{String(datum.indexValue)}</strong>
                      <span>{datum.value} intent mentions</span>
                    </div>
                  )}
                  animate
                  motionConfig="gentle"
                />
              </div>
            </article>
          </section>

          <section className={styles.intentField}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.chartKicker}>Intent Lanes</p>
                <h3>Each lane shows what kind of future the user keeps steering toward.</h3>
              </div>
              <span className={styles.inlineMeta}>Latest signal: {formatDate(summary.typeSummaries[0]?.latestAt ?? '')}</span>
            </div>

            <div className={styles.lanes}>
              {summary.typeSummaries.map((typeSummary, index) => (
                <article key={typeSummary.type} className={styles.laneCard}>
                  <div className={styles.laneRail} style={{ background: TYPE_COLORS[index % TYPE_COLORS.length] }} />
                  <div className={styles.laneHeader}>
                    <div>
                      <p className={styles.laneType}>{sentenceCase(typeSummary.type)}</p>
                      <p className={styles.laneMeta}>
                        {typeSummary.count} signals · last seen {formatDate(typeSummary.latestAt)}
                      </p>
                    </div>
                    <div className={styles.scopeWrap}>
                      {typeSummary.scopes.map((scope) => (
                        <span key={`${typeSummary.type}-${scope}`} className={styles.scopePill}>
                          {scope}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className={styles.descriptionStream}>
                    {typeSummary.descriptions.slice(0, 5).map((item, itemIndex) => (
                      <div
                        key={`${typeSummary.type}-${item.text}`}
                        className={styles.descriptionNode}
                        style={{
                          borderColor: `${TYPE_COLORS[index % TYPE_COLORS.length]}44`,
                          background: `linear-gradient(180deg, ${TYPE_COLORS[(index + itemIndex) % TYPE_COLORS.length]}18, rgba(15, 23, 42, 0.35))`,
                        }}
                      >
                        <span>{item.text}</span>
                        <strong>{item.count}</strong>
                      </div>
                    ))}
                  </div>

                  {typeSummary.activityLabels.length > 0 ? (
                    <div className={styles.activityStrip}>
                      {typeSummary.activityLabels.map((activity) => (
                        <span key={`${typeSummary.type}-${activity}`} className={styles.activityPill}>
                          {activity}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};
