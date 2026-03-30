export const COGNITIVE_GROUPS = ['CONFIDENCE', 'UNCERTAINTY'] as const;
export const CONTEXT_GROUPS = ['LIKE', 'DISLIKE', 'CONSTRAINT'] as const;
export const ENTITY_TYPES = ['PERSON', 'LOCATION', 'TOOL', 'PROJECT'] as const;

export type CognitiveGroup = (typeof COGNITIVE_GROUPS)[number];
export type ContextGroup = (typeof CONTEXT_GROUPS)[number];
export type EntityType = (typeof ENTITY_TYPES)[number];

export type UserActivityRecord = {
  id: string;
  label: string;
  occurred_at: string;
  group_hint?: string | null;
  tags?: string[];
};

export type UserCognitiveStateRecord = {
  id: string;
  activity_id: string;
  group: CognitiveGroup;
  phrase: string;
  related_entity_ids?: string[];
};

export type UserContextRecord = {
  id: string;
  activity_id: string;
  type: ContextGroup;
  phrase: string;
  related_entity_ids?: string[];
};

export type UserEntityRecord = {
  id: string;
  activity_id: string;
  entity_type: Extract<EntityType, 'PERSON' | 'LOCATION'>;
  label: string;
  canonical_id?: string | null;
};

export type UserIntentRecord = {
  id: string;
  activity_id: string;
  label: string;
  tag: string;
};

export type UserProjectRecord = {
  id: string;
  activity_id: string;
  name: string;
  canonical_id?: string | null;
};

export type UserToneStateRecord = {
  id: string;
  activity_id: string;
  tone: string;
  intensity?: number | null;
};

export type UserTopicRecord = {
  id: string;
  activity_id: string;
  label: string;
  related_entity_ids?: string[];
};

export type UserToolRecord = {
  id: string;
  activity_id: string;
  name: string;
  canonical_id?: string | null;
};

export type InsightExplorerNormalizedData = {
  user_activities: UserActivityRecord[];
  user_cognitive_states: UserCognitiveStateRecord[];
  user_context: UserContextRecord[];
  user_entities: UserEntityRecord[];
  user_intents: UserIntentRecord[];
  user_projects: UserProjectRecord[];
  user_tone_states: UserToneStateRecord[];
  user_topics: UserTopicRecord[];
  user_tools: UserToolRecord[];
};

export type InsightRelationItemViewModel = {
  id: string;
  label: string;
  frequency: number;
  activityIds: string[];
  relatedEntityIds: string[];
};

export type InsightEntityViewModel = {
  id: string;
  label: string;
  type: EntityType;
  frequency: number;
  activityIds: string[];
};

export type ActivityGroupViewModel = {
  id: string;
  title: string;
  frequency: number;
  tags: string[];
  lastObservedAt: string;
  variants: string[];
  cognitiveStates: Record<CognitiveGroup, InsightRelationItemViewModel[]>;
  context: Record<ContextGroup, InsightRelationItemViewModel[]>;
  entitiesByType: Record<EntityType, InsightEntityViewModel[]>;
  entities: InsightEntityViewModel[];
  topics: InsightRelationItemViewModel[];
};

export type InsightExplorerViewModel = {
  activityGroups: ActivityGroupViewModel[];
  summary: {
    observationCount: number;
    groupCount: number;
    entityCount: number;
    topicCount: number;
  };
};

export type RelationshipMapNodeKind = 'activity' | 'entity' | 'state' | 'context';

export type RelationshipMapNodeSubtype = EntityType | CognitiveGroup | ContextGroup | null;

export type RelationshipMapEdgeRelation =
  | 'activity-entity'
  | 'activity-state'
  | 'activity-context'
  | 'state-entity'
  | 'context-entity';

export type RelationshipMapNodeViewModel = {
  id: string;
  label: string;
  kind: RelationshipMapNodeKind;
  subtype: RelationshipMapNodeSubtype;
  frequency: number;
  importance: number;
  connectedNodeIds: string[];
};

export type RelationshipMapEdgeViewModel = {
  id: string;
  source: string;
  target: string;
  relation: RelationshipMapEdgeRelation;
  weight: number;
};

export type RelationshipMapViewModel = {
  nodes: RelationshipMapNodeViewModel[];
  edges: RelationshipMapEdgeViewModel[];
  summary: {
    nodeCount: number;
    edgeCount: number;
    activityCount: number;
    entityCount: number;
    stateCount: number;
    contextCount: number;
  };
};

export type CognitiveSpaceOrbitLayerId = 'ACTIVITY' | 'ENTITY' | 'STATE' | 'CONTEXT';

export type CognitiveSpaceNodeKind = RelationshipMapNodeKind | 'self';

export type CognitiveSpaceNodeSubtype = RelationshipMapNodeSubtype | 'SELF';

export type CognitiveSpace3DNodeViewModel = {
  id: string;
  label: string;
  kind: CognitiveSpaceNodeKind;
  subtype: CognitiveSpaceNodeSubtype;
  orbit: CognitiveSpaceOrbitLayerId | 'SELF';
  frequency: number;
  importance: number;
  connectedNodeIds: string[];
  angle: number;
  height: number;
  size: number;
  color: string;
};

export type CognitiveSpace3DEdgeRelation = RelationshipMapEdgeRelation | 'self-activity';

export type CognitiveSpace3DEdgeViewModel = {
  id: string;
  source: string;
  target: string;
  weight: number;
  relation: CognitiveSpace3DEdgeRelation;
};

export type CognitiveSpaceOrbitLayerViewModel = {
  id: CognitiveSpaceOrbitLayerId;
  label: string;
  radius: number;
  speed: number;
  tilt: [number, number, number];
  nodes: CognitiveSpace3DNodeViewModel[];
};

export type CognitiveSpace3DViewModel = {
  selfNode: CognitiveSpace3DNodeViewModel;
  nodes: CognitiveSpace3DNodeViewModel[];
  layers: CognitiveSpaceOrbitLayerViewModel[];
  edges: CognitiveSpace3DEdgeViewModel[];
  summary: {
    orbitLayerCount: number;
    nodeCount: number;
    edgeCount: number;
    activityCount: number;
    entityCount: number;
    stateCount: number;
    contextCount: number;
    hiddenCount: number;
  };
};

export type InsightExplorerSource = 'live' | 'mock';

export type InsightExplorerResponse = {
  data: InsightExplorerNormalizedData;
  source: InsightExplorerSource;
  endpoint: string;
  message?: string;
};
