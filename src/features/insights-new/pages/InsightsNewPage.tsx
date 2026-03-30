import { useCallback, useEffect, useMemo, useState } from 'react';
import { insightsService } from '../../../services/insights.service';
import type {
  TimelinePoint,
  MoodWord,
  InsightSummary,
  EnergyTrend,
  MotivationTrend,
  SocialTrend,
  DisciplineTrend,
} from '../../../services/insights.service';
import { NewMindSnapshot } from '../components/NewMindSnapshot';
import { NewLifeBalanceRadar } from '../components/NewLifeBalanceRadar';
import { NewDailyRhythmChart } from '../components/NewDailyRhythmChart';
import { NewMotivationMomentum } from '../components/NewMotivationMomentum';
import { NewSocialPulseBar } from '../components/NewSocialPulseBar';
import { NewDisciplineTraceHeatmap } from '../components/NewDisciplineTraceHeatmap';
import { NewTimelineChart } from '../components/NewTimelineChart';
import { NewReflectionCard } from '../components/NewReflectionCard';
import { NewBehaviorHeatCalendar } from '../components/NewBehaviorHeatCalendar';
import { NewMoodCloud } from '../components/NewMoodCloud';
import { formatLongDate, interpretationText, levelLabel, SIGNAL_COLORS, clamp01 } from '../utils/signalUtils';
import styles from './InsightsNewPage.module.css';

type LoadState<T> = {
  loading: boolean;
  error: string | null;
  data: T | null;
};

const createLoadingState = <T,>(): LoadState<T> => ({
  loading: true,
  error: null,
  data: null,
});

const errorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unexpected error. Please try again.';
};

const average = (values: number[]) => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const SUMMARY_ITEMS = [
  { key: 'energy', label: 'Energy' },
  { key: 'motivation', label: 'Motivation' },
  { key: 'social', label: 'Social' },
  { key: 'discipline', label: 'Discipline' },
  { key: 'friction', label: 'Friction' },
] as const;

