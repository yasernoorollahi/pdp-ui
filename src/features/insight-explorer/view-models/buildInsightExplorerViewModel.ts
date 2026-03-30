import type {
  ActivityGroupViewModel,
  CognitiveGroup,
  ContextGroup,
  EntityType,
  InsightEntityViewModel,
  InsightExplorerNormalizedData,
  InsightExplorerViewModel,
  InsightRelationItemViewModel,
} from '../types';

type EntityRecord = {
  id: string;
  activityId: string;
  label: string;
  type: EntityType;
};

type MutableRelation = {
  id: string;
  label: string;
  frequency: number;
  activityIds: Set<string>;
  relatedEntityIds: Set<string>;
};

type MutableEntity = {
  id: string;
  label: string;
  type: EntityType;
  frequency: number;
  activityIds: Set<string>;
};

type MutableGroup = {
  id: string;
  title: string;
  frequency: number;
  lastObservedAt: string;
  variants: Set<string>;
  tagCounts: Map<string, number>;
  cognitiveStates: Map<CognitiveGroup, Map<string, MutableRelation>>;
  context: Map<ContextGroup, Map<string, MutableRelation>>;
  topics: Map<string, MutableRelation>;
  entities: Map<string, MutableEntity>;
};

const ACTION_ALIASES: Array<[RegExp, string]> = [
  [/\b(talked with|talk with|spoke with|spoke to|called|calling)\b/g, 'call'],
  [/\b(debugged|debugging|troubleshooting|investigating)\b/g, 'debug'],
  [/\b(reviewed|review|planning|planned)\b/g, 'plan'],
  [/\b(worked out|gym session|exercise|training)\b/g, 'workout'],
];

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'my',
  'with',
  'on',
  'at',
  'in',
  'during',
  'for',
  'after',
  'before',
  'into',
  'to',
]);

const sortByFrequencyThenLabel = <T extends { frequency: number; label: string }>(items: T[]) =>
  [...items].sort((left, right) => right.frequency - left.frequency || left.label.localeCompare(right.label));

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const sentenceCase = (value: string) => (value.length > 0 ? `${value.slice(0, 1).toUpperCase()}${value.slice(1)}` : value);

const slugify = (value: string) => normalizeText(value).replace(/\s+/g, '-');

const entityIdFromTypeAndLabel = (type: EntityType, label: string) => `${type.toLowerCase()}-${slugify(label)}`;

const toEntityRecords = (data: InsightExplorerNormalizedData): EntityRecord[] => [
  ...data.user_entities.map((entity) => ({
    id: entity.canonical_id ?? entityIdFromTypeAndLabel(entity.entity_type, entity.label),
    activityId: entity.activity_id,
    label: entity.label,
    type: entity.entity_type,
  })),
  ...data.user_tools.map((tool) => ({
    id: tool.canonical_id ?? entityIdFromTypeAndLabel('TOOL', tool.name),
    activityId: tool.activity_id,
    label: tool.name,
    type: 'TOOL' as const,
  })),
  ...data.user_projects.map((project) => ({
    id: project.canonical_id ?? entityIdFromTypeAndLabel('PROJECT', project.name),
    activityId: project.activity_id,
    label: project.name,
    type: 'PROJECT' as const,
  })),
];

const inferGroupKey = (label: string) => {
  let normalized = normalizeText(label);

  ACTION_ALIASES.forEach(([pattern, replacement]) => {
    normalized = normalized.replace(pattern, replacement);
  });

  const tokens = normalized
    .split(' ')
    .filter((token) => token.length > 0 && !STOP_WORDS.has(token))
    .slice(0, 5);

  return tokens.join(' ');
};

const createEmptyRelationMap = <T extends string>(keys: readonly T[]) =>
  new Map<T, Map<string, MutableRelation>>(keys.map((key) => [key, new Map<string, MutableRelation>()]));

