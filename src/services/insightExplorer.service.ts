import api from '../api/axios';
import { mockInsightExplorerData } from '../features/insight-explorer/data/mockInsightExplorerData';
import type {
  CognitiveGroup,
  ContextGroup,
  EntityType,
  InsightExplorerNormalizedData,
  InsightExplorerResponse,
  UserActivityRecord,
  UserCognitiveStateRecord,
  UserContextRecord,
  UserEntityRecord,
  UserIntentRecord,
  UserProjectRecord,
  UserToneStateRecord,
  UserTopicRecord,
  UserToolRecord,
} from '../features/insight-explorer/types';

const INSIGHT_EXPLORER_ENDPOINT = import.meta.env.VITE_INSIGHT_EXPLORER_ENDPOINT ?? '/insights/explorer';

const asObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const asObjectArray = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.map(asObject).filter((item): item is Record<string, unknown> => item !== null);
};

const pick = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    if (key in record) return record[key];
  }
  return undefined;
};

const asString = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const asStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.map(asString).filter((item): item is string => item !== null);
};

const asNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
};

const asEnum = <T extends string>(value: unknown, allowed: readonly T[], fallback: T) => {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback;
};

const normalizeActivity = (record: Record<string, unknown>, index: number): UserActivityRecord => ({
  id: asString(pick(record, ['id', 'activity_id', 'activityId'])) ?? `activity-${index + 1}`,
  label: asString(pick(record, ['label', 'activity', 'name', 'title'])) ?? `Activity ${index + 1}`,
  occurred_at:
    asString(pick(record, ['occurred_at', 'occurredAt', 'timestamp', 'created_at', 'createdAt'])) ??
    new Date().toISOString(),
  group_hint: asString(pick(record, ['group_hint', 'groupHint', 'group_key', 'groupKey'])),
  tags: asStringArray(pick(record, ['tags', 'labels'])),
});

const normalizeCognitiveState = (record: Record<string, unknown>, index: number): UserCognitiveStateRecord => ({
  id: asString(pick(record, ['id', 'state_id', 'stateId'])) ?? `cognitive-${index + 1}`,
  activity_id: asString(pick(record, ['activity_id', 'activityId'])) ?? '',
  group: asEnum<CognitiveGroup>(pick(record, ['group', 'bucket', 'polarity']), ['CONFIDENCE', 'UNCERTAINTY'], 'CONFIDENCE'),
  phrase: asString(pick(record, ['phrase', 'label', 'value', 'state'])) ?? 'Unlabeled state',
  related_entity_ids: asStringArray(pick(record, ['related_entity_ids', 'relatedEntityIds', 'entity_ids', 'entityIds'])),
});

const normalizeContext = (record: Record<string, unknown>, index: number): UserContextRecord => ({
  id: asString(pick(record, ['id', 'context_id', 'contextId'])) ?? `context-${index + 1}`,
  activity_id: asString(pick(record, ['activity_id', 'activityId'])) ?? '',
  type: asEnum<ContextGroup>(pick(record, ['type', 'context_type', 'contextType']), ['LIKE', 'DISLIKE', 'CONSTRAINT'], 'LIKE'),
  phrase: asString(pick(record, ['phrase', 'label', 'value', 'context'])) ?? 'Unlabeled context',
  related_entity_ids: asStringArray(pick(record, ['related_entity_ids', 'relatedEntityIds', 'entity_ids', 'entityIds'])),
});

const normalizeEntity = (record: Record<string, unknown>, index: number): UserEntityRecord => ({
  id: asString(pick(record, ['id', 'entity_id', 'entityId'])) ?? `entity-${index + 1}`,
  activity_id: asString(pick(record, ['activity_id', 'activityId'])) ?? '',
  entity_type: asEnum<Extract<EntityType, 'PERSON' | 'LOCATION'>>(
    pick(record, ['entity_type', 'entityType', 'type']),
    ['PERSON', 'LOCATION'],
    'PERSON',
  ),
  label: asString(pick(record, ['label', 'name', 'value'])) ?? 'Unknown entity',
  canonical_id: asString(pick(record, ['canonical_id', 'canonicalId'])),
});

