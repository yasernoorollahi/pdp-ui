import { useEffect, useMemo, useRef, useState } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import * as echarts from 'echarts/core';
import { TooltipComponent, LegendComponent } from 'echarts/components';
import { PieChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { insightExplorerService } from '../../../services/insightExplorer.service';
import type {
  ContextGroup,
  InsightExplorerNormalizedData,
  InsightExplorerResponse,
  UserContextRecord,
} from '../../insight-explorer/types';
import styles from './UserContextPage.module.css';

echarts.use([TooltipComponent, LegendComponent, PieChart, CanvasRenderer]);

type LoadState = {
  loading: boolean;
  error: string | null;
  response: InsightExplorerResponse | null;
};

type ContextPhrase = {
  phrase: string;
  count: number;
  activities: string[];
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

const META: Record<ContextGroup, { label: string; color: string; helper: string }> = {
  LIKE: { label: 'Likes', color: '#34d399', helper: 'What gives ease, clarity, warmth, or momentum.' },
  DISLIKE: { label: 'Dislikes', color: '#fb7185', helper: 'What feels draining, noisy, or counter-productive.' },
  CONSTRAINT: { label: 'Constraints', color: '#fbbf24', helper: 'What limits the flow, even when intention is strong.' },
};

const formatError = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  return 'Unexpected error while loading user context.';
};

const buildContextModel = (dataset: InsightExplorerNormalizedData) => {
  const activitiesById = new Map(dataset.user_activities.map((activity) => [activity.id, activity.label]));
  const groups: Record<ContextGroup, Map<string, ContextPhrase>> = {
    LIKE: new Map<string, ContextPhrase>(),
    DISLIKE: new Map<string, ContextPhrase>(),
    CONSTRAINT: new Map<string, ContextPhrase>(),
  };
  const counts: Record<ContextGroup, number> = {
    LIKE: 0,
    DISLIKE: 0,
    CONSTRAINT: 0,
  };

  dataset.user_context.forEach((item: UserContextRecord) => {
    const key = item.phrase.toLowerCase();
    const current = groups[item.type].get(key) ?? {
      phrase: item.phrase,
      count: 0,
      activities: [],
    };

    current.count += 1;
    counts[item.type] += 1;
    const activityLabel = activitiesById.get(item.activity_id);
    if (activityLabel && !current.activities.includes(activityLabel)) current.activities.push(activityLabel);
    groups[item.type].set(key, current);
  });

  const topByGroup = (group: ContextGroup) =>
    Array.from(groups[group].values())
      .sort((left, right) => right.count - left.count || left.phrase.localeCompare(right.phrase))
      .slice(0, 8);

  return {
    total: dataset.user_context.length,
    counts,
    likes: topByGroup('LIKE'),
    dislikes: topByGroup('DISLIKE'),
    constraints: topByGroup('CONSTRAINT'),
  };
};

const ContextSplitChart = ({ counts }: { counts: Record<ContextGroup, number> }) => {
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

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
          `${params.name}<br/>${params.value} context items · ${params.percent}%`,
      },
      legend: {
        bottom: 0,
        icon: 'circle',
        textStyle: {
          color: 'rgba(191, 219, 254, 0.72)',
          fontSize: 11,
        },
      },
      series: [
        {
          type: 'pie',
          radius: ['54%', '76%'],
          center: ['50%', '42%'],
          padAngle: 2,
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
          data: [
            { name: 'Likes', value: counts.LIKE, itemStyle: { color: META.LIKE.color } },
            { name: 'Dislikes', value: counts.DISLIKE, itemStyle: { color: META.DISLIKE.color } },
            { name: 'Constraints', value: counts.CONSTRAINT, itemStyle: { color: META.CONSTRAINT.color } },
          ],
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
  }, [counts]);

  return <div ref={chartRef} className={styles.pieWrap} />;
};

export const UserContextPage = () => {
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
  const model = useMemo(() => buildContextModel(dataset), [dataset]);

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
          <h2>We couldn&apos;t load user context.</h2>
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
          <p className={styles.kicker}>Context Landscape</p>
          <h2>The environmental preferences and friction around the user&apos;s day.</h2>
          <p className={styles.heroText}>
            This page makes the user&apos;s context legible: what they enjoy, what they avoid, and which constraints keep
            shaping the rhythm underneath their decisions and activities.
          </p>
        </div>
        <div className={styles.heroStats}>
          <div className={styles.statCard}>
            <span>Total context signals</span>
            <strong>{model.total}</strong>
          </div>
          <div className={styles.statCard}>
            <span>Likes</span>
            <strong>{model.counts.LIKE}</strong>
          </div>
          <div className={styles.statCard}>
            <span>Dislikes + constraints</span>
            <strong>{model.counts.DISLIKE + model.counts.CONSTRAINT}</strong>
          </div>
        </div>
      </section>

      {state.response?.message ? <p className={styles.banner}>{state.response.message}</p> : null}

      {model.total === 0 ? (
        <section className={styles.emptyState}>
          <h2>No context yet</h2>
          <p>Once preference and constraint signals are extracted, they&apos;ll appear here.</p>
        </section>
      ) : (
        <>
          <section className={styles.topGrid}>
            <article className={styles.pieCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionKicker}>Preference Split</p>
                  <h3>How context distributes across the three categories</h3>
                </div>
              </div>
              <ContextSplitChart counts={model.counts} />
            </article>

            <article className={styles.barCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionKicker}>Signal Weight</p>
                  <h3>Volume by context category</h3>
                </div>
              </div>
              <div className={styles.chartWrap}>
                <ResponsiveBar
                  data={[
                    { type: 'Likes', count: model.counts.LIKE, color: META.LIKE.color },
                    { type: 'Dislikes', count: model.counts.DISLIKE, color: META.DISLIKE.color },
                    { type: 'Constraints', count: model.counts.CONSTRAINT, color: META.CONSTRAINT.color },
                  ]}
                  keys={['count']}
                  indexBy="type"
                  margin={{ top: 10, right: 20, bottom: 50, left: 60 }}
                  padding={0.4}
                  colors={({ data }) => String((data as { color: string }).color)}
                  borderRadius={12}
                  axisBottom={{ tickSize: 0, tickPadding: 12 }}
                  axisLeft={{ tickSize: 0, tickPadding: 10 }}
                  enableGridY
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
                      <span>{datum.value} context signals</span>
                    </div>
                  )}
                  animate
                  motionConfig="gentle"
                />
              </div>
            </article>
          </section>

          <section className={styles.laneGrid}>
            {([
              ['LIKE', model.likes],
              ['DISLIKE', model.dislikes],
              ['CONSTRAINT', model.constraints],
            ] as const).map(([type, items]) => (
              <article key={type} className={styles.laneCard}>
                <div className={styles.sectionHeader}>
                  <div>
                    <p className={styles.sectionKicker} style={{ color: META[type].color }}>
                      {META[type].label}
                    </p>
                    <h3>{META[type].helper}</h3>
                  </div>
                </div>
                <div className={styles.contextList}>
                  {items.map((item) => (
                    <div key={`${type}-${item.phrase}`} className={styles.contextRow}>
                      <div className={styles.contextBubble} style={{ borderColor: `${META[type].color}55` }}>
                        <span>{item.phrase}</span>
                        <strong>{item.count}</strong>
                      </div>
                      <div className={styles.activityStrip}>
                        {item.activities.slice(0, 3).map((activity) => (
                          <span key={`${item.phrase}-${activity}`} className={styles.activityPill}>
                            {activity}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );
};