const upsertRelation = (
  store: Map<string, MutableRelation>,
  label: string,
  activityId: string,
  relatedEntityIds: string[],
) => {
  const key = normalizeText(label);
  const current = store.get(key);

  if (current) {
    current.frequency += 1;
    current.activityIds.add(activityId);
    relatedEntityIds.forEach((entityId) => current.relatedEntityIds.add(entityId));
    return;
  }

  store.set(key, {
    id: key,
    label,
    frequency: 1,
    activityIds: new Set([activityId]),
    relatedEntityIds: new Set(relatedEntityIds),
  });
};

const upsertEntity = (store: Map<string, MutableEntity>, entity: EntityRecord, activityId: string) => {
  const current = store.get(entity.id);

  if (current) {
    current.frequency += 1;
    current.activityIds.add(activityId);
    return;
  }

  store.set(entity.id, {
    id: entity.id,
    label: entity.label,
    type: entity.type,
    frequency: 1,
    activityIds: new Set([activityId]),
  });
};

const toRelationArray = (store: Map<string, MutableRelation>): InsightRelationItemViewModel[] =>
  sortByFrequencyThenLabel(
    Array.from(store.values()).map((item) => ({
      id: item.id,
      label: item.label,
      frequency: item.frequency,
      activityIds: Array.from(item.activityIds),
      relatedEntityIds: Array.from(item.relatedEntityIds),
    })),
  );

const toEntityArray = (store: Map<string, MutableEntity>): InsightEntityViewModel[] =>
  sortByFrequencyThenLabel(
    Array.from(store.values()).map((entity) => ({
      id: entity.id,
      label: entity.label,
      type: entity.type,
      frequency: entity.frequency,
      activityIds: Array.from(entity.activityIds),
    })),
  );

const toEntityGroups = (entities: InsightEntityViewModel[]) => ({
  PERSON: entities.filter((entity) => entity.type === 'PERSON'),
  LOCATION: entities.filter((entity) => entity.type === 'LOCATION'),
  TOOL: entities.filter((entity) => entity.type === 'TOOL'),
  PROJECT: entities.filter((entity) => entity.type === 'PROJECT'),
});

const buildGroupTitle = (label: string) => sentenceCase(label);

