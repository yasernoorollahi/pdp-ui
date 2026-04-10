import { useEffect, useMemo, useState } from 'react';
import { insightExplorerService } from '../../../services/insightExplorer.service';
import type {
  ContextGroup,
  EntityType,
  InsightExplorerNormalizedData,
  InsightExplorerResponse,
} from '../../insight-explorer/types';
import styles from './UserEntitiesPage.module.css';

type LoadState = {
  loading: boolean;
  error: string | null;
  response: InsightExplorerResponse | null;
};

type EntitySignal = {
  label: string;
  count: number;
};

type EntityCardViewModel = {
  id: string;
  rawId: string;
  label: string;
  type: EntityType;
  frequency: number;
  lastSeenAt: string;
  activityCount: number;
  activities: string[];
  relatedTopics: EntitySignal[];
  relatedCognitiveStates: EntitySignal[];
  relatedContexts: Record<ContextGroup, EntitySignal[]>;
};

type EntityTypeSection = {
  type: EntityType;
  label: string;
  tone: string;
  helper: string;
  entities: EntityCardViewModel[];
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

const ENTITY_META: Record<EntityType, { label: string; tone: string; helper: string; icon: string }> = {
  PERSON: {
    label: 'People',
    tone: styles.personTone,
    helper: 'People who keep showing up in the user’s conversations.',
    icon: 'P',
  },
  LOCATION: {
    label: 'Places',
    tone: styles.locationTone,
    helper: 'Spaces and environments the user keeps referring to.',
    icon: 'L',
  },
  TOOL: {
    label: 'Tools',
    tone: styles.toolTone,
    helper: 'Apps, products, and systems attached to the user’s flow.',
    icon: 'T',
  },
  PROJECT: {
    label: 'Projects',
    tone: styles.projectTone,
    helper: 'Ongoing workstreams, goals, and repeated missions.',
    icon: 'J',
  },
};

const CONTEXT_META: Record<ContextGroup, { label: string; className: string }> = {
  LIKE: { label: 'Likes', className: styles.likePill },
  DISLIKE: { label: 'Dislikes', className: styles.dislikePill },
  CONSTRAINT: { label: 'Constraints', className: styles.constraintPill },
};

const formatError = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  return 'Unexpected error while loading entity data.';
};

const formatDate = (value: string) => {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(timestamp);
};

const sortSignals = (map: Map<string, number>) =>
  Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, 4);

const addCount = (store: Map<string, number>, value: string) => {
  const normalized = value.trim();
  if (!normalized) return;
  store.set(normalized, (store.get(normalized) ?? 0) + 1);
};

const buildEntitySections = (dataset: InsightExplorerNormalizedData): EntityTypeSection[] => {
  const activitiesById = new Map(dataset.user_activities.map((activity) => [activity.id, activity]));
  const allEntityRows = [
    ...dataset.user_entities.map((entity) => ({
      id: entity.canonical_id ?? entity.id,
      label: entity.label,
      type: entity.entity_type,
      activityId: entity.activity_id,
    })),
    ...dataset.user_tools.map((tool) => ({
      id: tool.canonical_id ?? tool.id,
      label: tool.name,
      type: 'TOOL' as const,
      activityId: tool.activity_id,
    })),
    ...dataset.user_projects.map((project) => ({
      id: project.canonical_id ?? project.id,
      label: project.name,
      type: 'PROJECT' as const,
      activityId: project.activity_id,
    })),
  ];

  const entityMap = new Map<string, EntityCardViewModel>();
  const seenMentions = new Set<string>();

  allEntityRows.forEach((row) => {
    const mentionKey = `${row.type}:${row.id}:${row.activityId}:${row.label.toLowerCase()}`;
    if (seenMentions.has(mentionKey)) return;
    seenMentions.add(mentionKey);

    const key = `${row.type}:${row.id}:${row.label.toLowerCase()}`;
    const activity = activitiesById.get(row.activityId);
    const fallbackDate = activity?.occurred_at ?? new Date().toISOString();
    const current = entityMap.get(key) ?? {
      id: key,
      rawId: row.id,
      label: row.label,
      type: row.type,
      frequency: 0,
      lastSeenAt: fallbackDate,
      activityCount: 0,
      activities: [],
      relatedTopics: [],
      relatedCognitiveStates: [],
      relatedContexts: {
        LIKE: [],
        DISLIKE: [],
        CONSTRAINT: [],
      },
    };

    current.frequency += 1;
    if (!current.activities.includes(row.activityId)) {
      current.activities.push(row.activityId);
      current.activityCount += 1;
    }
    if (new Date(fallbackDate).getTime() > new Date(current.lastSeenAt).getTime()) {
      current.lastSeenAt = fallbackDate;
    }

    entityMap.set(key, current);
  });

  entityMap.forEach((entity) => {
    const topicCounts = new Map<string, number>();
    const cognitiveCounts = new Map<string, number>();
    const contextCounts: Record<ContextGroup, Map<string, number>> = {
      LIKE: new Map<string, number>(),
      DISLIKE: new Map<string, number>(),
      CONSTRAINT: new Map<string, number>(),
    };

    dataset.user_topics.forEach((topic) => {
      if (!topic.related_entity_ids?.includes(entity.rawId)) return;
      addCount(topicCounts, topic.label);
    });

    dataset.user_cognitive_states.forEach((state) => {
      if (!state.related_entity_ids?.includes(entity.rawId)) return;
      addCount(cognitiveCounts, state.phrase);
    });

    dataset.user_context.forEach((context) => {
      if (!context.related_entity_ids?.includes(entity.rawId)) return;
      addCount(contextCounts[context.type], context.phrase);
    });

    entity.relatedTopics = sortSignals(topicCounts);
    entity.relatedCognitiveStates = sortSignals(cognitiveCounts);
    entity.relatedContexts = {
      LIKE: sortSignals(contextCounts.LIKE),
      DISLIKE: sortSignals(contextCounts.DISLIKE),
      CONSTRAINT: sortSignals(contextCounts.CONSTRAINT),
    };
    entity.activities = entity.activities
      .map((activityId) => activitiesById.get(activityId)?.label)
      .filter((label): label is string => Boolean(label))
      .slice(0, 4);
  });

  return (Object.keys(ENTITY_META) as EntityType[])
    .map((type) => {
      const entities = Array.from(entityMap.values())
        .filter((entity) => entity.type === type)
        .sort((left, right) => right.frequency - left.frequency || left.label.localeCompare(right.label));

      return {
        type,
        label: ENTITY_META[type].label,
        tone: ENTITY_META[type].tone,
        helper: ENTITY_META[type].helper,
        entities,
      };
    })
    .filter((section) => section.entities.length > 0);
};

