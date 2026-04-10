import { useEffect, useMemo, useState } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { insightExplorerService } from '../../../services/insightExplorer.service';
import type { InsightExplorerNormalizedData, InsightExplorerResponse, UserActivityRecord } from '../../insight-explorer/types';
import styles from './UserActivitiesPage.module.css';

type LoadState = {
  loading: boolean;
  error: string | null;
  response: InsightExplorerResponse | null;
};

type ActivityGroup = {
  key: string;
  label: string;
  count: number;
  times: string[];
};

type ActivityDay = {
  dayKey: string;
  label: string;
  date: string;
  activities: Array<{
    id: string;
    label: string;
    timeLabel: string;
    groupLabel: string;
  }>;
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

const COLORS = ['#7dd3fc', '#67e8f9', '#a78bfa', '#34d399', '#f59e0b', '#f472b6', '#fb7185'];

const formatError = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  return 'Unexpected error while loading activity data.';
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const sentenceCase = (value: string) =>
  value.length > 0 ? `${value.slice(0, 1).toUpperCase()}${value.slice(1)}` : value;

const inferActivityGroup = (label: string) => {
  const normalized = normalizeText(label);
  if (normalized.includes('talk') || normalized.includes('girlfriend') || normalized.includes('conversation')) return 'Connection';
  if (normalized.includes('work') || normalized.includes('code') || normalized.includes('meeting') || normalized.includes('task')) return 'Work';
  if (normalized.includes('wake') || normalized.includes('bed') || normalized.includes('coffee') || normalized.includes('snooze')) return 'Morning routine';
  if (normalized.includes('cook') || normalized.includes('break') || normalized.includes('outside')) return 'Recovery';
  if (normalized.includes('pause') || normalized.includes('staring') || normalized.includes('sat there')) return 'Pause';
  return 'Everyday flow';
};

const formatDay = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown day';
  return new Intl.DateTimeFormat('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No time';
  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const getDayKey = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return date.toISOString().slice(0, 10);
};

const buildActivityViewModel = (activities: UserActivityRecord[]) => {
  const sortedActivities = [...activities].sort(
    (left, right) => new Date(right.occurred_at).getTime() - new Date(left.occurred_at).getTime(),
  );

  const groups = new Map<string, ActivityGroup>();
  const days = new Map<string, ActivityDay>();

  sortedActivities.forEach((activity) => {
    const groupLabel = activity.group_hint?.trim() || inferActivityGroup(activity.label);
    const groupKey = normalizeText(groupLabel) || 'everyday-flow';
    const currentGroup = groups.get(groupKey) ?? {
      key: groupKey,
      label: sentenceCase(groupLabel),
      count: 0,
      times: [],
    };

    currentGroup.count += 1;
    currentGroup.times.push(activity.occurred_at);
    groups.set(groupKey, currentGroup);

    const dayKey = getDayKey(activity.occurred_at);
    const currentDay = days.get(dayKey) ?? {
      dayKey,
      label: formatDay(activity.occurred_at),
      date: activity.occurred_at,
      activities: [],
    };

    currentDay.activities.push({
      id: activity.id,
      label: activity.label,
      timeLabel: formatTime(activity.occurred_at),
      groupLabel: sentenceCase(groupLabel),
    });
    days.set(dayKey, currentDay);
  });

  return {
    activityCount: sortedActivities.length,
    uniquePatternCount: groups.size,
    topGroups: Array.from(groups.values()).sort((left, right) => right.count - left.count || left.label.localeCompare(right.label)),
    days: Array.from(days.values()).sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()),
  };
};