export const InsightsNewPage = () => {
  const days = 15;

  const [timelineState, setTimelineState] = useState<LoadState<TimelinePoint[]>>(createLoadingState);
  const [moodState, setMoodState] = useState<LoadState<MoodWord[]>>(createLoadingState);
  const [summaryState, setSummaryState] = useState<LoadState<InsightSummary>>(createLoadingState);
  const [energyState, setEnergyState] = useState<LoadState<EnergyTrend>>(createLoadingState);
  const [motivationState, setMotivationState] = useState<LoadState<MotivationTrend>>(createLoadingState);
  const [socialState, setSocialState] = useState<LoadState<SocialTrend>>(createLoadingState);
  const [disciplineState, setDisciplineState] = useState<LoadState<DisciplineTrend>>(createLoadingState);

  const loadInsights = useCallback(async () => {
    setTimelineState(createLoadingState());
    setMoodState(createLoadingState());
    setSummaryState(createLoadingState());
    setEnergyState(createLoadingState());
    setMotivationState(createLoadingState());
    setSocialState(createLoadingState());
    setDisciplineState(createLoadingState());

    const results = await Promise.allSettled([
      insightsService.getTimeline(days),
      insightsService.getMoods(),
      insightsService.getSummary(),
      insightsService.getEnergy(),
      insightsService.getMotivation(),
      insightsService.getSocial(),
      insightsService.getDiscipline(),
    ]);

    const [
      timelineResult,
      moodResult,
      summaryResult,
      energyResult,
      motivationResult,
      socialResult,
      disciplineResult,
    ] = results;

    if (timelineResult.status === 'fulfilled') {
      setTimelineState({ loading: false, error: null, data: timelineResult.value });
    } else {
      setTimelineState({ loading: false, error: errorMessage(timelineResult.reason), data: null });
    }

    if (moodResult.status === 'fulfilled') {
      setMoodState({ loading: false, error: null, data: moodResult.value });
    } else {
      setMoodState({ loading: false, error: errorMessage(moodResult.reason), data: null });
    }

    if (summaryResult.status === 'fulfilled') {
      setSummaryState({ loading: false, error: null, data: summaryResult.value });
    } else {
      setSummaryState({ loading: false, error: errorMessage(summaryResult.reason), data: null });
    }

    if (energyResult.status === 'fulfilled') {
      setEnergyState({ loading: false, error: null, data: energyResult.value });
    } else {
      setEnergyState({ loading: false, error: errorMessage(energyResult.reason), data: null });
    }

    if (motivationResult.status === 'fulfilled') {
      setMotivationState({ loading: false, error: null, data: motivationResult.value });
    } else {
      setMotivationState({ loading: false, error: errorMessage(motivationResult.reason), data: null });
    }

    if (socialResult.status === 'fulfilled') {
      setSocialState({ loading: false, error: null, data: socialResult.value });
    } else {
      setSocialState({ loading: false, error: errorMessage(socialResult.reason), data: null });
    }

    if (disciplineResult.status === 'fulfilled') {
      setDisciplineState({ loading: false, error: null, data: disciplineResult.value });
    } else {
      setDisciplineState({ loading: false, error: errorMessage(disciplineResult.reason), data: null });
    }
  }, [days]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const lastUpdated = useMemo(() => {
    const lastTimelineDate = timelineState.data?.[timelineState.data.length - 1]?.date;
    if (lastTimelineDate) return formatLongDate(lastTimelineDate);
    return formatLongDate(new Date().toISOString());
  }, [timelineState.data]);

  const summarySignals = useMemo(() => {
    const data = timelineState.data ?? [];
    if (data.length === 0) return null;
    const frictionMax = Math.max(...data.map((item) => item.friction), 1);
    const socialMax = Math.max(...data.map((item) => item.social), 1);
    const disciplineMax = Math.max(...data.map((item) => item.discipline), 1);

    const energy = clamp01(average(data.map((item) => item.energy)));
    const motivation = clamp01(average(data.map((item) => item.motivation)));
    const social = clamp01(average(data.map((item) => item.social / socialMax)));
    const discipline = clamp01(average(data.map((item) => item.discipline / disciplineMax)));
    const friction = clamp01(average(data.map((item) => item.friction / frictionMax)));

    return { energy, motivation, social, discipline, friction };
  }, [timelineState.data]);

  const summaryCards = useMemo(() => {
    if (!summarySignals) return [];

    return SUMMARY_ITEMS.map((item) => ({
      ...item,
      value: summarySignals[item.key],
      percent: Math.round(summarySignals[item.key] * 100),
      hint: interpretationText(item.key, summarySignals[item.key]),
      tone: item.key === 'friction' ? 'Watch' : levelLabel(summarySignals[item.key]),
    }));
  }, [summarySignals]);

  const heroHighlights = useMemo(() => {
    if (!summarySignals) return [];

    const positiveSignals = SUMMARY_ITEMS
      .filter((item) => item.key !== 'friction')
      .map((item) => ({
        ...item,
        value: summarySignals[item.key],
        percent: Math.round(summarySignals[item.key] * 100),
        hint: interpretationText(item.key, summarySignals[item.key]),
      }));

    const strongest = positiveSignals.reduce((best, item) => (item.value > best.value ? item : best), positiveSignals[0]);
    const weakest = positiveSignals.reduce((lowest, item) => (item.value < lowest.value ? item : lowest), positiveSignals[0]);
    const friction = summarySignals.friction;

    return [
      {
        label: 'Window',
        value: `${timelineState.data?.length ?? 0} snapshots`,
        hint: `Tracking the last ${days} days of behavior.`,
      },
      {
        label: 'Strongest Signal',
        value: `${strongest.label} ${strongest.percent}%`,
        hint: strongest.hint,
      },
      friction >= 0.5
        ? {
            label: 'Watchpoint',
            value: `Friction ${Math.round(friction * 100)}%`,
            hint: interpretationText('friction', friction),
          }
        : {
            label: 'Soft Spot',
            value: `${weakest.label} ${weakest.percent}%`,
            hint: weakest.hint,
          },
    ];
  }, [days, summarySignals, timelineState.data]);

  const socialPulseData = useMemo<SocialTrend | null>(() => {
    if (timelineState.data && timelineState.data.length > 0) {
      const trend = timelineState.data.map((item) => ({
        date: item.date,
        value: item.social,
      }));

      return {
        total: trend.reduce((sum, item) => sum + item.value, 0),
        trend,
      };
    }

    return socialState.data;
  }, [socialState.data, timelineState.data]);

  const socialPulseLoading = !socialPulseData && (timelineState.loading || socialState.loading);
  const socialPulseError = socialPulseData ? null : timelineState.error ?? socialState.error;

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.heroKicker}>Behavioral Observability · Last {days} Days</p>
          <h2 className={styles.heroTitle}>Your Cognitive Mirror</h2>
          <p className={styles.heroSubtitle}>Signals distilled into patterns. Observe your energy, momentum, and behavioral rhythms.</p>
          {heroHighlights.length > 0 ? (
            <div className={styles.heroHighlights}>
              {heroHighlights.map((item) => (
                <div key={item.label} className={styles.heroHighlight}>
                  <span className={styles.heroHighlightLabel}>{item.label}</span>
                  <span className={styles.heroHighlightValue}>{item.value}</span>
                  <span className={styles.heroHighlightHint}>{item.hint}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className={styles.heroMeta}>
          <span className={styles.heroMetaLabel}>Last updated</span>
          <span className={styles.heroMetaValue}>{lastUpdated}</span>
        </div>
      </div>

      {summaryCards.length > 0 ? (
        <div className={styles.summaryRow}>
          {summaryCards.map((item) => (
            <div key={item.key} className={styles.summaryCard}>
              <div className={styles.summaryTop}>
                <div className={styles.summaryLabel}>{item.label}</div>
                <div className={styles.summaryTone}>{item.tone}</div>
              </div>
              <div className={styles.summaryValue} style={{ color: SIGNAL_COLORS[item.key] }}>
                {item.percent}%
              </div>
              <div className={styles.summaryTrack}>
                <span
                  className={styles.summaryTrackFill}
                  style={{
                    width: `${Math.max(item.percent, 8)}%`,
                    background: SIGNAL_COLORS[item.key],
                  }}
                />
              </div>
              <div className={styles.summaryHint}>{item.hint}</div>
            </div>
          ))}
        </div>
      ) : null}

      <div className={styles.gridTop}>
        <NewMindSnapshot
          data={timelineState.data}
          loading={timelineState.loading}
          error={timelineState.error}
          onRetry={loadInsights}
        />
        <NewLifeBalanceRadar
          data={timelineState.data}
          loading={timelineState.loading}
          error={timelineState.error}
          onRetry={loadInsights}
        />
      </div>

      <div className={styles.trendGrid}>
        <NewDailyRhythmChart
          data={energyState.data}
          loading={energyState.loading}
          error={energyState.error}
          onRetry={loadInsights}
        />
        <NewMotivationMomentum
          data={motivationState.data}
          loading={motivationState.loading}
          error={motivationState.error}
          onRetry={loadInsights}
        />
        <NewSocialPulseBar
          data={socialPulseData}
          loading={socialPulseLoading}
          error={socialPulseError}
          onRetry={loadInsights}
        />
        <NewDisciplineTraceHeatmap
          data={timelineState.data}
          loading={timelineState.loading}
          error={timelineState.error}
          onRetry={loadInsights}
        />
      </div>

      <NewTimelineChart
        data={timelineState.data}
        loading={timelineState.loading}
        error={timelineState.error}
        onRetry={loadInsights}
        days={days}
      />

      <NewReflectionCard
        data={summaryState.data}
        loading={summaryState.loading}
        error={summaryState.error}
        onRetry={loadInsights}
        trends={{
          energy: energyState.data?.trend ?? [],
          motivation: motivationState.data?.trend ?? [],
          social: socialState.data?.trend ?? [],
          discipline: disciplineState.data?.trend ?? [],
        }}
      />

      <div className={styles.gridBottom}>
        <NewBehaviorHeatCalendar
          data={timelineState.data}
          loading={timelineState.loading}
          error={timelineState.error}
          onRetry={loadInsights}
        />
        <NewMoodCloud
          data={moodState.data}
          loading={moodState.loading}
          error={moodState.error}
          onRetry={loadInsights}
        />
      </div>
    </div>
  );
};
