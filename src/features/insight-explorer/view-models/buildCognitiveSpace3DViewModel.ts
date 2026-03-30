import type {
  CognitiveSpace3DEdgeViewModel,
  CognitiveSpace3DViewModel,
  CognitiveSpaceNodeSubtype,
  CognitiveSpaceOrbitLayerId,
  CognitiveSpaceOrbitLayerViewModel,
  RelationshipMapNodeViewModel,
  RelationshipMapViewModel,
} from '../types';

type LayerConfig = {
  label: string;
  radius: number;
  speed: number;
  tilt: [number, number, number];
  maxNodes: number;
  minSize: number;
  maxSize: number;
  heightAmplitude: number;
};

const LAYER_CONFIG: Record<CognitiveSpaceOrbitLayerId, LayerConfig> = {
  ACTIVITY: {
    label: 'Activities',
    radius: 5.8,
    speed: 0.11,
    tilt: [0.58, 0, 0.08],
    maxNodes: 8,
    minSize: 0.52,
    maxSize: 0.98,
    heightAmplitude: 0.8,
  },
  ENTITY: {
    label: 'Entities',
    radius: 9.7,
    speed: -0.075,
    tilt: [-0.34, 0.22, 0.16],
    maxNodes: 12,
    minSize: 0.46,
    maxSize: 0.84,
    heightAmplitude: 1.1,
  },
  STATE: {
    label: 'Cognitive States',
    radius: 13.5,
    speed: 0.052,
    tilt: [0.22, -0.18, 0.26],
    maxNodes: 10,
    minSize: 0.42,
    maxSize: 0.78,
    heightAmplitude: 1.4,
  },
  CONTEXT: {
    label: 'Context',
    radius: 17.2,
    speed: -0.038,
    tilt: [-0.12, 0.1, -0.24],
    maxNodes: 8,
    minSize: 0.4,
    maxSize: 0.72,
    heightAmplitude: 1.7,
  },
};

const NODE_COLORS = {
  SELF: '#d8fff9',
  ACTIVITY: '#79e9dc',
  PERSON: '#a8d7ff',
  LOCATION: '#88b9ff',
  TOOL: '#91cdd1',
  PROJECT: '#b6cbff',
  CONFIDENCE: '#c9c3ff',
  UNCERTAINTY: '#ddcbff',
  LIKE: '#dcc7a8',
  DISLIKE: '#c8a096',
} as const;

const hashString = (value: string) =>
  value.split('').reduce((acc, char) => ((acc * 31) ^ char.charCodeAt(0)) >>> 0, 7);

const scaleBetween = (value: number, minValue: number, maxValue: number, outputMin: number, outputMax: number) => {
  if (maxValue <= minValue) return (outputMin + outputMax) / 2;
  return outputMin + ((value - minValue) / (maxValue - minValue)) * (outputMax - outputMin);
};

const pickTopNodes = (nodes: RelationshipMapNodeViewModel[], maxNodes: number) =>
  [...nodes]
    .sort((left, right) => right.importance - left.importance || right.frequency - left.frequency || left.label.localeCompare(right.label))
    .slice(0, maxNodes);

const colorForNode = (node: RelationshipMapNodeViewModel) => {
  if (node.kind === 'activity') return NODE_COLORS.ACTIVITY;
  if (node.kind === 'entity' && node.subtype) return NODE_COLORS[node.subtype as keyof typeof NODE_COLORS] ?? NODE_COLORS.PROJECT;
  if (node.kind === 'state' && node.subtype) return NODE_COLORS[node.subtype as keyof typeof NODE_COLORS] ?? NODE_COLORS.CONFIDENCE;
  if (node.kind === 'context' && node.subtype) return NODE_COLORS[node.subtype as keyof typeof NODE_COLORS] ?? NODE_COLORS.LIKE;
  return NODE_COLORS.ACTIVITY;
};

const buildLayerNodes = (
  orbit: CognitiveSpaceOrbitLayerId,
  sourceNodes: RelationshipMapNodeViewModel[],
) => {
  const config = LAYER_CONFIG[orbit];
  const pickedNodes = pickTopNodes(sourceNodes, config.maxNodes);
  const maxImportance = Math.max(...pickedNodes.map((node) => node.importance), 1);
  const minImportance = Math.min(...pickedNodes.map((node) => node.importance), maxImportance);

  return pickedNodes.map((node, index) => {
    const seed = hashString(node.id);
    const angleOffset = ((seed % 360) / 360) * (Math.PI / Math.max(pickedNodes.length, 2));
    const baseAngle = (index / Math.max(pickedNodes.length, 1)) * Math.PI * 2 + angleOffset;
    const height = Math.sin(index * 1.31 + seed * 0.0048) * config.heightAmplitude;

    return {
      id: node.id,
      label: node.label,
      kind: node.kind,
      subtype: node.subtype as CognitiveSpaceNodeSubtype,
      orbit,
      frequency: node.frequency,
      importance: node.importance,
      connectedNodeIds: node.connectedNodeIds,
      angle: baseAngle,
      height,
      size: scaleBetween(node.importance, minImportance, maxImportance, config.minSize, config.maxSize),
      color: colorForNode(node),
    };
  });
};

