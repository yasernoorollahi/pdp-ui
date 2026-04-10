import { useEffect, useMemo, useRef, useState } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import * as echarts from 'echarts/core';
import { TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import 'echarts-wordcloud';
import { insightExplorerService } from '../../../services/insightExplorer.service';
import type {
  CognitiveGroup,
  InsightExplorerNormalizedData,
  InsightExplorerResponse,
  UserCognitiveStateRecord,
} from '../../insight-explorer/types';
import styles from './CognitiveLanguagePage.module.css';

echarts.use([TooltipComponent, CanvasRenderer]);

type LoadState = {
  loading: boolean;
  error: string | null;
  response: InsightExplorerResponse | null;
};

type LanguageCluster = {
  phrase: string;
  count: number;
  group: CognitiveGroup;
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

const GROUP_META: Record<CognitiveGroup, { label: string; color: string; glow: string }> = {
  CONFIDENCE: { label: 'Confidence', color: '#7dd3fc', glow: '#38bdf8' },
  UNCERTAINTY: { label: 'Uncertainty', color: '#c4b5fd', glow: '#8b5cf6' },
};

const formatError = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  return 'Unexpected error while loading cognitive language.';
};

const buildLanguageModel = (dataset: InsightExplorerNormalizedData) => {
  const activitiesById = new Map(dataset.user_activities.map((activity) => [activity.id, activity.label]));
  const clusters = new Map<string, LanguageCluster>();
  const counts: Record<CognitiveGroup, number> = {
    CONFIDENCE: 0,
    UNCERTAINTY: 0,
  };

  dataset.user_cognitive_states.forEach((item: UserCognitiveStateRecord) => {
    const key = `${item.group}:${item.phrase.toLowerCase()}`;
    const current = clusters.get(key) ?? {
      phrase: item.phrase,
      count: 0,
      group: item.group,
      activityLabels: [],
    };

    current.count += 1;
    counts[item.group] += 1;
    const activityLabel = activitiesById.get(item.activity_id);
    if (activityLabel && !current.activityLabels.includes(activityLabel)) current.activityLabels.push(activityLabel);
    clusters.set(key, current);
  });

  const phrases = Array.from(clusters.values()).sort(
    (left, right) => right.count - left.count || left.phrase.localeCompare(right.phrase),
  );

  return {
    totalSignals: dataset.user_cognitive_states.length,
    counts,
    phrases,
    topConfidence: phrases.filter((item) => item.group === 'CONFIDENCE').slice(0, 6),
    topUncertainty: phrases.filter((item) => item.group === 'UNCERTAINTY').slice(0, 6),
  };
};

const CognitiveWordCloud = ({ phrases }: { phrases: LanguageCluster[] }) => {
  const chartRef = useRef<HTMLDivElement | null>(null);

  const chartData = useMemo(
    () =>
      phrases.slice(0, 30).map((item) => ({
        name: item.phrase,
        value: item.count,
        textStyle: {
          color: GROUP_META[item.group].color,
        },
      })),
    [phrases],
  );

  useEffect(() => {
    if (!chartRef.current || chartData.length === 0) return;

    const chart = echarts.init(chartRef.current);
    chart.setOption({
      tooltip: {
        show: true,
        confine: true,
        backgroundColor: 'rgba(6, 12, 16, 0.92)',
        borderColor: 'rgba(125, 211, 252, 0.24)',
        borderWidth: 1,
        textStyle: {
          color: '#e8f5f3',
          fontSize: 12,
        },
        formatter: (params: { name?: string; value?: number }) =>
          `<div style="font-weight:600;color:#f8fafc;margin-bottom:4px;">${params.name ?? 'Phrase'}</div><div>Appeared ${params.value ?? 0} times</div>`,
      },
      series: [
        {
          type: 'wordCloud',
          shape: 'diamond',
          gridSize: 10,
          sizeRange: [14, 48],
          rotationRange: [-18, 18],
          drawOutOfBound: false,
          textStyle: {
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
          },
          emphasis: {
            textStyle: {
              shadowBlur: 14,
              shadowColor: 'rgba(125, 211, 252, 0.5)',
            },
          },
          data: chartData,
        },
      ],
      animationDuration: 800,
    });

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [chartData]);

  return <div ref={chartRef} className={styles.wordCloud} />;
};

export const CognitiveLanguagePage = () => {
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
  const model = useMemo(() => buildLanguageModel(dataset), [dataset]);

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
          <h2>We couldn&apos;t load cognitive language.</h2>
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
          <p className={styles.kicker}>Cognitive Language</p>
          <h2>The phrases that reveal how the user frames their inner state.</h2>
          <p className={styles.heroText}>
            This page turns cognitive language into a readable surface: confidence and uncertainty patterns, repeated
            phrases, and a live word field that makes internal framing visible at a glance.
          </p>
        </div>
        <div className={styles.heroStats}>
          <div className={styles.statCard}>
            <span>Total language signals</span>
            <strong>{model.totalSignals}</strong>
          </div>
          <div className={styles.statCard}>
            <span>Confidence phrases</span>
            <strong>{model.counts.CONFIDENCE}</strong>
          </div>
          <div className={styles.statCard}>
            <span>Uncertainty phrases</span>
            <strong>{model.counts.UNCERTAINTY}</strong>
          </div>
        </div>
      </section>

      {state.response?.message ? <p className={styles.banner}>{state.response.message}</p> : null}

      {model.totalSignals === 0 ? (
        <section className={styles.emptyState}>
          <h2>No cognitive language yet</h2>
          <p>Once language signals are extracted, they&apos;ll appear here.</p>
        </section>
      ) : (
        <>
          <section className={styles.topGrid}>
            <article className={styles.cloudCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionKicker}>Phrase Field</p>
                  <h3>Repeated language patterns</h3>
                </div>
                <span className={styles.inlineMeta}>{model.phrases.length} unique phrases</span>
              </div>
              <CognitiveWordCloud phrases={model.phrases} />
            </article>

            <article className={styles.barCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionKicker}>Signal Balance</p>
                  <h3>Confidence vs uncertainty volume</h3>
                </div>
              </div>
              <div className={styles.chartWrap}>
                <ResponsiveBar
                  data={[
                    { type: 'Confidence', count: model.counts.CONFIDENCE },
                    { type: 'Uncertainty', count: model.counts.UNCERTAINTY },
                  ]}
                  keys={['count']}
                  indexBy="type"
                  margin={{ top: 10, right: 20, bottom: 50, left: 60 }}
                  padding={0.4}
                  colors={({ index }) => [GROUP_META.CONFIDENCE.color, GROUP_META.UNCERTAINTY.color][index]}
                  borderRadius={12}
                  axisBottom={{
                    tickSize: 0,
                    tickPadding: 12,
                  }}
                  axisLeft={{
                    tickSize: 0,
                    tickPadding: 10,
                  }}
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
                      <span>{datum.value} language signals</span>
                    </div>
                  )}
                  animate
                  motionConfig="gentle"
                />
              </div>
            </article>
          </section>

          <section className={styles.listsGrid}>
            <article className={styles.listCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionKicker}>Confidence Language</p>
                  <h3>Grounding and forward-moving phrases</h3>
                </div>
              </div>
              <div className={styles.phraseList}>
                {model.topConfidence.map((item) => (
                  <div key={`confidence-${item.phrase}`} className={styles.phraseRow}>
                    <div className={styles.phraseBubble} style={{ borderColor: `${GROUP_META.CONFIDENCE.color}55` }}>
                      <span>{item.phrase}</span>
                      <strong>{item.count}</strong>
                    </div>
                    <div className={styles.activityStrip}>
                      {item.activityLabels.slice(0, 3).map((activity) => (
                        <span key={`${item.phrase}-${activity}`} className={styles.activityPill}>
                          {activity}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className={styles.listCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionKicker}>Uncertainty Language</p>
                  <h3>Hesitation, overload, and unclear framing</h3>
                </div>
              </div>
              <div className={styles.phraseList}>
                {model.topUncertainty.map((item) => (
                  <div key={`uncertainty-${item.phrase}`} className={styles.phraseRow}>
                    <div className={styles.phraseBubble} style={{ borderColor: `${GROUP_META.UNCERTAINTY.color}55` }}>
                      <span>{item.phrase}</span>
                      <strong>{item.count}</strong>
                    </div>
                    <div className={styles.activityStrip}>
                      {item.activityLabels.slice(0, 3).map((activity) => (
                        <span key={`${item.phrase}-${activity}`} className={styles.activityPill}>
                          {activity}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
};