export const UserActivitiesPage = () => {
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
  const viewModel = useMemo(() => buildActivityViewModel(dataset.user_activities), [dataset.user_activities]);

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
          <h2>We couldn&apos;t load user activities.</h2>
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
          <p className={styles.kicker}>Activity Stream</p>
          <h2>A readable flow of what the user actually did across the day.</h2>
          <p className={styles.heroText}>
            This surface turns extracted activities into a motion-like stream, highlights repeated behavior patterns,
            and makes it easier to see whether the day leaned toward work, recovery, connection, or drift.
          </p>
        </div>
        <div className={styles.heroStats}>
          <div className={styles.statCard}>
            <span>Total activities</span>
            <strong>{viewModel.activityCount}</strong>
          </div>
          <div className={styles.statCard}>
            <span>Behavior patterns</span>
            <strong>{viewModel.uniquePatternCount}</strong>
          </div>
          <div className={styles.statCard}>
            <span>Tracked days</span>
            <strong>{viewModel.days.length}</strong>
          </div>
        </div>
      </section>

      {state.response?.message ? <p className={styles.banner}>{state.response.message}</p> : null}

      {viewModel.activityCount === 0 ? (
        <section className={styles.emptyState}>
          <h2>No activities yet</h2>
          <p>Once activity extraction starts producing activity rows, they&apos;ll appear here.</p>
        </section>
      ) : (
        <>
          <section className={styles.topGrid}>
            <article className={styles.chartCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionKicker}>Pattern Density</p>
                  <h3>Most repeated activity groups</h3>
                </div>
                <span className={styles.inlineMeta}>{viewModel.topGroups.length} grouped patterns</span>
              </div>
              <div className={styles.chartWrap}>
                <ResponsiveBar
                  data={viewModel.topGroups.slice(0, 6).map((group) => ({ group: group.label, count: group.count }))}
                  keys={['count']}
                  indexBy="group"
                  layout="horizontal"
                  margin={{ top: 10, right: 26, bottom: 10, left: 120 }}
                  padding={0.35}
                  valueScale={{ type: 'linear', min: 0 }}
                  colors={({ index }) => COLORS[index % COLORS.length]}
                  borderRadius={10}
                  enableGridX
                  enableGridY={false}
                  axisBottom={null}
                  axisLeft={{ tickSize: 0, tickPadding: 12 }}
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
                      <span>{datum.value} activity mentions</span>
                    </div>
                  )}
                  animate
                  motionConfig="gentle"
                />
              </div>
            </article>

            <article className={styles.patternCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionKicker}>Pulse Read</p>
                  <h3>What dominated the recent activity stream</h3>
                </div>
              </div>
              <div className={styles.patternStack}>
                {viewModel.topGroups.slice(0, 5).map((group, index) => (
                  <div key={group.key} className={styles.patternRow}>
                    <div className={styles.patternLabelWrap}>
                      <span
                        className={styles.patternDot}
                        style={{ background: COLORS[index % COLORS.length] }}
                      />
                      <span className={styles.patternLabel}>{group.label}</span>
                    </div>
                    <div className={styles.patternMeter}>
                      <div
                        className={styles.patternFill}
                        style={{
                          width: `${(group.count / Math.max(viewModel.topGroups[0]?.count ?? 1, 1)) * 100}%`,
                          background: `linear-gradient(90deg, ${COLORS[index % COLORS.length]}, rgba(255,255,255,0.65))`,
                        }}
                      />
                    </div>
                    <strong className={styles.patternValue}>{group.count}</strong>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className={styles.streamSection}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionKicker}>Daily Stream</p>
                <h3>Activities arranged as a day-by-day flow.</h3>
              </div>
              <span className={styles.inlineMeta}>{viewModel.days.length} day lanes</span>
            </div>

            <div className={styles.dayColumns}>
              {viewModel.days.map((day, dayIndex) => (
                <article key={day.dayKey} className={styles.dayCard}>
                  <div className={styles.dayHeader}>
                    <div>
                      <p className={styles.dayLabel}>{day.label}</p>
                      <p className={styles.dayMeta}>{day.activities.length} activities captured</p>
                    </div>
                    <span
                      className={styles.dayBadge}
                      style={{ borderColor: `${COLORS[dayIndex % COLORS.length]}55`, color: COLORS[dayIndex % COLORS.length] }}
                    >
                      Day {dayIndex + 1}
                    </span>
                  </div>

                  <div className={styles.activityStream}>
                    {day.activities.map((activity, index) => (
                      <div key={activity.id} className={styles.activityNode}>
                        <div
                          className={styles.nodeMarker}
                          style={{ background: COLORS[(dayIndex + index) % COLORS.length] }}
                        />
                        <div className={styles.nodeBody}>
                          <div className={styles.nodeTopline}>
                            <span className={styles.nodeTime}>{activity.timeLabel}</span>
                            <span className={styles.nodeGroup}>{activity.groupLabel}</span>
                          </div>
                          <p className={styles.nodeLabel}>{activity.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};
