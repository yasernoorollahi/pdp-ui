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

const SkeletonPulse = ({ className }: { className: string }) => (
  <div className={`animate-pulse rounded-2xl bg-white/[0.045] ${className}`} />
);

const LoadingState = () => (
  <div className="space-y-5">
    <div className="ie-card p-7">
      <SkeletonPulse className="h-3 w-32 rounded-full" />
      <SkeletonPulse className="mt-4 h-10 w-72 rounded-full" />
      <SkeletonPulse className="mt-3 h-4 w-full max-w-lg rounded-full" />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <SkeletonPulse className="h-20" />
        <SkeletonPulse className="h-20" />
        <SkeletonPulse className="h-20" />
      </div>
    </div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="ie-card p-5 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonPulse key={i} className="h-28" />
        ))}
      </div>
      <div className="ie-card p-5">
        <SkeletonPulse className="h-[34rem]" />
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
  <section className="ie-card p-6 space-y-4">
    <SkeletonPulse className="h-3 w-36 rounded-full" />
    <SkeletonPulse className="h-9 w-72 rounded-full" />
    <SkeletonPulse className="h-[42rem]" />
  </section>
);

const CognitiveSpace3DLoadingState = () => (
  <section className="ie-card p-6 space-y-4">
    <SkeletonPulse className="h-3 w-36 rounded-full" />
    <SkeletonPulse className="h-9 w-72 rounded-full" />
    <SkeletonPulse className="h-[48rem]" />
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

const TAB_ICONS: Record<CognitiveSpaceTab, string> = {
  'structured-view': '⬡',
  'relationship-map': '◎',
  'orbital-space': '✦',
};

const TAB_THEMES: Record<CognitiveSpaceTab, {
  accent: string;
  glow: string;
  badge: string;
  activeTab: string;
  heroGradient: string;
  orb1: string;
  orb2: string;
  statCard: string;
}> = {
  'structured-view': {
    accent: 'text-teal-300',
    glow: 'shadow-[0_0_60px_rgba(45,212,191,0.08)]',
    badge: 'border-teal-400/25 bg-teal-400/8 text-teal-200',
    activeTab: 'border-teal-400/40 bg-teal-400/10 text-white shadow-[0_0_16px_rgba(45,212,191,0.12)]',
    heroGradient: 'radial-gradient(ellipse 80% 50% at 10% 20%, rgba(45,212,191,0.10) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 85% 15%, rgba(56,189,248,0.08) 0%, transparent 50%)',
    orb1: 'bg-teal-400/10',
    orb2: 'bg-cyan-300/8',
    statCard: 'border-teal-400/15 bg-teal-400/5',
  },
  'relationship-map': {
    accent: 'text-sky-300',
    glow: 'shadow-[0_0_60px_rgba(96,165,250,0.08)]',
    badge: 'border-sky-400/25 bg-sky-400/8 text-sky-200',
    activeTab: 'border-sky-400/40 bg-sky-400/10 text-white shadow-[0_0_16px_rgba(96,165,250,0.12)]',
    heroGradient: 'radial-gradient(ellipse 80% 50% at 10% 20%, rgba(96,165,250,0.10) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 85% 15%, rgba(129,140,248,0.08) 0%, transparent 50%)',
    orb1: 'bg-sky-400/10',
    orb2: 'bg-indigo-400/8',
    statCard: 'border-sky-400/15 bg-sky-400/5',
  },
  'orbital-space': {
    accent: 'text-violet-300',
    glow: 'shadow-[0_0_60px_rgba(167,139,250,0.08)]',
    badge: 'border-violet-400/25 bg-violet-400/8 text-violet-200',
    activeTab: 'border-violet-400/40 bg-violet-400/10 text-white shadow-[0_0_16px_rgba(167,139,250,0.12)]',
    heroGradient: 'radial-gradient(ellipse 70% 50% at 10% 20%, rgba(94,234,212,0.08) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 85% 15%, rgba(167,139,250,0.12) 0%, transparent 50%), radial-gradient(ellipse 50% 40% at 50% 100%, rgba(251,146,60,0.07) 0%, transparent 45%)',
    orb1: 'bg-violet-400/10',
    orb2: 'bg-orange-300/7',
    statCard: 'border-violet-400/15 bg-violet-400/5',
  },
};

const StatCard = ({ label, value, sub, accent }: { label: string; value: string | number; sub: string; accent?: string }) => (
  <div className={`ie-stat-card ${accent ?? ''}`}>
    <p className="ie-overline">{label}</p>
    <p className="mt-2 text-2xl font-bold text-white tracking-tight">{value}</p>
    <p className="mt-1 text-xs text-white/38">{sub}</p>
  </div>
);

const MetaPill = ({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'amber' | 'emerald' }) => {
  const cls = {
    default: 'border-white/10 bg-white/[0.04] text-white/55',
    amber: 'border-amber-300/20 bg-amber-400/8 text-amber-200/80',
    emerald: 'border-emerald-300/20 bg-emerald-400/8 text-emerald-200/80',
  }[variant];
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
};

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
    return () => { cancelled = true; };
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
    () => viewModel.activityGroups.find((a) => a.id === selectedActivityId) ?? viewModel.activityGroups[0] ?? null,
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
      setActiveEntityId((c) => (c === entityId ? null : entityId));
    });
  };

  const theme = TAB_THEMES[activeTab];

  const tabDescriptions: Record<CognitiveSpaceTab, { title: string; description: string }> = {
    'structured-view': {
      title: 'Structured View',
      description: 'Activity clusters on the left and grouped relationships on the right for direct reflective browsing.',
    },
    'relationship-map': {
      title: 'Relationship Map',
      description: 'A graph surface showing how activities, entities, cognitive states, and context connect across the dataset.',
    },
    'orbital-space': {
      title: '3D Space',
      description: webglReady
        ? 'An immersive starfield with a luminous Self core, layered orbital bodies, and relationship beams that emerge on interaction.'
        : 'WebGL is unavailable in this environment — the Relationship Map is available as the fallback surface.',
    },
  };

  const viewTabs = [
    ['structured-view', 'Structured View'],
    ['relationship-map', 'Relationship Map'],
    ['orbital-space', '3D Space'],
  ] as const;

  if (state.loading) return <LoadingState />;

  if (state.error && !state.response) {
    return (
      <section className="ie-card border-rose-500/20 bg-rose-500/5 p-8">
        <p className="ie-overline text-rose-300/60">Error</p>
        <h2 className="mt-3 font-display text-3xl text-white">Could not load this reflection surface.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-rose-200/60">{state.error}</p>
      </section>
    );
  }

  const activeInfo = tabDescriptions[activeTab];

  return (
    <>
      <style>{`
        .ie-root {
          position: relative;
          isolation: isolate;
          font-family: var(--font-ui);
          color: white;
          padding: 0.55rem 0.7rem 0.2rem;
        }

        .ie-root::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 34px;
          background:
            radial-gradient(circle at 12% 10%, rgba(45,212,191,0.14) 0%, transparent 28%),
            radial-gradient(circle at 88% 8%, rgba(52,211,153,0.12) 0%, transparent 26%),
            linear-gradient(180deg, rgba(255,255,255,0.025), rgba(45,212,191,0.03));
          border: 1px solid rgba(45,212,191,0.08);
          pointer-events: none;
          z-index: -1;
        }

        .ie-card {
          border-radius: 28px;
          border: 1px solid rgba(255,255,255,0.08);
          background: linear-gradient(180deg, rgba(18, 38, 36, 0.74), rgba(12, 26, 28, 0.62));
          backdrop-filter: blur(24px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05);
        }

        .ie-hero-card {
          padding: 3.35rem 3.65rem 1.55rem;
        }

        .ie-hero-stack {
          gap: 2.65rem;
        }

        .ie-hero-top {
          padding-top: 0.4rem;
        }

        .ie-hero-bottom {
          padding-top: 0.75rem;
          padding-bottom: 0.1rem;
        }

        .ie-stat-card {
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          padding: 1rem 1.1rem;
          transition: background 0.2s;
        }
        .ie-stat-card:hover {
          background: rgba(255,255,255,0.05);
        }

        .ie-overline {
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.35);
        }

        .font-display {
          font-family: var(--font-display);
          font-weight: 700;
          letter-spacing: -0.03em;
        }

        .ie-tab {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 100px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          padding: 7px 16px;
          font-size: 0.82rem;
          font-weight: 500;
          color: rgba(255,255,255,0.5);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .ie-tab:hover {
          border-color: rgba(255,255,255,0.16);
          background: rgba(255,255,255,0.07);
          color: rgba(255,255,255,0.85);
        }

        .ie-dot-grid {
          background-image: radial-gradient(rgba(255,255,255,0.07) 0.7px, transparent 0.7px);
          background-size: 20px 20px;
          mask-image: linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 75%);
          -webkit-mask-image: linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 75%);
        }

        @media (max-width: 768px) {
          .ie-root {
            padding: 0.45rem 0.45rem 0.1rem;
          }

          .ie-hero-card {
            padding: 2rem 1.5rem 1.1rem;
          }

          .ie-hero-stack {
            gap: 2rem;
          }

          .ie-hero-top {
            padding-top: 0.15rem;
          }

          .ie-hero-bottom {
            padding-top: 0.55rem;
            padding-bottom: 0;
          }
        }

        @media (min-width: 769px) and (max-width: 1279px) {
          .ie-hero-card {
            padding: 2.75rem 2.5rem 1.35rem;
          }
        }
      `}</style>

      <div className="ie-root space-y-0">

        {/* ── HERO HEADER ── */}
        {activeTab !== 'orbital-space' ? (
          <section
            className="ie-card ie-hero-card relative overflow-hidden"
            style={{ boxShadow: `0 24px 80px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.06)` }}
          >
            {/* Gradient mesh */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: theme.heroGradient }}
            />
            {/* Dot grid */}
            <div className="ie-dot-grid pointer-events-none absolute inset-0" />
            {/* Glow orbs */}
            <div className={`pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full ${theme.orb1} blur-3xl`} />
            <div className={`pointer-events-none absolute bottom-0 right-24 h-40 w-40 rounded-full ${theme.orb2} blur-3xl`} />

            <div className="ie-hero-stack relative flex flex-col">
              {/* Top row */}
              <div className="ie-hero-top flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
                {/* Title block */}
                <div className="max-w-2xl space-y-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="ie-overline" style={{ color: 'rgba(255,255,255,0.28)' }}>
                      Observability for the human mind
                    </span>
                    <span
                      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.64rem] font-semibold uppercase tracking-[0.22em]"
                      style={{
                        borderColor: 'rgba(255,255,255,0.12)',
                        background: 'rgba(255,255,255,0.05)',
                        color: 'rgba(255,255,255,0.45)',
                      }}
                    >
                      {activeInfo.title}
                    </span>
                  </div>

                  <div>
                    <h2 className="font-display text-[2.6rem] leading-[1.1] text-white lg:text-[3.2rem]">
                      Cognitive Space
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-white/45 max-w-xl">
                      {activeInfo.description}
                    </p>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[26rem]">
                  <StatCard
                    label="Observations"
                    value={viewModel.summary.observationCount}
                    sub="tracked in surface"
                  />
                  <StatCard
                    label={activeTab === 'structured-view' ? 'Clusters' : 'Graph nodes'}
                    value={activeTab === 'structured-view' ? viewModel.summary.groupCount : relationshipMap.summary.nodeCount}
                    sub={activeTab === 'structured-view' ? 'reflective groups' : 'active bodies'}
                  />
                  <StatCard
                    label={activeTab === 'structured-view' ? 'Data source' : 'Graph edges'}
                    value={activeTab === 'structured-view'
                      ? (response?.source === 'live' ? 'Live' : 'Mock')
                      : relationshipMap.summary.edgeCount}
                    sub={activeTab === 'structured-view' ? 'input for render' : 'relationship links'}
                  />
                </div>
              </div>

              {/* Bottom row: meta pills + tabs */}
              <div className="ie-hero-bottom flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <MetaPill>Endpoint: {response?.endpoint}</MetaPill>
                  <MetaPill>{viewModel.summary.entityCount} linked entities</MetaPill>
                  <MetaPill>{viewModel.summary.topicCount} distinct topics</MetaPill>
                  {response?.message ? (
                    <MetaPill variant="amber">{response.message}</MetaPill>
                  ) : null}
                </div>

                {/* Tab switcher */}
                <div
                  style={{
                    display: 'flex',
                    gap: '6px',
                    padding: '5px',
                    borderRadius: '100px',
                    border: '1px solid rgba(255,255,255,0.07)',
                    background: 'rgba(0,0,0,0.22)',
                  }}
                >
                  {viewTabs.map(([tabId, label]) => (
                    <button
                      key={tabId}
                      type="button"
                      onClick={() => startTransition(() => setActiveTab(tabId))}
                      className={activeTab === tabId ? undefined : 'ie-tab'}
                      style={activeTab === tabId ? {
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        borderRadius: '100px',
                        border: '1px solid rgba(255,255,255,0.18)',
                        background: 'rgba(255,255,255,0.10)',
                        padding: '7px 16px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: 'white',
                        cursor: 'pointer',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
                        transition: 'all 0.2s',
                      } : undefined}
                    >
                      <span style={{ fontSize: '10px', opacity: 0.7 }}>{TAB_ICONS[tabId]}</span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : (
          /* compact orbital header */
          <section className="ie-card p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div style={{ display: 'flex', gap: '6px', padding: '5px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.22)', width: 'fit-content' }}>
                {viewTabs.map(([tabId, label]) => (
                  <button
                    key={tabId}
                    type="button"
                    onClick={() => startTransition(() => setActiveTab(tabId))}
                    className={activeTab === tabId ? undefined : 'ie-tab'}
                    style={activeTab === tabId ? {
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      borderRadius: '100px',
                      border: '1px solid rgba(255,255,255,0.18)',
                      background: 'rgba(255,255,255,0.10)',
                      padding: '7px 16px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    } : undefined}
                  >
                    <span style={{ fontSize: '10px', opacity: 0.7 }}>{TAB_ICONS[tabId]}</span>
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <MetaPill>Endpoint: {response?.endpoint}</MetaPill>
                <MetaPill>{viewModel.summary.observationCount} observations</MetaPill>
                <MetaPill>{cognitiveSpace3D.summary.nodeCount} spatial nodes</MetaPill>
                <MetaPill variant={webglReady ? 'emerald' : 'amber'}>
                  {webglReady ? 'WebGL ready' : 'Fallback ready'}
                </MetaPill>
              </div>
            </div>
          </section>
        )}

        {/* ── CONTENT AREA ── */}
        {viewModel.activityGroups.length === 0 ? (
          <section className="ie-card mt-8 p-14 text-center lg:mt-10">
            <p className="ie-overline" style={{ color: 'rgba(94,234,212,0.5)' }}>Cognitive Space</p>
            <h3 className="mt-4 font-display text-3xl text-white">No observations available yet</h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/38">
              Once activity data arrives, this view will cluster similar observations and map how states, context, entities, and topics relate.
            </p>
          </section>
        ) : activeTab === 'structured-view' ? (
          <div className="mt-8 grid gap-5 lg:mt-10 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
            <InsightExplorerActivityList
              activities={viewModel.activityGroups}
              activeActivityId={selectedActivity?.id ?? null}
              onSelectActivity={handleSelectActivity}
              isPending={isPending}
            />
            <InsightExplorerDetailPanel
              activity={selectedActivity ? { ...selectedActivity, entities: selectedActivity.entities } : null}
              activeEntityId={deferredEntityId}
              onSelectEntity={handleSelectEntity}
              isPending={isPending}
            />
          </div>
        ) : activeTab === 'relationship-map' ? (
          <div className="mt-8 lg:mt-10">
            <Suspense fallback={<RelationshipMapLoadingState />}>
              <RelationshipMapView graph={relationshipMap} viewModel={viewModel} />
            </Suspense>
          </div>
        ) : webglReady ? (
          <div className="mt-8 lg:mt-10">
            <Suspense fallback={<CognitiveSpace3DLoadingState />}>
              <CognitiveSpace3DView model={cognitiveSpace3D} />
            </Suspense>
          </div>
        ) : (
          <div className="mt-8 space-y-4 lg:mt-10">
            <section className="ie-card border-amber-400/15 bg-amber-400/5 p-5 text-amber-200/70">
              <p className="ie-overline" style={{ color: 'rgba(251,191,36,0.45)' }}>3D Fallback</p>
              <p className="mt-2 text-sm leading-6">
                WebGL is not available — falling back to the Relationship Map instead of rendering a broken scene.
              </p>
            </section>
            <Suspense fallback={<RelationshipMapLoadingState />}>
              <RelationshipMapView graph={relationshipMap} viewModel={viewModel} />
            </Suspense>
          </div>
        )}
      </div>
    </>
  );
};
