import type {
  CognitiveGroup,
  ContextGroup,
  InsightEntityViewModel,
  InsightExplorerViewModel,
  InsightRelationItemViewModel,
} from '../types';
import { resolveNumericBounds, type NumericBounds } from './relationshipMapSignals';

export type RelationshipMapPatternPath = {
  id: string;
  nodeIds: [string, string, string, string];
  edgeIds: [string, string, string, string];
  frequency: number;
  lastSeenAt: string;
};

export type RelationshipMapPatternModel = {
  paths: RelationshipMapPatternPath[];
  topPaths: RelationshipMapPatternPath[];
  topPathIds: Set<string>;
  pathsByNodeId: Map<string, RelationshipMapPatternPath[]>;
  pathsByEdgeId: Map<string, RelationshipMapPatternPath[]>;
  topPathFrequencyBounds: NumericBounds;
};

const MAX_HIGHLIGHTED_PATHS = 8;

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const slugify = (value: string) => normalizeText(value).replace(/\s+/g, '-');

const activityNodeId = (activityId: string) => `activity:${activityId}`;
const entityNodeId = (entityId: string) => `entity:${entityId}`;
const stateNodeId = (group: CognitiveGroup, label: string) => `state:${group.toLowerCase()}:${slugify(label)}`;
const contextNodeId = (group: ContextGroup, label: string) => `context:${group.toLowerCase()}:${slugify(label)}`;

const createEdgeId = (relation: string, source: string, target: string) => {
  const [from, to] = source.localeCompare(target) <= 0 ? [source, target] : [target, source];
  return `${relation}:${from}::${to}`;
};

const pickMostRecentTimestamp = (left: string, right: string) =>
  new Date(left).getTime() >= new Date(right).getTime() ? left : right;

const intersectIds = (...collections: string[][]) => {
  if (collections.length === 0) return [];

  const [first, ...rest] = collections
    .map((collection) => Array.from(new Set(collection)))
    .sort((left, right) => left.length - right.length);

  if (!first) return [];

  return first.filter((value) => rest.every((collection) => collection.includes(value)));
};

const pushIndexedPath = <K extends string>(store: Map<K, RelationshipMapPatternPath[]>, key: K, path: RelationshipMapPatternPath) => {
  const current = store.get(key) ?? [];
  current.push(path);
  store.set(key, current);
};

type GroupedState = InsightRelationItemViewModel & { group: CognitiveGroup };
type GroupedContext = InsightRelationItemViewModel & { group: ContextGroup };

const flattenStates = (
  groups: InsightExplorerViewModel['activityGroups'][number]['cognitiveStates'],
): GroupedState[] => [
  ...groups.CONFIDENCE.map((state) => ({ ...state, group: 'CONFIDENCE' as const })),
  ...groups.UNCERTAINTY.map((state) => ({ ...state, group: 'UNCERTAINTY' as const })),
];

const flattenContexts = (
  groups: InsightExplorerViewModel['activityGroups'][number]['context'],
): GroupedContext[] => [
  ...groups.LIKE.map((context) => ({ ...context, group: 'LIKE' as const })),
  ...groups.DISLIKE.map((context) => ({ ...context, group: 'DISLIKE' as const })),
  ...groups.CONSTRAINT.map((context) => ({ ...context, group: 'CONSTRAINT' as const })),
];

const comparePaths = (left: RelationshipMapPatternPath, right: RelationshipMapPatternPath) =>
  right.frequency - left.frequency ||
  new Date(right.lastSeenAt).getTime() - new Date(left.lastSeenAt).getTime() ||
  left.id.localeCompare(right.id);

const buildPathId = (nodeIds: RelationshipMapPatternPath['nodeIds']) => nodeIds.join('::');

const pathLastSeenAt = (
  activitySeenAt: string,
  stateSeenAt: string,
  contextSeenAt: string,
  entitySeenAt: string,
) => [stateSeenAt, contextSeenAt, entitySeenAt].reduce(pickMostRecentTimestamp, activitySeenAt);

const entityLookupForActivity = (entities: InsightEntityViewModel[]) => new Map(entities.map((entity) => [entity.id, entity]));

export const buildRelationshipMapPatternModel = (viewModel: InsightExplorerViewModel): RelationshipMapPatternModel => {
  const pathMap = new Map<string, RelationshipMapPatternPath>();

  viewModel.activityGroups.forEach((activity) => {
    const activityId = activityNodeId(activity.id);
    const states = flattenStates(activity.cognitiveStates);
    const contexts = flattenContexts(activity.context);
    const entitiesById = entityLookupForActivity(activity.entities);

    states.forEach((state) => {
      contexts.forEach((context) => {
        const sharedEntityIds = intersectIds(state.relatedEntityIds, context.relatedEntityIds).filter((entityId) =>
          entitiesById.has(entityId),
        );

        if (sharedEntityIds.length === 0) {
          return;
        }

        sharedEntityIds.forEach((sharedEntityId) => {
          const entity = entitiesById.get(sharedEntityId);

          if (!entity) {
            return;
          }

          const frequency = intersectIds(state.activityIds, context.activityIds, entity.activityIds).length;

          if (frequency === 0) {
            return;
          }

          const nextNodeIds: RelationshipMapPatternPath['nodeIds'] = [
            activityId,
            stateNodeId(state.group, state.label),
            contextNodeId(context.group, context.label),
            entityNodeId(entity.id),
          ];

          const nextPath: RelationshipMapPatternPath = {
            id: buildPathId(nextNodeIds),
            nodeIds: nextNodeIds,
            edgeIds: [
              createEdgeId('activity-state', nextNodeIds[0], nextNodeIds[1]),
              createEdgeId('activity-context', nextNodeIds[0], nextNodeIds[2]),
              createEdgeId('state-entity', nextNodeIds[1], nextNodeIds[3]),
              createEdgeId('context-entity', nextNodeIds[2], nextNodeIds[3]),
            ],
            frequency,
            lastSeenAt: pathLastSeenAt(activity.lastObservedAt, state.lastSeenAt, context.lastSeenAt, entity.lastSeenAt),
          };

          pathMap.set(nextPath.id, nextPath);
        });
      });
    });
  });

  const paths = Array.from(pathMap.values()).sort(comparePaths);
  const topPaths = paths.slice(0, Math.min(MAX_HIGHLIGHTED_PATHS, paths.length));
  const topPathIds = new Set(topPaths.map((path) => path.id));
  const pathsByNodeId = new Map<string, RelationshipMapPatternPath[]>();
  const pathsByEdgeId = new Map<string, RelationshipMapPatternPath[]>();

  paths.forEach((path) => {
    path.nodeIds.forEach((nodeId) => pushIndexedPath(pathsByNodeId, nodeId, path));
    path.edgeIds.forEach((edgeId) => pushIndexedPath(pathsByEdgeId, edgeId, path));
  });

  return {
    paths,
    topPaths,
    topPathIds,
    pathsByNodeId,
    pathsByEdgeId,
    topPathFrequencyBounds: resolveNumericBounds(topPaths.map((path) => path.frequency), 1),
  };
};
