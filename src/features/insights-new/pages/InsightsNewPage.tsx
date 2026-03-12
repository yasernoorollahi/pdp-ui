import { useCallback, useEffect, useMemo, useState } from 'react';
import { insightsService } from '../../../services/insights.service';
import type {
  MindSnapshot as MindSnapshotData,
  TimelinePoint,
  FrictionPoint,
  MoodWord,
  InsightSummary,
  EnergyTrend,
  MotivationTrend,
  SocialTrend,
  DisciplineTrend,
} from '../../../services/insights.service';
import { NewMindSnapshot } from '../components/NewMindSnapshot';
import { NewTimelineChart } from '../components/NewTimelineChart';
import { NewLifeBalanceRadar } from '../components/NewLifeBalanceRadar';
import { NewFrictionHeatmap } from '../components/NewFrictionHeatmap';
import { NewMoodCloud } from '../components/NewMoodCloud';
import { NewInsightTrendCard } from '../components/NewInsightTrendCard';
import { NewReflectionCard } from '../components/NewReflectionCard';
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

const formatLongDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const errorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unexpected error. Please try again.';
};

export const InsightsNewPage = () => {
  const days = 15;

  const [snapshotState, setSnapshotState] = useState<LoadState<MindSnapshotData>>(createLoadingState);
  const [timelineState, setTimelineState] = useState<LoadState<TimelinePoint[]>>(createLoadingState);
  const [frictionState, setFrictionState] = useState<LoadState<FrictionPoint[]>>(createLoadingState);
  const [moodState, setMoodState] = useState<LoadState<MoodWord[]>>(createLoadingState);
  const [summaryState, setSummaryState] = useState<LoadState<InsightSummary>>(createLoadingState);
  const [energyState, setEnergyState] = useState<LoadState<EnergyTrend>>(createLoadingState);
  const [motivationState, setMotivationState] = useState<LoadState<MotivationTrend>>(createLoadingState);
  const [socialState, setSocialState] = useState<LoadState<SocialTrend>>(createLoadingState);
  const [disciplineState, setDisciplineState] = useState<LoadState<DisciplineTrend>>(createLoadingState);

  const loadInsights = useCallback(async () => {
    setSnapshotState(createLoadingState());
    setTimelineState(createLoadingState());
    setFrictionState(createLoadingState());
    setMoodState(createLoadingState());
    setSummaryState(createLoadingState());
    setEnergyState(createLoadingState());
    setMotivationState(createLoadingState());
    setSocialState(createLoadingState());
    setDisciplineState(createLoadingState());

    const results = await Promise.allSettled([
      insightsService.getTodaySnapshot(),
      insightsService.getTimeline(days),
      insightsService.getFrictionHeatmap(),
      insightsService.getMoods(),
      insightsService.getSummary(),
      insightsService.getEnergy(),
      insightsService.getMotivation(),
      insightsService.getSocial(),
      insightsService.getDiscipline(),
    ]);

    const [
      snapshotResult,
      timelineResult,
      frictionResult,
      moodResult,
      summaryResult,
      energyResult,
      motivationResult,
      socialResult,
      disciplineResult,
    ] = results;

    if (snapshotResult.status === 'fulfilled') {
      setSnapshotState({ loading: false, error: null, data: snapshotResult.value });
    } else {
      setSnapshotState({ loading: false, error: errorMessage(snapshotResult.reason), data: null });
    }

    if (timelineResult.status === 'fulfilled') {
      setTimelineState({ loading: false, error: null, data: timelineResult.value });
    } else {
      setTimelineState({ loading: false, error: errorMessage(timelineResult.reason), data: null });
    }

    if (frictionResult.status === 'fulfilled') {
      setFrictionState({ loading: false, error: null, data: frictionResult.value });
    } else {
      setFrictionState({ loading: false, error: errorMessage(frictionResult.reason), data: null });
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

  const energyDescriptor = useMemo(() => {
    const value = energyState.data?.averageEnergy ?? 0;
    if (value >= 0.75) return 'High';
    if (value >= 0.5) return 'Steady';
    if (value >= 0.25) return 'Low';
    return 'Very Low';
  }, [energyState.data]);

  const motivationDescriptor = useMemo(() => {
    const value = motivationState.data?.averageMotivation ?? 0;
    if (value >= 0.75) return 'High';
    if (value >= 0.5) return 'Focused';
    if (value >= 0.25) return 'Low';
    return 'Very Low';
  }, [motivationState.data]);

  const socialDescriptor = useMemo(() => {
    const trend = socialState.data?.trend ?? [];
    const max = Math.max(...trend.map((item) => item.value), 1);
    const avg = trend.reduce((sum, item) => sum + item.value, 0) / Math.max(trend.length, 1);
    const ratio = max === 0 ? 0 : avg / max;
    if (ratio >= 0.75) return 'Active';
    if (ratio >= 0.5) return 'Present';
    if (ratio >= 0.25) return 'Quiet';
    return 'Silent';
  }, [socialState.data]);

  const disciplineDescriptor = useMemo(() => {
    const trend = disciplineState.data?.trend ?? [];
    const max = Math.max(...trend.map((item) => item.value), 1);
    const avg = trend.reduce((sum, item) => sum + item.value, 0) / Math.max(trend.length, 1);
    const ratio = max === 0 ? 0 : avg / max;
    if (ratio >= 0.75) return 'Strong';
    if (ratio >= 0.5) return 'Steady';
    if (ratio >= 0.25) return 'Wavering';
    return 'Low';
  }, [disciplineState.data]);

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.heroKicker}>Your Mind — Last {days} Days</p>
          <h2 className={styles.heroTitle}>A mirror of your recent patterns</h2>
          <p className={styles.heroSubtitle}>Your behavioral reflection, distilled from daily signals.</p>
        </div>
        <div className={styles.heroMeta}>
          <span className={styles.heroMetaLabel}>Last updated</span>
          <span className={styles.heroMetaValue}>{lastUpdated}</span>
        </div>
      </div>

      <div className={styles.gridTop}>
        <NewMindSnapshot
          data={snapshotState.data}
          loading={snapshotState.loading}
          error={snapshotState.error}
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
        <NewInsightTrendCard
          title="Energy Flow"
          subtitle="Daily Rhythm"
          variant="energy"
          color="#2dd4bf"
          loading={energyState.loading}
          error={energyState.error}
          empty={!energyState.data || energyState.data.trend.length === 0}
          onRetry={loadInsights}
          descriptor={energyDescriptor}
          trend={energyState.data?.trend ?? []}
        />
        <NewInsightTrendCard
          title="Motivation Arc"
          subtitle="Momentum"
          variant="motivation"
          color="#34d399"
          loading={motivationState.loading}
          error={motivationState.error}
          empty={!motivationState.data || motivationState.data.trend.length === 0}
          onRetry={loadInsights}
          descriptor={motivationDescriptor}
          trend={motivationState.data?.trend ?? []}
        />
        <NewInsightTrendCard
          title="Social Pulse"
          subtitle="Connections"
          variant="social"
          color="#60a5fa"
          loading={socialState.loading}
          error={socialState.error}
          empty={!socialState.data || socialState.data.trend.length === 0}
          onRetry={loadInsights}
          descriptor={socialDescriptor}
          trend={socialState.data?.trend ?? []}
        />
        <NewInsightTrendCard
          title="Discipline Trace"
          subtitle="Habits"
          variant="discipline"
          color="#c084fc"
          loading={disciplineState.loading}
          error={disciplineState.error}
          empty={!disciplineState.data || disciplineState.data.trend.length === 0}
          onRetry={loadInsights}
          descriptor={disciplineDescriptor}
          trend={disciplineState.data?.trend ?? []}
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
      />

      <div className={styles.gridBottom}>
        <NewFrictionHeatmap
          data={frictionState.data}
          loading={frictionState.loading}
          error={frictionState.error}
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
