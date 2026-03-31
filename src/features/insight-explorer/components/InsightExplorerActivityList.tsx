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
  <aside
    style={{
      borderRadius: '28px',
      border: '1px solid rgba(255,255,255,0.08)',
      background: 'linear-gradient(180deg, rgba(20, 41, 38, 0.72), rgba(12, 27, 28, 0.6))',
      backdropFilter: 'blur(24px)',
      boxShadow:
        '0 20px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
      padding: '1.25rem',
    }}
  >
    {/* Header */}
    <div
      style={{
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '1rem',
      }}
    >
      <div>
        <p
          style={{
            fontSize: '0.62rem',
            fontWeight: 600,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: 'rgba(94,234,212,0.45)',
          }}
        >
          Activities
        </p>
        <h3
          style={{
            marginTop: '0.4rem',
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            color: 'white',
            fontWeight: 700,
            letterSpacing: '-0.03em',
          }}
        >
          Entry point
        </h3>
      </div>
      <span
        style={{
          borderRadius: '100px',
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.04)',
          padding: '3px 10px',
          fontSize: '0.72rem',
          color: 'rgba(255,255,255,0.4)',
          whiteSpace: 'nowrap',
          alignSelf: 'flex-start',
          marginTop: '2px',
        }}
      >
        {activities.length} groups
      </span>
    </div>

    <p
      style={{
        marginBottom: '1.1rem',
        fontSize: '0.82rem',
        lineHeight: 1.7,
        color: 'rgba(255,255,255,0.35)',
      }}
    >
      Similar observations are clustered first, then expanded into cognitive
      states, context, entities, and topics.
    </p>

    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        opacity: isPending ? 0.6 : 1,
        transition: 'opacity 0.25s',
      }}
    >
      {activities.map((activity) => {
        const isActive = activity.id === activeActivityId;

        return (
          <button
            key={activity.id}
            type="button"
            onClick={() => onSelectActivity(activity.id)}
            style={{
              width: '100%',
              borderRadius: '20px',
              border: isActive
                ? '1px solid rgba(94,234,212,0.28)'
                : '1px solid rgba(255,255,255,0.06)',
              background: isActive
                ? 'rgba(45,212,191,0.06)'
                : 'rgba(255,255,255,0.025)',
              padding: '14px 16px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isActive
                ? '0 0 0 1px rgba(94,234,212,0.1), 0 8px 24px rgba(45,212,191,0.08)'
                : 'none',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '10px',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: 'white',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {activity.title}
                </p>
                <p
                  style={{
                    marginTop: '3px',
                    fontSize: '0.78rem',
                    color: 'rgba(255,255,255,0.35)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {activity.variants.slice(0, 2).join(' · ')}
                </p>
              </div>

              <span
                style={{
                  flexShrink: 0,
                  borderRadius: '100px',
                  border: '1px solid rgba(255,255,255,0.09)',
                  background: 'rgba(0,0,0,0.25)',
                  padding: '2px 9px',
                  fontSize: '0.72rem',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.55)',
                }}
              >
                {activity.frequency}×
              </span>
            </div>

            {activity.tags.length > 0 && (
              <div
                style={{
                  marginTop: '12px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                }}
              >
                {activity.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      borderRadius: '100px',
                      border: '1px solid rgba(255,255,255,0.07)',
                      background: 'rgba(255,255,255,0.04)',
                      padding: '2px 9px',
                      fontSize: '0.65rem',
                      fontWeight: 500,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.38)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div
              style={{
                marginTop: '12px',
                paddingTop: '10px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.72rem',
                color: 'rgba(255,255,255,0.28)',
              }}
            >
              <span>{activity.entities.length} entities</span>
              <span>{formatDate(activity.lastObservedAt)}</span>
            </div>
          </button>
        );
      })}
    </div>
  </aside>
);
