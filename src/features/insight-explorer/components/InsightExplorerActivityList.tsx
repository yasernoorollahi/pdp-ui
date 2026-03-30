import type { ActivityGroupViewModel } from '../types';

type InsightExplorerActivityListProps = {
  activities: ActivityGroupViewModel[];
  activeActivityId: string | null;
  onSelectActivity: (activityId: string) => void;
  isPending: boolean;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));

export const InsightExplorerActivityList = ({
  activities,
  activeActivityId,
  onSelectActivity,
  isPending,
}: InsightExplorerActivityListProps) => (
  <aside className="rounded-[30px] border border-white/10 bg-[rgba(5,14,18,0.78)] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl">
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-teal-200/70">Activities</p>
        <h3 className="mt-2 font-serif text-2xl text-white">Entry point</h3>
      </div>
      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
        {activities.length} groups
      </span>
    </div>

    <p className="mb-4 text-sm leading-6 text-slate-300">
      Similar observations are clustered first, then expanded into cognitive states, context, entities, and topics.
    </p>

    <div className={`space-y-3 transition-opacity duration-300 ${isPending ? 'opacity-70' : 'opacity-100'}`}>
      {activities.map((activity) => {
        const isActive = activity.id === activeActivityId;

        return (
          <button
            key={activity.id}
            type="button"
            onClick={() => onSelectActivity(activity.id)}
            className={`w-full rounded-[24px] border p-4 text-left transition-all duration-300 ${
              isActive
                ? 'border-teal-300/60 bg-teal-400/12 shadow-[0_0_0_1px_rgba(94,234,212,0.15)]'
                : 'border-white/8 bg-white/[0.035] hover:border-white/15 hover:bg-white/[0.06]'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-white">{activity.title}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {activity.variants.slice(0, 2).join(' · ')}
                </p>
              </div>

              <div className="shrink-0 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-xs font-medium text-white/80">
                {activity.frequency}x
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {activity.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>{activity.entities.length} linked entities</span>
              <span>Last seen {formatDate(activity.lastObservedAt)}</span>
            </div>
          </button>
        );
      })}
    </div>
  </aside>
);
