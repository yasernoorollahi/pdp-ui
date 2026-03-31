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
    accentColor: 'rgba(52,211,153,0.22)',
    borderColor: 'rgba(52,211,153,0.18)',
    dotColor: '#34d399',
    textColor: 'rgba(167,243,208,0.9)',
  },
  UNCERTAINTY: {
    title: 'Uncertainty',
    accentColor: 'rgba(251,191,36,0.14)',
    borderColor: 'rgba(251,191,36,0.18)',
    dotColor: '#fbbf24',
    textColor: 'rgba(253,230,138,0.9)',
  },
} as const;

const CONTEXT_COPY: Record<
  ContextGroup,
  { title: string; accentColor: string; borderColor: string; dotColor: string }
> = {
  LIKE: {
    title: 'Like',
    accentColor: 'rgba(52,211,153,0.10)',
    borderColor: 'rgba(52,211,153,0.16)',
    dotColor: '#34d399',
  },
  DISLIKE: {
    title: 'Dislike',
    accentColor: 'rgba(248,113,113,0.10)',
    borderColor: 'rgba(248,113,113,0.18)',
    dotColor: '#f87171',
  },
  CONSTRAINT: {
    title: 'Constraint',
    accentColor: 'rgba(251,191,36,0.10)',
    borderColor: 'rgba(251,191,36,0.16)',
    dotColor: '#fbbf24',
  },
};

const TYPE_COPY: Record<EntityType, string> = {
  PERSON: 'People',
  LOCATION: 'Locations',
  TOOL: 'Tools',
  PROJECT: 'Projects',
};

const matchesEntityFilter = (
  relatedEntityIds: string[],
  activeEntityId: string | null,
) => {
  if (!activeEntityId) return true;
  return relatedEntityIds.includes(activeEntityId);
};

const cardStyle = {
  borderRadius: '28px',
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'linear-gradient(180deg, rgba(20, 41, 38, 0.72), rgba(12, 27, 28, 0.6))',
  backdropFilter: 'blur(24px)',
  boxShadow:
    '0 20px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
};

const innerCardStyle = {
  borderRadius: '18px',
  border: '1px solid rgba(255,255,255,0.07)',
  background: 'rgba(255,255,255,0.025)',
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
    return (
      <p
        style={{
          fontSize: '0.8rem',
          lineHeight: 1.6,
          color: 'rgba(255,255,255,0.28)',
        }}
      >
        {emptyLabel}
      </p>
    );
  }

  const visibleItems = activeEntityId
    ? items.filter((item) =>
        matchesEntityFilter(item.relatedEntityIds, activeEntityId),
      )
    : items;

  if (activeEntityId && visibleItems.length === 0) {
    return (
      <p
        style={{
          fontSize: '0.8rem',
          lineHeight: 1.6,
          color: 'rgba(255,255,255,0.28)',
        }}
      >
        No direct links for the active entity inside this section.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {items.map((item) => {
        const isMatch =
          !activeEntityId ||
          matchesEntityFilter(item.relatedEntityIds, activeEntityId);
        return (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              borderRadius: '14px',
              border: `1px solid ${isMatch ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}`,
              background: isMatch
                ? 'rgba(255,255,255,0.04)'
                : 'rgba(255,255,255,0.015)',
              padding: '10px 13px',
              opacity: isMatch ? 1 : 0.38,
              transition: 'all 0.25s',
            }}
          >
            <span
              style={{
                fontSize: '0.82rem',
                color: isMatch
                  ? 'rgba(255,255,255,0.82)'
                  : 'rgba(255,255,255,0.3)',
              }}
            >
              {item.label}
            </span>
            <span
              style={{
                borderRadius: '100px',
                border: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(0,0,0,0.25)',
                padding: '2px 8px',
                fontSize: '0.68rem',
                color: 'rgba(255,255,255,0.38)',
              }}
            >
              {item.frequency}×
            </span>
          </div>
        );
      })}
    </div>
  );
};

const EntityChip = ({
  entity,
  activeEntityId,
  onSelectEntity,
  compact = false,
}: {
  entity: InsightEntityViewModel;
  activeEntityId: string | null;
  onSelectEntity: (id: string) => void;
  compact?: boolean;
}) => {
  const isActive = entity.id === activeEntityId;
  const isDimmed = activeEntityId && !isActive;

  return (
    <button
      type="button"
      onClick={() => onSelectEntity(entity.id)}
      style={{
        borderRadius: '100px',
        border: isActive
          ? '1px solid rgba(94,234,212,0.35)'
          : '1px solid rgba(255,255,255,0.08)',
        background: isActive
          ? 'rgba(45,212,191,0.10)'
          : 'rgba(255,255,255,0.04)',
        padding: compact ? '4px 11px' : '5px 13px',
        fontSize: '0.8rem',
        color: isActive ? 'white' : 'rgba(255,255,255,0.55)',
        cursor: 'pointer',
        opacity: isDimmed ? 0.35 : 1,
        transition: 'all 0.2s',
      }}
    >
      {entity.label}
      {!compact && (
        <span
          style={{
            marginLeft: '7px',
            fontSize: '0.68rem',
            color: 'rgba(255,255,255,0.3)',
          }}
        >
          {entity.frequency}×
        </span>
      )}
    </button>
  );
};

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p
    style={{
      fontSize: '0.62rem',
      fontWeight: 600,
      letterSpacing: '0.24em',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.28)',
      marginBottom: '8px',
    }}
  >
    {children}
  </p>
);

