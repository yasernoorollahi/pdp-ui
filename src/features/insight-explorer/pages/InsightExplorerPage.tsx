import { Suspense, lazy, useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react';
import { insightExplorerService } from '../../../services/insightExplorer.service';
import { InsightExplorerActivityList } from '../components/InsightExplorerActivityList';
import { InsightExplorerDetailPanel } from '../components/InsightExplorerDetailPanel';
import { buildCognitiveSpace3DViewModel } from '../view-models/buildCognitiveSpace3DViewModel';
import { buildInsightExplorerViewModel } from '../view-models/buildInsightExplorerViewModel';
import { buildRelationshipMapViewModel } from '../view-models/buildRelationshipMapViewModel';
import type { InsightExplorerNormalizedData, InsightExplorerResponse } from '../types';

type LoadState = {
  loading: boolean;
  error: string | null;
  response: InsightExplorerResponse | null;
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

const formatError = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  return 'Unexpected error while loading insight data.';
};

const LoadingState = () => (
  <div className="space-y-6">
    <div className="rounded-[30px] border border-white/10 bg-[rgba(5,14,18,0.78)] p-6 backdrop-blur-xl">
      <div className="h-3 w-36 animate-pulse rounded-full bg-white/10" />
      <div className="mt-4 h-12 w-72 animate-pulse rounded-full bg-white/10" />
      <div className="mt-4 h-4 w-full max-w-2xl animate-pulse rounded-full bg-white/10" />
    </div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <div className="rounded-[30px] border border-white/10 bg-[rgba(5,14,18,0.78)] p-5">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-[24px] bg-white/5" />
          ))}
        </div>
      </div>
      <div className="rounded-[30px] border border-white/10 bg-[rgba(5,14,18,0.78)] p-5">
        <div className="h-[34rem] animate-pulse rounded-[24px] bg-white/5" />
      </div>
    </div>
  </div>
);

const RelationshipMapView = lazy(() =>
  import('../components/RelationshipMapView').then((module) => ({
    default: module.RelationshipMapView,
  })),
);

const CognitiveSpace3DView = lazy(() =>
  import('../components/CognitiveSpace3DView').then((module) => ({
    default: module.CognitiveSpace3DView,
  })),
);

const RelationshipMapLoadingState = () => (
  <section className="rounded-[30px] border border-white/10 bg-[rgba(5,14,18,0.78)] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl">
    <div className="space-y-4">
      <div className="h-3 w-40 animate-pulse rounded-full bg-white/10" />
      <div className="h-10 w-80 animate-pulse rounded-full bg-white/10" />
      <div className="h-[42rem] animate-pulse rounded-[24px] bg-white/5" />
    </div>
  </section>
);

const CognitiveSpace3DLoadingState = () => (
  <section className="rounded-[30px] border border-white/10 bg-[rgba(5,14,18,0.78)] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl">
    <div className="space-y-4">
      <div className="h-3 w-40 animate-pulse rounded-full bg-white/10" />
      <div className="h-10 w-80 animate-pulse rounded-full bg-white/10" />
      <div className="h-[48rem] animate-pulse rounded-[24px] bg-white/5" />
    </div>
  </section>
);

const supportsWebGL = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;

  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')),
    );
  } catch {
    return false;
  }
};

type CognitiveSpaceTab = 'structured-view' | 'relationship-map' | 'orbital-space';