export const buildInsightExplorerViewModel = (data: InsightExplorerNormalizedData): InsightExplorerViewModel => {
  const entities = toEntityRecords(data);
  const entitiesByActivityId = new Map<string, EntityRecord[]>();
  const cognitiveByActivityId = new Map<string, typeof data.user_cognitive_states>();
  const contextByActivityId = new Map<string, typeof data.user_context>();
  const topicsByActivityId = new Map<string, typeof data.user_topics>();
  const intentsByActivityId = new Map<string, typeof data.user_intents>();

  entities.forEach((entity) => {
    const current = entitiesByActivityId.get(entity.activityId) ?? [];
    current.push(entity);
    entitiesByActivityId.set(entity.activityId, current);
  });

  data.user_cognitive_states.forEach((item) => {
    const current = cognitiveByActivityId.get(item.activity_id) ?? [];
    current.push(item);
    cognitiveByActivityId.set(item.activity_id, current);
  });

  data.user_context.forEach((item) => {
    const current = contextByActivityId.get(item.activity_id) ?? [];
    current.push(item);
    contextByActivityId.set(item.activity_id, current);
  });

  data.user_topics.forEach((item) => {
    const current = topicsByActivityId.get(item.activity_id) ?? [];
    current.push(item);
    topicsByActivityId.set(item.activity_id, current);
  });

  data.user_intents.forEach((item) => {
    const current = intentsByActivityId.get(item.activity_id) ?? [];
    current.push(item);
    intentsByActivityId.set(item.activity_id, current);
  });

  const groups = new Map<string, MutableGroup>();

  data.user_activities.forEach((activity) => {
    const groupKey = activity.group_hint?.trim() || inferGroupKey(activity.label) || activity.id;
    const normalizedGroupKey = normalizeText(groupKey);
    const current = groups.get(normalizedGroupKey) ?? {
      id: `activity-group-${slugify(normalizedGroupKey)}`,
      title: buildGroupTitle(groupKey),
      frequency: 0,
      lastObservedAt: activity.occurred_at,
      variants: new Set<string>(),
      tagCounts: new Map<string, number>(),
      cognitiveStates: createEmptyRelationMap(['CONFIDENCE', 'UNCERTAINTY']),
      context: createEmptyRelationMap(['LIKE', 'DISLIKE', 'CONSTRAINT']),
      topics: new Map<string, MutableRelation>(),
      entities: new Map<string, MutableEntity>(),
    };

    current.frequency += 1;
    current.lastObservedAt = new Date(activity.occurred_at) > new Date(current.lastObservedAt) ? activity.occurred_at : current.lastObservedAt;
    current.variants.add(activity.label);

    [...(activity.tags ?? []), ...(intentsByActivityId.get(activity.id)?.map((intent) => intent.tag) ?? [])].forEach((tag) => {
      const normalizedTag = normalizeText(tag);
      if (!normalizedTag) return;
      current.tagCounts.set(normalizedTag, (current.tagCounts.get(normalizedTag) ?? 0) + 1);
    });

    (entitiesByActivityId.get(activity.id) ?? []).forEach((entity) => upsertEntity(current.entities, entity, activity.id));
    (cognitiveByActivityId.get(activity.id) ?? []).forEach((item) =>
      upsertRelation(current.cognitiveStates.get(item.group) ?? new Map<string, MutableRelation>(), item.phrase, activity.id, item.related_entity_ids ?? []),
    );
    (contextByActivityId.get(activity.id) ?? []).forEach((item) =>
      upsertRelation(current.context.get(item.type) ?? new Map<string, MutableRelation>(), item.phrase, activity.id, item.related_entity_ids ?? []),
    );
    (topicsByActivityId.get(activity.id) ?? []).forEach((item) =>
      upsertRelation(current.topics, item.label, activity.id, item.related_entity_ids ?? []),
    );

    groups.set(normalizedGroupKey, current);
  });

  const activityGroups: ActivityGroupViewModel[] = Array.from(groups.values())
    .map((group) => {
      const entitiesForGroup = toEntityArray(group.entities);

      return {
        id: group.id,
        title: group.title,
        frequency: group.frequency,
        tags: Array.from(group.tagCounts.entries())
          .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
          .map(([tag]) => tag)
          .slice(0, 4),
        lastObservedAt: group.lastObservedAt,
        variants: Array.from(group.variants).sort((left, right) => left.localeCompare(right)),
        cognitiveStates: {
          CONFIDENCE: toRelationArray(group.cognitiveStates.get('CONFIDENCE') ?? new Map()),
          UNCERTAINTY: toRelationArray(group.cognitiveStates.get('UNCERTAINTY') ?? new Map()),
        },
        context: {
          LIKE: toRelationArray(group.context.get('LIKE') ?? new Map()),
          DISLIKE: toRelationArray(group.context.get('DISLIKE') ?? new Map()),
          CONSTRAINT: toRelationArray(group.context.get('CONSTRAINT') ?? new Map()),
        },
        entitiesByType: toEntityGroups(entitiesForGroup),
        entities: entitiesForGroup,
        topics: toRelationArray(group.topics),
      };
    })
    .sort(
      (left, right) =>
        right.frequency - left.frequency ||
        new Date(right.lastObservedAt).getTime() - new Date(left.lastObservedAt).getTime() ||
        left.title.localeCompare(right.title),
    );

  return {
    activityGroups,
    summary: {
      observationCount: data.user_activities.length,
      groupCount: activityGroups.length,
      entityCount: new Set(entities.map((entity) => entity.id)).size,
      topicCount: new Set(data.user_topics.map((topic) => normalizeText(topic.label))).size,
    },
  };
};