export const buildCognitiveSpace3DViewModel = (
  relationshipMap: RelationshipMapViewModel,
  observationCount: number,
): CognitiveSpace3DViewModel => {
  const activityNodes = buildLayerNodes(
    'ACTIVITY',
    relationshipMap.nodes.filter((node) => node.kind === 'activity'),
  );
  const entityNodes = buildLayerNodes(
    'ENTITY',
    relationshipMap.nodes.filter((node) => node.kind === 'entity'),
  );
  const stateNodes = buildLayerNodes(
    'STATE',
    relationshipMap.nodes.filter((node) => node.kind === 'state'),
  );
  const contextNodes = buildLayerNodes(
    'CONTEXT',
    relationshipMap.nodes.filter((node) => node.kind === 'context' && (node.subtype === 'LIKE' || node.subtype === 'DISLIKE')),
  );

  const selectedNodes = [...activityNodes, ...entityNodes, ...stateNodes, ...contextNodes];
  const selectedNodeIds = new Set(selectedNodes.map((node) => node.id));
  const activityNodeIds = activityNodes.map((node) => node.id);

  const visibleEdges: CognitiveSpace3DEdgeViewModel[] = relationshipMap.edges
    .filter((edge) => selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target))
    .map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      weight: edge.weight,
      relation: edge.relation,
    }));

  activityNodeIds.forEach((activityId) => {
    visibleEdges.push({
      id: `self-activity:${activityId}`,
      source: 'self',
      target: activityId,
      weight: 1,
      relation: 'self-activity',
    });
  });

  const adjacency = new Map<string, Set<string>>();

  visibleEdges.forEach((edge) => {
    const sourceSet = adjacency.get(edge.source) ?? new Set<string>();
    const targetSet = adjacency.get(edge.target) ?? new Set<string>();
    sourceSet.add(edge.target);
    targetSet.add(edge.source);
    adjacency.set(edge.source, sourceSet);
    adjacency.set(edge.target, targetSet);
  });

  const withVisibleConnections = selectedNodes.map((node) => ({
    ...node,
    connectedNodeIds: Array.from(adjacency.get(node.id) ?? []).sort((left, right) => left.localeCompare(right)),
  }));

  const layers: CognitiveSpaceOrbitLayerViewModel[] = [
    {
      id: 'ACTIVITY',
      label: LAYER_CONFIG.ACTIVITY.label,
      radius: LAYER_CONFIG.ACTIVITY.radius,
      speed: LAYER_CONFIG.ACTIVITY.speed,
      tilt: LAYER_CONFIG.ACTIVITY.tilt,
      nodes: withVisibleConnections.filter((node) => node.orbit === 'ACTIVITY'),
    },
    {
      id: 'ENTITY',
      label: LAYER_CONFIG.ENTITY.label,
      radius: LAYER_CONFIG.ENTITY.radius,
      speed: LAYER_CONFIG.ENTITY.speed,
      tilt: LAYER_CONFIG.ENTITY.tilt,
      nodes: withVisibleConnections.filter((node) => node.orbit === 'ENTITY'),
    },
    {
      id: 'STATE',
      label: LAYER_CONFIG.STATE.label,
      radius: LAYER_CONFIG.STATE.radius,
      speed: LAYER_CONFIG.STATE.speed,
      tilt: LAYER_CONFIG.STATE.tilt,
      nodes: withVisibleConnections.filter((node) => node.orbit === 'STATE'),
    },
    {
      id: 'CONTEXT',
      label: LAYER_CONFIG.CONTEXT.label,
      radius: LAYER_CONFIG.CONTEXT.radius,
      speed: LAYER_CONFIG.CONTEXT.speed,
      tilt: LAYER_CONFIG.CONTEXT.tilt,
      nodes: withVisibleConnections.filter((node) => node.orbit === 'CONTEXT'),
    },
  ];

  const selfNode = {
    id: 'self',
    label: 'Self',
    kind: 'self' as const,
    subtype: 'SELF' as const,
    orbit: 'SELF' as const,
    frequency: observationCount,
    importance: Math.max(observationCount, 1),
    connectedNodeIds: Array.from(adjacency.get('self') ?? []).sort((left, right) => left.localeCompare(right)),
    angle: 0,
    height: 0,
    size: 1.45,
    color: NODE_COLORS.SELF,
  };

  const totalVisibleNodes = withVisibleConnections.length + 1;
  const hiddenCount = Math.max(relationshipMap.summary.nodeCount - withVisibleConnections.length, 0);

  return {
    selfNode,
    nodes: [selfNode, ...withVisibleConnections],
    layers,
    edges: visibleEdges,
    summary: {
      orbitLayerCount: 4,
      nodeCount: totalVisibleNodes,
      edgeCount: visibleEdges.length,
      activityCount: activityNodes.length,
      entityCount: entityNodes.length,
      stateCount: stateNodes.length,
      contextCount: contextNodes.length,
      hiddenCount,
    },
  };
};
