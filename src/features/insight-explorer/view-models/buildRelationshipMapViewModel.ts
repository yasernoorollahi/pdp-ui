import type {
  ContextGroup,
  InsightExplorerViewModel,
  RelationshipMapEdgeRelation,
  RelationshipMapEdgeViewModel,
  RelationshipMapNodeKind,
  RelationshipMapNodeSubtype,
  RelationshipMapNodeViewModel,
  RelationshipMapViewModel,
} from '../types';

type MutableNode = {
  id: string;
  label: string;
  kind: RelationshipMapNodeKind;
  subtype: RelationshipMapNodeSubtype;
  frequency: number;
  lastSeenAt: string;
  connectedNodeIds: Set<string>;
};

type MutableEdge = {
  id: string;
  source: string;
  target: string;
  relation: RelationshipMapEdgeRelation;
  weight: number;
  lastSeenAt: string;
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const slugify = (value: string) => normalizeText(value).replace(/\s+/g, '-');

const activityNodeId = (activityId: string) => `activity:${activityId}`;
const entityNodeId = (entityId: string) => `entity:${entityId}`;
const stateNodeId = (group: string, label: string) => `state:${group.toLowerCase()}:${slugify(label)}`;
const contextNodeId = (type: ContextGroup, label: string) => `context:${type.toLowerCase()}:${slugify(label)}`;
const pickMostRecentTimestamp = (left: string, right: string) =>
  new Date(left).getTime() >= new Date(right).getTime() ? left : right;

const upsertNode = (
  store: Map<string, MutableNode>,
  id: string,
  label: string,
  kind: RelationshipMapNodeKind,
  subtype: RelationshipMapNodeSubtype,
  frequency: number,
  lastSeenAt: string,
) => {
  const current = store.get(id);

  if (current) {
    current.frequency += frequency;
    current.lastSeenAt = pickMostRecentTimestamp(current.lastSeenAt, lastSeenAt);
    return current;
  }

  const next: MutableNode = {
    id,
    label,
    kind,
    subtype,
    frequency,
    lastSeenAt,
    connectedNodeIds: new Set<string>(),
  };
  store.set(id, next);
  return next;
};

const upsertEdge = (
  store: Map<string, MutableEdge>,
  source: string,
  target: string,
  relation: RelationshipMapEdgeRelation,
  weight: number,
  lastSeenAt: string,
) => {
  const [from, to] = source.localeCompare(target) <= 0 ? [source, target] : [target, source];
  const id = `${relation}:${from}::${to}`;
  const current = store.get(id);

  if (current) {
    current.weight += weight;
    current.lastSeenAt = pickMostRecentTimestamp(current.lastSeenAt, lastSeenAt);
    return current;
  }

  const next: MutableEdge = {
    id,
    source,
    target,
    relation,
    weight,
    lastSeenAt,
  };
  store.set(id, next);
  return next;
};

export const buildRelationshipMapViewModel = (viewModel: InsightExplorerViewModel): RelationshipMapViewModel => {
  const nodes = new Map<string, MutableNode>();
  const edges = new Map<string, MutableEdge>();
  const entityLookup = new Map<string, string>();

  viewModel.activityGroups.forEach((activity) => {
    const currentActivityNodeId = activityNodeId(activity.id);
    upsertNode(nodes, currentActivityNodeId, activity.title, 'activity', null, activity.frequency, activity.lastObservedAt);

    activity.entities.forEach((entity) => {
      const currentEntityNodeId = entityNodeId(entity.id);
      entityLookup.set(entity.id, currentEntityNodeId);
      upsertNode(nodes, currentEntityNodeId, entity.label, 'entity', entity.type, entity.frequency, entity.lastSeenAt);
      upsertEdge(edges, currentActivityNodeId, currentEntityNodeId, 'activity-entity', entity.frequency, entity.lastSeenAt);
    });
  });

  viewModel.activityGroups.forEach((activity) => {
    const currentActivityNodeId = activityNodeId(activity.id);

    (['CONFIDENCE', 'UNCERTAINTY'] as const).forEach((group) => {
      activity.cognitiveStates[group].forEach((state) => {
        const currentStateNodeId = stateNodeId(group, state.label);
        upsertNode(nodes, currentStateNodeId, state.label, 'state', group, state.frequency, state.lastSeenAt);
        upsertEdge(edges, currentActivityNodeId, currentStateNodeId, 'activity-state', state.frequency, state.lastSeenAt);

        state.relatedEntityIds.forEach((relatedEntityId) => {
          const currentEntityNodeId = entityLookup.get(relatedEntityId);
          if (!currentEntityNodeId) return;
          upsertEdge(edges, currentStateNodeId, currentEntityNodeId, 'state-entity', state.frequency, state.lastSeenAt);
        });
      });
    });

    (['LIKE', 'DISLIKE', 'CONSTRAINT'] as const).forEach((group) => {
      activity.context[group].forEach((context) => {
        const currentContextNodeId = contextNodeId(group, context.label);
        upsertNode(nodes, currentContextNodeId, context.label, 'context', group, context.frequency, context.lastSeenAt);
        upsertEdge(edges, currentActivityNodeId, currentContextNodeId, 'activity-context', context.frequency, context.lastSeenAt);

        context.relatedEntityIds.forEach((relatedEntityId) => {
          const currentEntityNodeId = entityLookup.get(relatedEntityId);
          if (!currentEntityNodeId) return;
          upsertEdge(edges, currentContextNodeId, currentEntityNodeId, 'context-entity', context.frequency, context.lastSeenAt);
        });
      });
    });
  });

  Array.from(edges.values()).forEach((edge) => {
    nodes.get(edge.source)?.connectedNodeIds.add(edge.target);
    nodes.get(edge.target)?.connectedNodeIds.add(edge.source);
  });

  const relationshipNodes: RelationshipMapNodeViewModel[] = Array.from(nodes.values())
    .map((node) => ({
      id: node.id,
      label: node.label,
      kind: node.kind,
      subtype: node.subtype,
      frequency: node.frequency,
      lastSeenAt: node.lastSeenAt,
      importance: node.frequency + node.connectedNodeIds.size * 0.65,
      connectedNodeIds: Array.from(node.connectedNodeIds).sort((left, right) => left.localeCompare(right)),
    }))
    .sort(
      (left, right) =>
        right.importance - left.importance ||
        left.kind.localeCompare(right.kind) ||
        left.label.localeCompare(right.label),
    );

  const relationshipEdges: RelationshipMapEdgeViewModel[] = Array.from(edges.values())
    .map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      relation: edge.relation,
      weight: edge.weight,
      lastSeenAt: edge.lastSeenAt,
    }))
    .sort((left, right) => right.weight - left.weight || left.id.localeCompare(right.id));

  return {
    nodes: relationshipNodes,
    edges: relationshipEdges,
    summary: {
      nodeCount: relationshipNodes.length,
      edgeCount: relationshipEdges.length,
      activityCount: relationshipNodes.filter((node) => node.kind === 'activity').length,
      entityCount: relationshipNodes.filter((node) => node.kind === 'entity').length,
      stateCount: relationshipNodes.filter((node) => node.kind === 'state').length,
      contextCount: relationshipNodes.filter((node) => node.kind === 'context').length,
    },
  };
};