export const InsightExplorerPage = () => {
  const [state, setState] = useState<LoadState>({
    loading: true,
    error: null,
    response: null,
  });
  const [activeTab, setActiveTab] = useState<CognitiveSpaceTab>('structured-view');
  const [webglReady] = useState<boolean>(() => supportsWebGL());
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [activeEntityId, setActiveEntityId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

  const response = state.response;
  const dataset = response?.data ?? EMPTY_DATASET;
  const viewModel = useMemo(() => buildInsightExplorerViewModel(dataset), [dataset]);
  const relationshipMap = useMemo(() => buildRelationshipMapViewModel(viewModel), [viewModel]);
  const cognitiveSpace3D = useMemo(
    () => buildCognitiveSpace3DViewModel(relationshipMap, viewModel.summary.observationCount),
    [relationshipMap, viewModel.summary.observationCount],
  );

  const deferredEntityId = useDeferredValue(activeEntityId);

  const selectedActivity = useMemo(
    () => viewModel.activityGroups.find((activity) => activity.id === selectedActivityId) ?? viewModel.activityGroups[0] ?? null,
    [selectedActivityId, viewModel.activityGroups],
  );

  const handleSelectActivity = (activityId: string) => {
    startTransition(() => {
      setSelectedActivityId(activityId);
      setActiveEntityId(null);
    });
  };

  const handleSelectEntity = (entityId: string) => {
    startTransition(() => {
      setActiveEntityId((current) => (current === entityId ? null : entityId));
    });
  };

  const activeTabCopy = activeTab === 'structured-view'
    ? {
        title: 'Structured View',
        description: 'Activity clusters on the left and grouped relationships on the right for direct reflective browsing.',
      }
    : activeTab === 'relationship-map'
      ? {
        title: 'Relationship Map',
        description: 'A graph surface showing how activities, entities, cognitive states, and context connect across the dataset.',
      }
      : {
        title: '3D Space',
        description: webglReady
          ? 'An immersive starfield with a luminous Self core, layered orbital bodies, and relationship beams that emerge only when you interact.'
          : 'WebGL is unavailable in this environment, so the Relationship Map remains available as the fallback interaction surface.',
      };

  const activeTabTheme = activeTab === 'structured-view'
      ? {
          heroClass: 'bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_22%),radial-gradient(circle_at_82%_18%,rgba(56,189,248,0.14),transparent_18%),linear-gradient(145deg,rgba(5,14,18,0.96),rgba(7,23,28,0.88))]',
          badgeClass: 'border-teal-300/20 bg-teal-400/10 text-teal-100',
          glowClass: 'shadow-[0_18px_40px_rgba(45,212,191,0.12)]',
          tabActiveClass: 'border-teal-300/55 bg-teal-400/12 text-white',
        }
    : activeTab === 'relationship-map'
      ? {
          heroClass: 'bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.18),transparent_22%),radial-gradient(circle_at_82%_18%,rgba(129,140,248,0.16),transparent_18%),linear-gradient(145deg,rgba(5,14,18,0.96),rgba(10,18,34,0.9))]',
          badgeClass: 'border-sky-300/20 bg-sky-400/10 text-sky-100',
          glowClass: 'shadow-[0_18px_40px_rgba(96,165,250,0.12)]',
          tabActiveClass: 'border-sky-300/55 bg-sky-400/12 text-white',
        }
      : {
          heroClass: 'bg-[radial-gradient(circle_at_top_left,rgba(94,234,212,0.16),transparent_20%),radial-gradient(circle_at_82%_18%,rgba(167,139,250,0.18),transparent_20%),radial-gradient(circle_at_50%_100%,rgba(251,146,60,0.12),transparent_26%),linear-gradient(145deg,rgba(4,10,20,0.98),rgba(7,18,30,0.92))]',
          badgeClass: 'border-violet-300/20 bg-violet-400/10 text-violet-100',
          glowClass: 'shadow-[0_18px_40px_rgba(167,139,250,0.16)]',
          tabActiveClass: 'border-violet-300/55 bg-violet-400/12 text-white',
        };

  const viewTabs = [
    ['structured-view', 'Structured View'],
    ['relationship-map', 'Relationship Map'],
    ['orbital-space', '3D Space'],
  ] as const;

  if (state.loading) {
    return <LoadingState />;
  }

  if (state.error && !state.response) {
    return (
      <section className="rounded-[30px] border border-rose-400/25 bg-rose-500/8 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-rose-200/70">Cognitive Space</p>
        <h2 className="mt-3 font-serif text-3xl text-white">We could not load this reflection surface.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-rose-100/80">{state.error}</p>
      </section>
    );
  }

  return (
    <div className="space-y-6 text-white">
      {activeTab !== 'orbital-space' ? (
        <section className={`relative overflow-hidden rounded-[38px] border border-white/10 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl lg:p-8 ${activeTabTheme.heroClass}`}>
          <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(255,255,255,0.1)_0.6px,transparent_0.6px)] [background-size:18px_18px] [mask-image:linear-gradient(180deg,black,transparent_80%)]" />
          <div className="pointer-events-none absolute -left-12 top-10 h-40 w-40 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="pointer-events-none absolute right-8 top-10 h-36 w-36 rounded-full bg-orange-300/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-1/3 h-48 w-48 rounded-full bg-violet-400/10 blur-3xl" />

          <div className="relative flex flex-col gap-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-teal-200/75">
                    Observability for the human mind
                  </p>
                  <span className={`rounded-full border px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] ${activeTabTheme.badgeClass}`}>
                    {activeTabCopy.title}
                  </span>
                </div>

                <div>
                  <h2 className="font-serif text-4xl text-white sm:text-5xl">Cognitive Space</h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                    {activeTabCopy.description}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[28rem]">
                <div className={`rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] px-4 py-4 ${activeTabTheme.glowClass}`}>
                  <p className="text-[0.68rem] uppercase tracking-[0.22em] text-slate-400">Observations</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{viewModel.summary.observationCount}</p>
                  <p className="mt-1 text-xs text-slate-400">tracked in this surface</p>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] px-4 py-4">
                  <p className="text-[0.68rem] uppercase tracking-[0.22em] text-slate-400">
                    {activeTab === 'structured-view' ? 'Clusters' : 'Graph nodes'}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {activeTab === 'structured-view'
                      ? viewModel.summary.groupCount
                      : relationshipMap.summary.nodeCount}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {activeTab === 'structured-view' ? 'reflective groupings' : 'active graph bodies'}
                  </p>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] px-4 py-4">
                  <p className="text-[0.68rem] uppercase tracking-[0.22em] text-slate-400">
                    {activeTab === 'structured-view' ? 'Data source' : 'Graph edges'}
                  </p>
                  <p className="mt-2 text-base font-semibold text-white">
                    {activeTab === 'structured-view'
                      ? (response?.source === 'live' ? 'Live API' : 'Mock snapshot')
                      : relationshipMap.summary.edgeCount}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {activeTab === 'structured-view' ? 'input for this render' : 'relationship links'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                  Endpoint: {response?.endpoint}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                  {viewModel.summary.entityCount} linked entities
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                  {viewModel.summary.topicCount} distinct topics
                </span>
                {response?.message ? (
                  <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-100">
                    {response.message}
                  </span>
                ) : null}
              </div>

              <div className="rounded-[28px] border border-white/10 bg-black/[0.18] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <div className="flex flex-wrap gap-2">
                  {viewTabs.map(([tabId, label]) => (
                    <button
                      key={tabId}
                      type="button"
                      onClick={() =>
                        startTransition(() => {
                          setActiveTab(tabId);
                        })
                      }
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ${
                        activeTab === tabId
                          ? activeTabTheme.tabActiveClass
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/[0.08]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <span className="rounded-full border border-white/10 bg-black/[0.18] px-4 py-2 text-sm text-slate-300">
                    {activeTabCopy.title}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(4,10,18,0.92),rgba(2,7,14,0.88))] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.3)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {viewTabs.map(([tabId, label]) => (
                <button
                  key={tabId}
                  type="button"
                  onClick={() =>
                    startTransition(() => {
                      setActiveTab(tabId);
                    })
                  }
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    activeTab === tabId
                      ? activeTabTheme.tabActiveClass
                      : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/[0.08]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-200">
                Endpoint: {response?.endpoint}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-200">
                {viewModel.summary.observationCount} observations
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-200">
                {cognitiveSpace3D.summary.nodeCount} spatial nodes
              </span>
              <span className={`rounded-full border px-3 py-1 ${webglReady ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100' : 'border-amber-300/20 bg-amber-400/10 text-amber-100'}`}>
                {webglReady ? 'WebGL ready' : 'Fallback ready'}
              </span>
            </div>
          </div>
        </section>
      )}

      {viewModel.activityGroups.length === 0 ? (
        <section className="rounded-[30px] border border-dashed border-white/10 bg-[rgba(5,14,18,0.72)] p-10 text-center shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-teal-200/70">Cognitive Space</p>
          <h3 className="mt-4 font-serif text-3xl text-white">No observations available yet</h3>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-300">
            Once activity data arrives, this view will cluster similar observations and map how states, context, entities, and topics relate.
          </p>
        </section>
      ) : activeTab === 'structured-view' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
          <InsightExplorerActivityList
            activities={viewModel.activityGroups}
            activeActivityId={selectedActivity?.id ?? null}
            onSelectActivity={handleSelectActivity}
            isPending={isPending}
          />

          <InsightExplorerDetailPanel
            activity={
              selectedActivity
                ? {
                    ...selectedActivity,
                    entities: selectedActivity.entities,
                  }
                : null
            }
            activeEntityId={deferredEntityId}
            onSelectEntity={handleSelectEntity}
            isPending={isPending}
          />
        </div>
      ) : activeTab === 'relationship-map' ? (
        <Suspense fallback={<RelationshipMapLoadingState />}>
          <RelationshipMapView graph={relationshipMap} />
        </Suspense>
      ) : webglReady ? (
        <Suspense fallback={<CognitiveSpace3DLoadingState />}>
          <CognitiveSpace3DView model={cognitiveSpace3D} />
        </Suspense>
      ) : (
        <div className="space-y-4">
          <section className="rounded-[28px] border border-amber-300/20 bg-amber-400/10 p-5 text-amber-100 shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em]">3D Fallback</p>
            <p className="mt-2 text-sm leading-6">
              WebGL is not available here, so the phase 3 tab falls back to the phase 2 `Relationship Map` instead of rendering a broken scene.
            </p>
          </section>
          <Suspense fallback={<RelationshipMapLoadingState />}>
            <RelationshipMapView graph={relationshipMap} />
          </Suspense>
        </div>
      )}
    </div>
  );
};