const EntitySignalGroup = ({ title, items, pillClassName }: { title: string; items: EntitySignal[]; pillClassName?: string }) => {
  if (items.length === 0) return null;

  return (
    <div className={styles.signalGroup}>
      <p className={styles.signalLabel}>{title}</p>
      <div className={styles.signalWrap}>
        {items.map((item) => (
          <span key={`${title}-${item.label}`} className={`${styles.signalPill} ${pillClassName ?? ''}`}>
            {item.label}
            <strong>{item.count}</strong>
          </span>
        ))}
      </div>
    </div>
  );
};

export const UserEntitiesPage = () => {
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
  const sections = useMemo(() => buildEntitySections(dataset), [dataset]);
  const totalEntities = useMemo(
    () => sections.reduce((sum, section) => sum + section.entities.length, 0),
    [sections],
  );
  const totalMentions = useMemo(
    () => sections.reduce((sum, section) => sum + section.entities.reduce((inner, entity) => inner + entity.frequency, 0), 0),
    [sections],
  );

  if (state.loading) {
    return (
      <div className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.loadingBlock} />
          <div className={styles.loadingLine} />
          <div className={styles.loadingLineShort} />
        </section>
      </div>
    );
  }

  if (state.error && !state.response) {
    return (
      <div className={styles.page}>
        <section className={styles.emptyState}>
          <h2>We couldn&apos;t load user entities.</h2>
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
          <p className={styles.kicker}>Entity Memory Surface</p>
          <h2>What the system has learned from the user&apos;s conversations.</h2>
          <p className={styles.heroText}>
            This page turns extracted entities into a clean surface the user can browse by type, revisit by recency,
            and inspect through the signals attached to each entity.
          </p>
        </div>
        <div className={styles.heroStats}>
          <div className={styles.statCard}>
            <span>Total entities</span>
            <strong>{totalEntities}</strong>
          </div>
          <div className={styles.statCard}>
            <span>Total mentions</span>
            <strong>{totalMentions}</strong>
          </div>
          <div className={styles.statCard}>
            <span>Data source</span>
            <strong>{state.response?.source === 'mock' ? 'Snapshot' : 'Live API'}</strong>
          </div>
        </div>
      </section>

      {state.response?.message ? <p className={styles.banner}>{state.response.message}</p> : null}

      {sections.length === 0 ? (
        <section className={styles.emptyState}>
          <h2>No entities yet</h2>
          <p>Once chat extraction starts producing people, places, tools, or projects, they&apos;ll appear here.</p>
        </section>
      ) : (
        <div className={styles.sections}>
          {sections.map((section) => (
            <section key={section.type} className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <div className={`${styles.sectionBadge} ${section.tone}`}>
                    <span>{ENTITY_META[section.type].icon}</span>
                    {section.label}
                  </div>
                  <h3>{section.label}</h3>
                  <p>{section.helper}</p>
                </div>
                <div className={styles.sectionCount}>{section.entities.length} tracked</div>
              </div>

              <div className={styles.cardGrid}>
                {section.entities.map((entity) => (
                  <article key={entity.id} className={styles.entityCard}>
                    <div className={styles.entityHeader}>
                      <div>
                        <p className={styles.entityName}>{entity.label}</p>
                        <p className={styles.entityMeta}>
                          Mentioned {entity.frequency} times across {entity.activityCount} activities
                        </p>
                      </div>
                      <div className={`${styles.entityTypeChip} ${section.tone}`}>{section.type}</div>
                    </div>

                    <div className={styles.metricsRow}>
                      <div className={styles.metricBox}>
                        <span>Last seen</span>
                        <strong>{formatDate(entity.lastSeenAt)}</strong>
                      </div>
                      <div className={styles.metricBox}>
                        <span>Recent activities</span>
                        <strong>{entity.activities.length}</strong>
                      </div>
                    </div>

                    {entity.activities.length > 0 ? (
                      <div className={styles.activityWrap}>
                        {entity.activities.map((activity) => (
                          <span key={`${entity.id}-${activity}`} className={styles.activityPill}>
                            {activity}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <EntitySignalGroup title="Topics" items={entity.relatedTopics} />
                    <EntitySignalGroup title="Cognitive states" items={entity.relatedCognitiveStates} />
                    {(Object.keys(CONTEXT_META) as ContextGroup[]).map((group) => (
                      <EntitySignalGroup
                        key={`${entity.id}-${group}`}
                        title={CONTEXT_META[group].label}
                        items={entity.relatedContexts[group]}
                        pillClassName={CONTEXT_META[group].className}
                      />
                    ))}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
