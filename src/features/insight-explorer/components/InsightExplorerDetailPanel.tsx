import type {
  ActivityGroupViewModel,
  ContextGroup,
  EntityType,
  InsightEntityViewModel,
  InsightRelationItemViewModel,
} from '../types';

type InsightExplorerDetailPanelProps = {
  activity: ActivityGroupViewModel | null;
  activeEntityId: string | null;
  onSelectEntity: (entityId: string) => void;
  isPending: boolean;
};

const COGNITIVE_COPY = {
  CONFIDENCE: {
    title: 'Confidence',
    tone: 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100',
  },
  UNCERTAINTY: {
    title: 'Uncertainty',
    tone: 'border-amber-300/20 bg-amber-400/10 text-amber-100',
  },
} as const;

const CONTEXT_COPY: Record<ContextGroup, { title: string; tone: string; dot: string }> = {
  LIKE: {
    title: 'Like',
    tone: 'border-emerald-300/20 bg-emerald-400/10',
    dot: 'bg-emerald-300',
  },
  DISLIKE: {
    title: 'Dislike',
    tone: 'border-rose-300/20 bg-rose-400/10',
    dot: 'bg-rose-300',
  },
  CONSTRAINT: {
    title: 'Constraint',
    tone: 'border-amber-300/20 bg-amber-400/10',
    dot: 'bg-amber-300',
  },
};

const TYPE_COPY: Record<EntityType, string> = {
  PERSON: 'People',
  LOCATION: 'Locations',
  TOOL: 'Tools',
  PROJECT: 'Projects',
};

const matchesEntityFilter = (relatedEntityIds: string[], activeEntityId: string | null) => {
  if (!activeEntityId) return true;
  return relatedEntityIds.includes(activeEntityId);
};

const getRelationItemClass = (item: InsightRelationItemViewModel, activeEntityId: string | null) => {
  if (!activeEntityId) return 'border-white/10 bg-white/5 text-white';
  if (matchesEntityFilter(item.relatedEntityIds, activeEntityId)) return 'border-teal-300/35 bg-teal-400/12 text-white';
  return 'border-white/5 bg-white/[0.03] text-white/45';
};

const RelationList = ({
  items,
  activeEntityId,
  emptyLabel,
}: {
  items: InsightRelationItemViewModel[];
  activeEntityId: string | null;
  emptyLabel: string;
}) => {
  if (items.length === 0) {
    return <p className="text-sm leading-6 text-slate-400">{emptyLabel}</p>;
  }

  const visibleItems = activeEntityId ? items.filter((item) => matchesEntityFilter(item.relatedEntityIds, activeEntityId)) : items;

  if (activeEntityId && visibleItems.length === 0) {
    return <p className="text-sm leading-6 text-slate-400">No direct links for the active entity inside this section.</p>;
  }

  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div
          key={item.id}
          className={`flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 transition-all duration-300 ${getRelationItemClass(item, activeEntityId)}`}
        >
          <span className="text-sm">{item.label}</span>
          <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[0.7rem] text-white/70">
            {item.frequency}x
          </span>
        </div>
      ))}
    </div>
  );
};

