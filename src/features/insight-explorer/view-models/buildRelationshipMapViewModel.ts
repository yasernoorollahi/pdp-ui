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
  connectedNodeIds: Set<string>;
};

type MutableEdge = {
  id: string;
  source: string;
  target: string;
  relation: RelationshipMapEdgeRelation;
  weight: number;
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

const upsertNode = (
  store: Map<string, MutableNode>,
  id: string,
  label: string,
  kind: RelationshipMapNodeKind,
  subtype: RelationshipMapNodeSubtype,
  frequency: number,
) => {
  const current = store.get(id);

  if (current) {
    current.frequency += frequency;
    return current;
  }

  const next: MutableNode = {
    id,
    label,
    kind,
    subtype,
    frequency,
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
) => {
  const [from, to] = source.localeCompare(target) <= 0 ? [source, target] : [target, source];
  const id = `${relation}:${from}::${to}`;
  const current = store.get(id);

  if (current) {
    current.weight += weight;
    return current;
  }

  const next: MutableEdge = {
    id,
    source,
    target,
    relation,
    weight,
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
    upsertNode(nodes, currentActivityNodeId, activity.title, 'activity', null, activity.frequency);

    activity.entities.forEach((entity) => {
      const currentEntityNodeId = entityNodeId(entity.id);
      entityLookup.set(entity.id, currentEntityNodeId);
      upsertNode(nodes, currentEntityNodeId, entity.label, 'entity', entity.type, entity.frequency);
      upsertEdge(edges, currentActivityNodeId, currentEntityNodeId, 'activity-entity', entity.frequency);
    });
  });

  viewModel.activityGroups.forEach((activity) => {
    const currentActivityNodeId = activityNodeId(activity.id);

    (['CONFIDENCE', 'UNCERTAINTY'] as const).forEach((group) => {
      activity.cognitiveStates[group].forEach((state) => {
        const currentStateNodeId = stateNodeId(group, state.label);
        upsertNode(nodes, currentStateNodeId, state.label, 'state', group, state.frequency);
        upsertEdge(edges, currentActivityNodeId, currentStateNodeId, 'activity-state', state.frequency);

        state.relatedEntityIds.forEach((relatedEntityId) => {
          const currentEntityNodeId = entityLookup.get(relatedEntityId);
          if (!currentEntityNodeId) return;
          upsertEdge(edges, currentStateNodeId, currentEntityNodeId, 'state-entity', state.frequency);
        });
      });
    });

    (['LIKE', 'DISLIKE', 'CONSTRAINT'] as const).forEach((group) => {
      activity.context[group].forEach((context) => {
        const currentContextNodeId = contextNodeId(group, context.label);
        upsertNode(nodes, currentContextNodeId, context.label, 'context', group, context.frequency);
        upsertEdge(edges, currentActivityNodeId, currentContextNodeId, 'activity-context', context.frequency);

        context.relatedEntityIds.forEach((relatedEntityId) => {
          const currentEntityNodeId = entityLookup.get(relatedEntityId);
          if (!currentEntityNodeId) return;
          upsertEdge(edges, currentContextNodeId, currentEntityNodeId, 'context-entity', context.frequency);
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