const normalizeIntent = (record: Record<string, unknown>, index: number): UserIntentRecord => ({
  id: asString(pick(record, ['id', 'intent_id', 'intentId'])) ?? `intent-${index + 1}`,
  activity_id: asString(pick(record, ['activity_id', 'activityId'])) ?? '',
  label: asString(pick(record, ['label', 'name', 'value'])) ?? 'Intent',
  tag: asString(pick(record, ['tag', 'category'])) ?? 'general',
});

const normalizeProject = (record: Record<string, unknown>, index: number): UserProjectRecord => ({
  id: asString(pick(record, ['id', 'project_id', 'projectId'])) ?? `project-${index + 1}`,
  activity_id: asString(pick(record, ['activity_id', 'activityId'])) ?? '',
  name: asString(pick(record, ['name', 'label', 'title'])) ?? 'Project',
  canonical_id: asString(pick(record, ['canonical_id', 'canonicalId'])),
});

const normalizeToneState = (record: Record<string, unknown>, index: number): UserToneStateRecord => ({
  id: asString(pick(record, ['id', 'tone_id', 'toneId'])) ?? `tone-${index + 1}`,
  activity_id: asString(pick(record, ['activity_id', 'activityId'])) ?? '',
  tone: asString(pick(record, ['tone', 'label', 'value'])) ?? 'neutral',
  intensity: asNumber(pick(record, ['intensity', 'score'])),
});

const normalizeTopic = (record: Record<string, unknown>, index: number): UserTopicRecord => ({
  id: asString(pick(record, ['id', 'topic_id', 'topicId'])) ?? `topic-${index + 1}`,
  activity_id: asString(pick(record, ['activity_id', 'activityId'])) ?? '',
  label: asString(pick(record, ['label', 'name', 'topic'])) ?? 'Topic',
  related_entity_ids: asStringArray(pick(record, ['related_entity_ids', 'relatedEntityIds', 'entity_ids', 'entityIds'])),
});

const normalizeTool = (record: Record<string, unknown>, index: number): UserToolRecord => ({
  id: asString(pick(record, ['id', 'tool_id', 'toolId'])) ?? `tool-${index + 1}`,
  activity_id: asString(pick(record, ['activity_id', 'activityId'])) ?? '',
  name: asString(pick(record, ['name', 'label', 'value'])) ?? 'Tool',
  canonical_id: asString(pick(record, ['canonical_id', 'canonicalId'])),
});

const pickArray = (payload: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const candidate = payload[key];
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
};

const normalizeInsightExplorerData = (payload: unknown): InsightExplorerNormalizedData => {
  const record = asObject(payload) ?? {};

  return {
    user_activities: asObjectArray(pickArray(record, ['user_activities', 'userActivities', 'activities'])).map(normalizeActivity),
    user_cognitive_states: asObjectArray(
      pickArray(record, ['user_cognitive_states', 'userCognitiveStates', 'cognitiveStates']),
    ).map(normalizeCognitiveState),
    user_context: asObjectArray(pickArray(record, ['user_context', 'userContext', 'context'])).map(normalizeContext),
    user_entities: asObjectArray(pickArray(record, ['user_entities', 'userEntities', 'entities'])).map(normalizeEntity),
    user_intents: asObjectArray(pickArray(record, ['user_intents', 'userIntents', 'intents'])).map(normalizeIntent),
    user_projects: asObjectArray(pickArray(record, ['user_projects', 'userProjects', 'projects'])).map(normalizeProject),
    user_tone_states: asObjectArray(pickArray(record, ['user_tone_states', 'userToneStates', 'toneStates'])).map(normalizeToneState),
    user_topics: asObjectArray(pickArray(record, ['user_topics', 'userTopics', 'topics'])).map(normalizeTopic),
    user_tools: asObjectArray(pickArray(record, ['user_tools', 'userTools', 'tools'])).map(normalizeTool),
  };
};

export const insightExplorerService = {
  async getExplorerData(): Promise<InsightExplorerResponse> {
    try {
      const response = await api.get(INSIGHT_EXPLORER_ENDPOINT);
      return {
        data: normalizeInsightExplorerData(response.data),
        source: 'live',
        endpoint: INSIGHT_EXPLORER_ENDPOINT,
      };
    } catch {
      return {
        data: mockInsightExplorerData,
        source: 'mock',
        endpoint: INSIGHT_EXPLORER_ENDPOINT,
        message: `Using a local snapshot while ${INSIGHT_EXPLORER_ENDPOINT} is unavailable.`,
      };
    }
  },
};