export const InsightExplorerDetailPanel = ({
  activity,
  activeEntityId,
  onSelectEntity,
  isPending,
}: InsightExplorerDetailPanelProps) => {
  if (!activity) {
    return (
      <section
        style={{
          ...cardStyle,
          minHeight: '34rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
          borderStyle: 'dashed',
        }}
      >
        <div style={{ maxWidth: '22rem' }}>
          <p
            style={{
              fontSize: '0.62rem',
              fontWeight: 600,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'rgba(94,234,212,0.4)',
            }}
          >
            Cognitive Space
          </p>
          <h3
            style={{
              marginTop: '1rem',
              fontFamily: 'var(--font-display)',
              fontSize: '1.9rem',
              color: 'white',
              fontWeight: 700,
              letterSpacing: '-0.03em',
            }}
          >
            No activity selected
          </h3>
          <p
            style={{
              marginTop: '0.75rem',
              fontSize: '0.82rem',
              lineHeight: 1.7,
              color: 'rgba(255,255,255,0.32)',
            }}
          >
            Choose an activity cluster from the left to inspect related
            cognitive states, context, entities, and topics.
          </p>
        </div>
      </section>
    );
  }

  const selectedEntity =
    activity.entities.find((e) => e.id === activeEntityId) ?? null;

  return (
    <section
      style={{
        ...cardStyle,
        padding: '1.5rem',
        opacity: isPending ? 0.72 : 1,
        transition: 'opacity 0.25s',
      }}
    >
      {/* ── ACTIVITY HEADER ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          marginBottom: '1.25rem',
        }}
      >
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        >
          <p
            style={{
              fontSize: '0.62rem',
              fontWeight: 600,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'rgba(94,234,212,0.45)',
            }}
          >
            Cognitive Space
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2rem',
              color: 'white',
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
            }}
          >
            {activity.title}
          </h2>
          <p
            style={{
              fontSize: '0.8rem',
              lineHeight: 1.65,
              color: 'rgba(255,255,255,0.35)',
              maxWidth: '42rem',
            }}
          >
            Neutral reflection view for a single activity cluster. Signals are
            grouped by co-occurrence, not by what to do next.
          </p>
        </div>

        {/* Stat mini-row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {[
            { label: 'Frequency', value: `${activity.frequency}×` },
            { label: 'Entities', value: activity.entities.length },
            { label: 'Topics', value: activity.topics.length },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                ...innerCardStyle,
                padding: '10px 14px',
                minWidth: '90px',
              }}
            >
              <p
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 600,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.28)',
                }}
              >
                {label}
              </p>
              <p
                style={{
                  marginTop: '6px',
                  fontSize: '1.35rem',
                  fontWeight: 700,
                  color: 'white',
                  letterSpacing: '-0.01em',
                }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Variant pills */}
      {activity.variants.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            marginBottom: '1.25rem',
          }}
        >
          {activity.variants.map((v) => (
            <span
              key={v}
              style={{
                borderRadius: '100px',
                border: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.03)',
                padding: '4px 12px',
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.38)',
              }}
            >
              {v}
            </span>
          ))}
        </div>
      )}

      {/* ── ENTITY FILTER PANEL ── */}
      <div
        style={{ ...innerCardStyle, padding: '1rem', marginBottom: '1.25rem' }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            marginBottom: '0.75rem',
          }}
        >
          <div>
            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'white' }}>
              Entity filters
            </p>
            <p
              style={{
                marginTop: '2px',
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.3)',
              }}
            >
              Click to highlight connected relations
            </p>
          </div>
          {selectedEntity ? (
            <button
              type="button"
              onClick={() => onSelectEntity(selectedEntity.id)}
              style={{
                borderRadius: '100px',
                border: '1px solid rgba(94,234,212,0.3)',
                background: 'rgba(45,212,191,0.08)',
                padding: '4px 12px',
                fontSize: '0.72rem',
                fontWeight: 500,
                color: 'rgba(94,234,212,0.9)',
                cursor: 'pointer',
              }}
            >
              {selectedEntity.label} · clear
            </button>
          ) : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {Object.entries(activity.entitiesByType).map(([type, entities]) => {
            if (entities.length === 0) return null;
            return (
              <div key={type}>
                <SectionLabel>{TYPE_COPY[type as EntityType]}</SectionLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {entities.map((entity: InsightEntityViewModel) => (
                    <EntityChip
                      key={entity.id}
                      entity={entity}
                      activeEntityId={activeEntityId}
                      onSelectEntity={onSelectEntity}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── COGNITIVE STATES ── */}
      <div
        style={{
          display: 'grid',
          gap: '10px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          marginBottom: '1.25rem',
        }}
      >
        {(['CONFIDENCE', 'UNCERTAINTY'] as const).map((group) => {
          const tone = COGNITIVE_COPY[group];
          return (
            <section
              key={group}
              style={{
                borderRadius: '20px',
                border: `1px solid ${tone.borderColor}`,
                background: tone.accentColor,
                padding: '1.1rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '0.75rem',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: tone.dotColor,
                    flexShrink: 0,
                  }}
                />
                <h3
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    color: tone.textColor,
                  }}
                >
                  {tone.title}
                </h3>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '0.65rem',
                    color: 'rgba(255,255,255,0.3)',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                  }}
                >
                  {activity.cognitiveStates[group].length}
                </span>
              </div>
              <RelationList
                items={activity.cognitiveStates[group]}
                activeEntityId={activeEntityId}
                emptyLabel="No states in this bucket yet."
              />
            </section>
          );
        })}
      </div>

      {/* ── CONTEXT GROUPS ── */}
      <div
        style={{
          display: 'grid',
          gap: '10px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          marginBottom: '1.25rem',
        }}
      >
        {(['LIKE', 'DISLIKE', 'CONSTRAINT'] as const).map((group) => {
          const tone = CONTEXT_COPY[group];
          return (
            <section
              key={group}
              style={{
                borderRadius: '20px',
                border: `1px solid ${tone.borderColor}`,
                background: tone.accentColor,
                padding: '1.1rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '0.75rem',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: tone.dotColor,
                    flexShrink: 0,
                  }}
                />
                <h3
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    color: 'white',
                  }}
                >
                  {tone.title}
                </h3>
              </div>
              <RelationList
                items={activity.context[group]}
                activeEntityId={activeEntityId}
                emptyLabel="No entries yet."
              />
            </section>
          );
        })}
      </div>

      {/* ── ENTITIES + TOPICS ── */}
      <div
        style={{
          display: 'grid',
          gap: '10px',
          gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)',
        }}
      >
        {/* Related entities */}
        <section style={{ ...innerCardStyle, padding: '1.1rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}
          >
            <h3
              style={{ fontSize: '0.88rem', fontWeight: 600, color: 'white' }}
            >
              Related entities
            </h3>
            <span
              style={{
                fontSize: '0.65rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.28)',
              }}
            >
              {activity.entities.length} total
            </span>
          </div>
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            {Object.entries(activity.entitiesByType).map(([type, entities]) => {
              if (entities.length === 0) return null;
              return (
                <div key={type}>
                  <SectionLabel>{TYPE_COPY[type as EntityType]}</SectionLabel>
                  <div
                    style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}
                  >
                    {entities.map((entity: InsightEntityViewModel) => (
                      <EntityChip
                        key={entity.id}
                        entity={entity}
                        activeEntityId={activeEntityId}
                        onSelectEntity={onSelectEntity}
                        compact
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Topics */}
        <section style={{ ...innerCardStyle, padding: '1.1rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}
          >
            <h3
              style={{ fontSize: '0.88rem', fontWeight: 600, color: 'white' }}
            >
              Topics
            </h3>
            <span
              style={{
                fontSize: '0.65rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.28)',
              }}
            >
              {activity.topics.length}
            </span>
          </div>

          {activity.topics.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.28)' }}>
              No topics linked yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {activity.topics.map((topic) => {
                const isMatch = matchesEntityFilter(
                  topic.relatedEntityIds,
                  activeEntityId,
                );
                return (
                  <span
                    key={topic.id}
                    style={{
                      borderRadius: '100px',
                      border: `1px solid ${!activeEntityId ? 'rgba(255,255,255,0.08)' : isMatch ? 'rgba(94,234,212,0.25)' : 'rgba(255,255,255,0.04)'}`,
                      background: !activeEntityId
                        ? 'rgba(255,255,255,0.04)'
                        : isMatch
                          ? 'rgba(45,212,191,0.07)'
                          : 'rgba(255,255,255,0.015)',
                      padding: '5px 12px',
                      fontSize: '0.78rem',
                      color: !activeEntityId
                        ? 'rgba(255,255,255,0.55)'
                        : isMatch
                          ? 'rgba(255,255,255,0.85)'
                          : 'rgba(255,255,255,0.22)',
                      opacity: !activeEntityId || isMatch ? 1 : 0.4,
                      transition: 'all 0.25s',
                    }}
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