export const InsightExplorerDetailPanel = ({
  activity,
  activeEntityId,
  onSelectEntity,
  isPending,
}: InsightExplorerDetailPanelProps) => {
  if (!activity) {
    return (
      <section className="flex min-h-[34rem] items-center justify-center rounded-[30px] border border-dashed border-white/10 bg-[rgba(5,14,18,0.72)] p-8 text-center shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl">
        <div className="max-w-md space-y-3">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-teal-200/70">Cognitive Space</p>
          <h3 className="font-serif text-3xl text-white">No activity selected</h3>
          <p className="text-sm leading-6 text-slate-300">
            Choose an activity cluster from the left to inspect related cognitive states, context, entities, and topics.
          </p>
        </div>
      </section>
    );
  }

  const selectedEntity =
    activity.entities.find((entity) => entity.id === activeEntityId) ??
    null;

  return (
    <section
      className={`rounded-[30px] border border-white/10 bg-[rgba(5,14,18,0.78)] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl transition-opacity duration-300 ${
        isPending ? 'opacity-75' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col gap-4 border-b border-white/8 pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-teal-200/70">Cognitive Space</p>
          <div>
            <h2 className="font-serif text-3xl text-white">{activity.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Neutral reflection view for a single activity cluster. Signals are grouped by how they co-occur, not by what to do next.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[0.68rem] uppercase tracking-[0.22em] text-slate-400">Frequency</p>
            <p className="mt-2 text-xl font-semibold text-white">{activity.frequency}x</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[0.68rem] uppercase tracking-[0.22em] text-slate-400">Entities</p>
            <p className="mt-2 text-xl font-semibold text-white">{activity.entities.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[0.68rem] uppercase tracking-[0.22em] text-slate-400">Topics</p>
            <p className="mt-2 text-xl font-semibold text-white">{activity.topics.length}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {activity.variants.map((variant) => (
          <span key={variant} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
            {variant}
          </span>
        ))}
      </div>

      <div className="mt-6 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Entity filters</p>
            <p className="mt-1 text-sm text-slate-400">Click a chip to highlight only the relations directly connected to that entity.</p>
          </div>

          {selectedEntity ? (
            <button
              type="button"
              onClick={() => onSelectEntity(selectedEntity.id)}
              className="rounded-full border border-teal-300/35 bg-teal-400/12 px-3 py-1 text-xs font-medium text-teal-100"
            >
              Filtering by {selectedEntity.label} · clear
            </button>
          ) : null}
        </div>

        <div className="space-y-4">
          {Object.entries(activity.entitiesByType).map(([type, entities]) => {
            if (entities.length === 0) return null;

            return (
              <div key={type}>
                <p className="mb-2 text-[0.68rem] uppercase tracking-[0.22em] text-slate-400">{TYPE_COPY[type as EntityType]}</p>
                <div className="flex flex-wrap gap-2">
                  {entities.map((entity: InsightEntityViewModel) => {
                    const isActive = entity.id === activeEntityId;

                    return (
                      <button
                        key={entity.id}
                        type="button"
                        onClick={() => onSelectEntity(entity.id)}
                        className={`rounded-full border px-3 py-1.5 text-sm transition-all duration-300 ${
                          isActive
                            ? 'border-teal-300/60 bg-teal-400/15 text-white'
                            : activeEntityId
                              ? 'border-white/7 bg-white/[0.03] text-white/55 hover:text-white'
                              : 'border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/[0.08]'
                        }`}
                      >
                        {entity.label}
                        <span className="ml-2 text-xs text-white/60">{entity.frequency}x</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {(['CONFIDENCE', 'UNCERTAINTY'] as const).map((group) => (
          <section
            key={group}
            className={`rounded-[24px] border p-5 ${COGNITIVE_COPY[group].tone}`}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">{COGNITIVE_COPY[group].title}</h3>
              <span className="text-xs uppercase tracking-[0.18em] text-white/60">
                {activity.cognitiveStates[group].length} states
              </span>
            </div>

            <RelationList
              items={activity.cognitiveStates[group]}
              activeEntityId={activeEntityId}
              emptyLabel="No states captured in this bucket yet."
            />
          </section>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {(['LIKE', 'DISLIKE', 'CONSTRAINT'] as const).map((group) => (
          <section key={group} className={`rounded-[24px] border p-5 ${CONTEXT_COPY[group].tone}`}>
            <div className="mb-4 flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${CONTEXT_COPY[group].dot}`} />
              <h3 className="text-lg font-semibold text-white">{CONTEXT_COPY[group].title}</h3>
            </div>

            <RelationList
              items={activity.context[group]}
              activeEntityId={activeEntityId}
              emptyLabel="No entries in this context bucket yet."
            />
          </section>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">Related entities</h3>
            <span className="text-xs uppercase tracking-[0.18em] text-slate-400">{activity.entities.length} total</span>
          </div>

          <div className="space-y-4">
            {Object.entries(activity.entitiesByType).map(([type, entities]) => {
              if (entities.length === 0) return null;

              return (
                <div key={type}>
                  <p className="mb-2 text-[0.68rem] uppercase tracking-[0.22em] text-slate-400">{TYPE_COPY[type as EntityType]}</p>
                  <div className="flex flex-wrap gap-2">
                    {entities.map((entity: InsightEntityViewModel) => {
                      const isActive = entity.id === activeEntityId;

                      return (
                        <button
                          key={entity.id}
                          type="button"
                          onClick={() => onSelectEntity(entity.id)}
                          className={`rounded-full border px-3 py-1.5 text-sm transition-all duration-300 ${
                            isActive
                              ? 'border-teal-300/60 bg-teal-400/15 text-white'
                              : activeEntityId
                                ? 'border-white/7 bg-white/[0.03] text-white/50'
                                : 'border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/[0.08]'
                          }`}
                        >
                          {entity.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">Related topics</h3>
            <span className="text-xs uppercase tracking-[0.18em] text-slate-400">{activity.topics.length} tags</span>
          </div>

          {activity.topics.length === 0 ? (
            <p className="text-sm leading-6 text-slate-400">No topics linked to this activity cluster yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {activity.topics.map((topic) => {
                const isMatch = matchesEntityFilter(topic.relatedEntityIds, activeEntityId);

                return (
                  <span
                    key={topic.id}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-all duration-300 ${
                      !activeEntityId
                        ? 'border-white/10 bg-white/5 text-slate-200'
                        : isMatch
                          ? 'border-teal-300/40 bg-teal-400/12 text-white'
                          : 'border-white/6 bg-white/[0.03] text-white/45'
                    }`}
                  >
                    {topic.label}
                  </span>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </section>
  );
};
