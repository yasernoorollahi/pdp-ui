import { memo, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react';
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type ReactFlowInstance,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  CONTEXT_GROUPS,
  ENTITY_TYPES,
  type ContextGroup,
  type EntityType,
  type InsightExplorerViewModel,
  type RelationshipMapNodeKind,
  type RelationshipMapNodeSubtype,
  type RelationshipMapNodeViewModel,
  type RelationshipMapViewModel,
} from '../types';
import {
  buildRelationshipMeaningModel,
  type RelationshipMeaningConnectionGroupViewModel,
  type RelationshipMeaningDriverViewModel,
  type RelationshipMeaningImpactLabel,
  type RelationshipQuestionId,
  type RelationshipQuestionViewModel,
} from '../view-models/buildRelationshipMeaningModel';
import {
  computeCognitiveWeight,
  formatLastSeenLabel,
  normalizeWeight,
  resolveNumericBounds,
  scaleEdgeConfidence,
  scaleEdgeStrength,
  scaleNodeGlow,
  scaleNodePositionInfluence,
  scaleNodeSize,
  scaleRecencyOpacity,
} from '../utils/relationshipMapSignals';
import { buildRelationshipMapPatternModel } from '../utils/relationshipMapPatterns';
import { RelationshipMapEdge, type RelationshipMapFlowEdge, type RelationshipMapFlowEdgeData } from './RelationshipMapEdge';
import { RelationshipMapNode, type RelationshipMapFlowNodeData } from './RelationshipMapNode';

type RelationshipMapFilters = {
  activities: boolean;
  states: boolean;
  entityTypes: Record<EntityType, boolean>;
  contextTypes: Record<ContextGroup, boolean>;
};

type DisplayGraphNode = RelationshipMapNodeViewModel & {
  isCollapsedGroup?: boolean;
  collapsedCount?: number;
  collapsedHint?: string | null;
};

const COLLAPSED_NODE_PREFIX = 'collapsed:';
const DEFAULT_FOCUS_DEPTH = 2;
const HOVER_PREVIEW_DEPTH = 1;

const createDefaultFilters = (): RelationshipMapFilters => ({
  activities: true,
  states: true,
  entityTypes: { PERSON: true, LOCATION: true, TOOL: true, PROJECT: true },
  contextTypes: { LIKE: true, DISLIKE: true, CONSTRAINT: true },
});

const createQuestionFilters = (_questionId: RelationshipQuestionId): RelationshipMapFilters => createDefaultFilters();

const nodeTypes = { relationshipMapNode: RelationshipMapNode };
const edgeTypes = { relationshipMapEdge: RelationshipMapEdge };

const COLUMN_X: Record<'activity' | 'state' | 'context' | 'entity', number> = {
  activity: 80,
  state: 420,
  context: 760,
  entity: 1100,
};

const NODE_COLOR: Record<'activity' | 'state' | 'context' | 'entity', string> = {
  activity: '#5eead4',
  entity: '#93c5fd',
  state: '#c4b5fd',
  context: '#fcd34d',
};

const EDGE_STROKES = {
  active: 'rgba(240, 249, 255, 0.82)',
  default: 'rgba(148, 163, 184, 0.3)',
  muted: 'rgba(71, 85, 105, 0.12)',
  glow: 'rgba(226, 232, 240, 0.38)',
} as const;

const stateLabelMap: Record<'CONFIDENCE' | 'UNCERTAINTY', string> = {
  CONFIDENCE: 'Confidence',
  UNCERTAINTY: 'Uncertainty',
};

const contextLabelMap: Record<ContextGroup, string> = {
  LIKE: 'Like',
  DISLIKE: 'Dislike',
  CONSTRAINT: 'Constraint',
};

const entityLabelMap: Record<EntityType, string> = {
  PERSON: 'People',
  LOCATION: 'Locations',
  TOOL: 'Tools',
  PROJECT: 'Projects',
};

const isNodeVisible = (node: RelationshipMapNodeViewModel, filters: RelationshipMapFilters) => {
  if (node.kind === 'activity') return filters.activities;
  if (node.kind === 'state') return filters.states;
  if (node.kind === 'entity') return Boolean(node.subtype && filters.entityTypes[node.subtype as EntityType]);
  if (node.kind === 'context') return Boolean(node.subtype && filters.contextTypes[node.subtype as ContextGroup]);
  return true;
};

const createAdjacencyMap = (graph: RelationshipMapViewModel) => {
  const adjacency = new Map<string, string[]>();
  graph.nodes.forEach((node) => {
    adjacency.set(node.id, node.connectedNodeIds);
  });
  return adjacency;
};

const isCollapsedNodeId = (nodeId: string) => nodeId.startsWith(COLLAPSED_NODE_PREFIX);
const pickMostRecentTimestamp = (left: string, right: string) =>
  new Date(left).getTime() >= new Date(right).getTime() ? left : right;
const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3);

const labelForKind = (node: RelationshipMapNodeViewModel | null) => {
  if (!node) return 'None';
  return node.kind.charAt(0).toUpperCase() + node.kind.slice(1);
};

const hiddenGroupSortKey = (kind: RelationshipMapNodeKind, subtype: RelationshipMapNodeSubtype) => {
  if (kind === 'activity') return 0;
  if (kind === 'state') return subtype === 'CONFIDENCE' ? 10 : 11;
  if (kind === 'context') {
    if (subtype === 'LIKE') return 20;
    if (subtype === 'DISLIKE') return 21;
    return 22;
  }

  if (kind === 'entity') {
    if (subtype === 'PERSON') return 30;
    if (subtype === 'LOCATION') return 31;
    if (subtype === 'TOOL') return 32;
    return 33;
  }

  return 99;
};

const hiddenGroupTitle = (kind: RelationshipMapNodeKind, subtype: RelationshipMapNodeSubtype) => {
  if (kind === 'activity') return 'Activities';
  if (kind === 'state' && subtype) return stateLabelMap[subtype as 'CONFIDENCE' | 'UNCERTAINTY'] ?? 'States';
  if (kind === 'context' && subtype) return contextLabelMap[subtype as ContextGroup] ?? 'Context';
  if (kind === 'entity' && subtype) return entityLabelMap[subtype as EntityType] ?? 'Entities';
  return kind.charAt(0).toUpperCase() + kind.slice(1);
};

const hiddenGroupHint = (kind: RelationshipMapNodeKind, count: number) => {
  if (kind === 'activity') return `${count} more activity clusters stay folded until a related signal is opened.`;
  if (kind === 'state') return `${count} more states are folded in this lane.`;
  if (kind === 'context') return `${count} more context signals are folded in this lane.`;
  return `${count} more entities are folded in this lane.`;
};

const buildCollapsedNodes = (hiddenNodes: RelationshipMapNodeViewModel[]): DisplayGraphNode[] => {
  const groups = new Map<
    string,
    {
      kind: RelationshipMapNodeKind;
      subtype: RelationshipMapNodeSubtype;
      count: number;
      importance: number;
      lastSeenAt: string;
    }
  >();

  hiddenNodes.forEach((node) => {
    const key = `${node.kind}:${String(node.subtype ?? 'all')}`;
    const current = groups.get(key) ?? {
      kind: node.kind,
      subtype: node.subtype,
      count: 0,
      importance: 0,
      lastSeenAt: node.lastSeenAt,
    };

    current.count += 1;
    current.importance += node.importance;
    current.lastSeenAt = pickMostRecentTimestamp(current.lastSeenAt, node.lastSeenAt);
    groups.set(key, current);
  });

  return Array.from(groups.values())
    .sort(
      (left, right) =>
        hiddenGroupSortKey(left.kind, left.subtype) - hiddenGroupSortKey(right.kind, right.subtype) ||
        left.count - right.count,
    )
    .map((group) => ({
      id: `${COLLAPSED_NODE_PREFIX}${group.kind}:${String(group.subtype ?? 'all')}`,
      label: hiddenGroupTitle(group.kind, group.subtype),
      kind: group.kind,
      subtype: group.subtype,
      frequency: group.count,
      lastSeenAt: group.lastSeenAt,
      importance: Math.max(group.importance / Math.max(group.count, 1), 1),
      connectedNodeIds: [],
      isCollapsedGroup: true,
      collapsedCount: group.count,
      collapsedHint: hiddenGroupHint(group.kind, group.count),
    }));
};

const collectNodeDepths = (
  startNodeId: string | null,
  filteredNodes: RelationshipMapNodeViewModel[],
  adjacency: Map<string, string[]>,
  maxDepth: number,
) => {
  if (!startNodeId || isCollapsedNodeId(startNodeId)) {
    return new Map<string, number>();
  }

  const allowedIds = new Set(filteredNodes.map((node) => node.id));

  if (!allowedIds.has(startNodeId)) {
    return new Map<string, number>();
  }

  const steps = new Map<string, number>([[startNodeId, 0]]);
  const queue = [startNodeId];

  while (queue.length > 0) {
    const currentNodeId = queue.shift();

    if (!currentNodeId) continue;

    const currentDepth = steps.get(currentNodeId) ?? 0;

    if (currentDepth >= maxDepth) {
      continue;
    }

    (adjacency.get(currentNodeId) ?? []).forEach((neighborId) => {
      if (!allowedIds.has(neighborId) || steps.has(neighborId)) {
        return;
      }

      steps.set(neighborId, currentDepth + 1);
      queue.push(neighborId);
    });
  }

  return steps;
};

const layoutNodes = (
  nodes: DisplayGraphNode[],
  dimensions: Map<string, { width: number; height: number }>,
  positionInfluence?: Map<string, number>,
) => {
  const positions = new Map<string, { x: number; y: number }>();

  (['activity', 'state', 'context', 'entity'] as const).forEach((kind) => {
    const columnNodes = nodes
      .filter((node) => node.kind === kind)
      .sort(
        (left, right) =>
          Number(Boolean(left.isCollapsedGroup)) - Number(Boolean(right.isCollapsedGroup)) ||
          right.importance - left.importance ||
          left.label.localeCompare(right.label),
      );

    const totalHeight = columnNodes.reduce((sum, node, index) => {
      const current = dimensions.get(node.id);
      return sum + (current?.height ?? 88) + (index === columnNodes.length - 1 ? 0 : 26);
    }, 0);

    let currentY = Math.max(48, 410 - totalHeight / 2);

    columnNodes.forEach((node) => {
      const nodeHeight = dimensions.get(node.id)?.height ?? 88;
      const idealY = 410 - nodeHeight / 2;
      const weightShift = node.isCollapsedGroup
        ? 0
        : Math.max(-12, Math.min(12, (idealY - currentY) * (positionInfluence?.get(node.id) ?? 0) * 0.08));

      positions.set(node.id, { x: COLUMN_X[kind], y: currentY + weightShift });
      currentY += nodeHeight + 26;
    });
  });

  return positions;
};

const FilterToggle = memo(({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      borderRadius: '100px',
      border: active ? '1px solid rgba(94,234,212,0.28)' : '1px solid rgba(255,255,255,0.08)',
      background: active ? 'rgba(45,212,191,0.08)' : 'rgba(255,255,255,0.03)',
      padding: '5px 12px',
      fontSize: '0.72rem',
      fontWeight: active ? 600 : 400,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: active ? 'rgba(94,234,212,0.9)' : 'rgba(255,255,255,0.42)',
      cursor: 'pointer',
      transition: 'all 0.18s',
    }}
  >
    {label}
  </button>
));

FilterToggle.displayName = 'FilterToggle';

const SideSection = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      borderRadius: '20px',
      border: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(255,255,255,0.03)',
      padding: '16px',
    }}
  >
    {children}
  </div>
);

const SectionTitle = ({ children }: { children: ReactNode }) => (
  <p style={{ fontSize: '0.84rem', fontWeight: 600, color: 'white', marginBottom: '10px' }}>{children}</p>
);

const Eyebrow = ({ children }: { children: ReactNode }) => (
  <p
    style={{
      fontSize: '0.62rem',
      fontWeight: 600,
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.28)',
    }}
  >
    {children}
  </p>
);

const impactTone = (impactLabel: RelationshipMeaningImpactLabel) => {
  switch (impactLabel) {
    case 'High impact':
      return {
        border: 'rgba(94,234,212,0.2)',
        background: 'rgba(45,212,191,0.08)',
        color: 'rgba(153,246,228,0.9)',
      };
    case 'Medium impact':
      return {
        border: 'rgba(147,197,253,0.2)',
        background: 'rgba(96,165,250,0.08)',
        color: 'rgba(191,219,254,0.9)',
      };
    default:
      return {
        border: 'rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.04)',
        color: 'rgba(255,255,255,0.55)',
      };
  }
};

const ImpactPill = ({ impactLabel }: { impactLabel: RelationshipMeaningImpactLabel }) => {
  const tone = impactTone(impactLabel);

  return (
    <span
      style={{
        borderRadius: '999px',
        border: `1px solid ${tone.border}`,
        background: tone.background,
        padding: '3px 9px',
        fontSize: '0.62rem',
        fontWeight: 600,
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        color: tone.color,
        whiteSpace: 'nowrap',
      }}
    >
      {impactLabel}
    </span>
  );
};

const DriverList = ({
  title,
  drivers,
  emptyLabel,
}: {
  title: string;
  drivers: RelationshipMeaningDriverViewModel[];
  emptyLabel: string;
}) => (
  <div>
    <SectionTitle>{title}</SectionTitle>
    {drivers.length === 0 ? (
      <p style={{ fontSize: '0.78rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.3)' }}>{emptyLabel}</p>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {drivers.map((driver, index) => (
          <div
            key={driver.nodeId}
            style={{
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(0,0,0,0.2)',
              padding: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '0.7rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.26)' }}>
                  {index + 1}. {driver.kind}
                </p>
                <p style={{ marginTop: '4px', fontSize: '0.88rem', fontWeight: 600, color: 'white' }}>{driver.label}</p>
              </div>
              <ImpactPill impactLabel={driver.impactLabel} />
            </div>
            <p style={{ marginTop: '8px', fontSize: '0.78rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.42)' }}>
              {driver.explanation}
            </p>
          </div>
        ))}
      </div>
    )}
  </div>
);

const PatternList = ({ patterns, emptyLabel }: { patterns: Array<{ id: string; text: string }>; emptyLabel: string }) => (
  <div>
    <SectionTitle>Patterns detected</SectionTitle>
    {patterns.length === 0 ? (
      <p style={{ fontSize: '0.78rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.3)' }}>{emptyLabel}</p>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {patterns.map((pattern) => (
          <div
            key={pattern.id}
            style={{
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,255,255,0.025)',
              padding: '11px 12px',
            }}
          >
            <p style={{ fontSize: '0.8rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.6)' }}>{pattern.text}</p>
          </div>
        ))}
      </div>
    )}
  </div>
);

const QuestionCard = ({
  question,
  active,
  disabled,
  onClick,
}: {
  question: RelationshipQuestionViewModel;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    style={{
      width: '100%',
      borderRadius: '22px',
      border: active ? '1px solid rgba(94,234,212,0.3)' : '1px solid rgba(255,255,255,0.08)',
      background: active ? 'rgba(45,212,191,0.08)' : 'rgba(255,255,255,0.03)',
      padding: '16px',
      textAlign: 'left',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      transition: 'all 0.2s ease',
    }}
  >
    <p style={{ fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.45, color: 'white' }}>{question.label}</p>
    <p style={{ marginTop: '8px', fontSize: '0.8rem', lineHeight: 1.65, color: active ? 'rgba(220,252,231,0.76)' : 'rgba(255,255,255,0.42)' }}>
      {question.helper}
    </p>
  </button>
);

const SignalGroupCard = ({ group }: { group: RelationshipMeaningConnectionGroupViewModel }) => (
  <div
    style={{
      borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.07)',
      background: 'rgba(255,255,255,0.025)',
      padding: '12px',
      minWidth: 0,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
      <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'white' }}>{group.title}</p>
      <span
        style={{
          borderRadius: '999px',
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.04)',
          padding: '2px 8px',
          fontSize: '0.66rem',
          color: 'rgba(255,255,255,0.44)',
          whiteSpace: 'nowrap',
        }}
      >
        {group.items.length}
      </span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', maxHeight: '188px', overflowY: 'auto', paddingRight: '3px' }}>
      {group.items.map((item) => (
        <div
          key={item.nodeId}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '10px',
            borderRadius: '12px',
            background: 'rgba(0,0,0,0.18)',
            border: '1px solid rgba(255,255,255,0.06)',
            padding: '9px 10px',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 500, color: 'rgba(255,255,255,0.82)' }}>{item.label}</p>
            <p style={{ marginTop: '2px', fontSize: '0.66rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.26)' }}>
              {item.kind}
            </p>
          </div>
          <ImpactPill impactLabel={item.impactLabel} />
        </div>
      ))}
    </div>
  </div>
);

const primarySectionTitle = (node: RelationshipMapNodeViewModel | null) => {
  if (!node) return 'Strongest contributors';
  if (node.kind === 'state') return 'What seems to create this state';
  if (node.kind === 'activity') return 'What this activity keeps producing';
  if (node.kind === 'entity') return 'How this keeps affecting you';
  return 'What this condition keeps changing';
};

const secondarySectionTitle = (node: RelationshipMapNodeViewModel | null) => {
  if (!node) return 'Supporting signals';
  if (node.kind === 'state') return 'Most influential people, tools, places, and context';
  if (node.kind === 'activity') return 'Signals around this moment';
  if (node.kind === 'entity') return 'Where this influence shows up most';
  return 'Other recurring signals around it';
};

export const RelationshipMapView = ({
  graph,
  viewModel,
  focusDepth = DEFAULT_FOCUS_DEPTH,
}: {
  graph: RelationshipMapViewModel;
  viewModel: InsightExplorerViewModel;
  focusDepth?: number;
}) => {
  const [filters, setFilters] = useState<RelationshipMapFilters>(() => createDefaultFilters());
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoverPreviewNodeId, setHoverPreviewNodeId] = useState<string | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [activeQuestionId, setActiveQuestionId] = useState<RelationshipQuestionId | null>(null);
  const [isPending, startTransition] = useTransition();
  const flowInstanceRef = useRef<ReactFlowInstance<Node<RelationshipMapFlowNodeData>, RelationshipMapFlowEdge> | null>(null);
  const lastViewportFocusRef = useRef<string | null>(null);
  const normalizedFocusDepth = Math.max(1, Math.round(focusDepth));

  const adjacency = useMemo(() => createAdjacencyMap(graph), [graph]);
  const meaningModel = useMemo(() => buildRelationshipMeaningModel(viewModel, graph), [viewModel, graph]);
  const patternModel = useMemo(() => buildRelationshipMapPatternModel(viewModel), [viewModel]);

  const activeQuestion = useMemo(
    () => meaningModel.questions.find((question) => question.id === activeQuestionId) ?? null,
    [activeQuestionId, meaningModel.questions],
  );
  const focusedNode = useMemo(
    () => graph.nodes.find((node) => node.id === focusedNodeId) ?? null,
    [focusedNodeId, graph.nodes],
  );
  const activeInsight = focusedNodeId ? meaningModel.insightsByNodeId[focusedNodeId] ?? null : null;

  const filteredNodes = useMemo(() => graph.nodes.filter((node) => isNodeVisible(node, filters)), [filters, graph.nodes]);
  const focusDepthMap = useMemo(
    () => collectNodeDepths(focusedNodeId, filteredNodes, adjacency, normalizedFocusDepth),
    [adjacency, filteredNodes, focusedNodeId, normalizedFocusDepth],
  );
  const hoverDepthMap = useMemo(
    () =>
      !focusedNodeId
        ? collectNodeDepths(hoverPreviewNodeId, filteredNodes, adjacency, Math.min(normalizedFocusDepth, HOVER_PREVIEW_DEPTH))
        : new Map<string, number>(),
    [adjacency, filteredNodes, focusedNodeId, hoverPreviewNodeId, normalizedFocusDepth],
  );
  const hoverPreviewNodeIds = useMemo(() => new Set(hoverDepthMap.keys()), [hoverDepthMap]);
  const expandedRealNodeIds = useMemo(
    () =>
      focusedNodeId
        ? new Set(focusDepthMap.keys())
        : hoverPreviewNodeId && hoverDepthMap.size > 0
          ? new Set(hoverDepthMap.keys())
          : new Set(filteredNodes.filter((node) => node.kind === 'activity').map((node) => node.id)),
    [filteredNodes, focusDepthMap, focusedNodeId, hoverPreviewNodeId, hoverDepthMap],
  );

  const visibleRealNodes = useMemo(
    () => filteredNodes.filter((node) => expandedRealNodeIds.has(node.id)),
    [expandedRealNodeIds, filteredNodes],
  );
  const hiddenNodes = useMemo(
    () => filteredNodes.filter((node) => !expandedRealNodeIds.has(node.id)),
    [expandedRealNodeIds, filteredNodes],
  );
  const collapsedNodes = useMemo(() => buildCollapsedNodes(hiddenNodes), [hiddenNodes]);
  const displayNodes = useMemo<DisplayGraphNode[]>(
    () => [...visibleRealNodes, ...collapsedNodes],
    [collapsedNodes, visibleRealNodes],
  );
  const visibleRealNodeIdSet = useMemo(() => new Set(visibleRealNodes.map((node) => node.id)), [visibleRealNodes]);
  const nodeFrequencyBounds = useMemo(
    () => resolveNumericBounds(filteredNodes.map((node) => node.frequency)),
    [filteredNodes],
  );
  const nodeIntensityBounds = useMemo(
    () => resolveNumericBounds(filteredNodes.map((node) => node.importance)),
    [filteredNodes],
  );
  const edgeWeightBounds = useMemo(
    () => resolveNumericBounds(graph.edges.map((edge) => edge.weight)),
    [graph.edges],
  );

  const visibleEdges = useMemo(
    () => graph.edges.filter((edge) => visibleRealNodeIdSet.has(edge.source) && visibleRealNodeIdSet.has(edge.target)),
    [graph.edges, visibleRealNodeIdSet],
  );

  const activePreviewNodeId =
    focusedNodeId && !isCollapsedNodeId(focusedNodeId)
      ? focusedNodeId
      : hoverPreviewNodeId && visibleRealNodeIdSet.has(hoverPreviewNodeId)
        ? hoverPreviewNodeId
        : null;
  const activeDepthMap = focusedNodeId ? focusDepthMap : hoverDepthMap;
  const hoveredPatternNodeId =
    hoveredNodeId && !isCollapsedNodeId(hoveredNodeId) && visibleRealNodeIdSet.has(hoveredNodeId) ? hoveredNodeId : null;
  const hoveredPatternPaths = useMemo(
    () => (hoveredPatternNodeId ? patternModel.pathsByNodeId.get(hoveredPatternNodeId) ?? [] : []),
    [hoveredPatternNodeId, patternModel],
  );
  const activePatternPaths = hoveredPatternPaths.length > 0 ? hoveredPatternPaths : patternModel.topPaths;
  const activePatternPathIdSet = useMemo(() => new Set(activePatternPaths.map((path) => path.id)), [activePatternPaths]);

  const highlightedNodeIds = useMemo(() => {
    if (focusedNodeId) {
      return new Set(focusDepthMap.keys());
    }

    if (hoverPreviewNodeId && hoverDepthMap.size > 0) {
      return new Set(hoverDepthMap.keys());
    }

    return new Set<string>();
  }, [focusDepthMap, focusedNodeId, hoverDepthMap, hoverPreviewNodeId]);

  const realNodeSignalMap = useMemo(() => {
    const rawWeightMap = new Map<string, number>();

    filteredNodes.forEach((node) => {
      rawWeightMap.set(
        node.id,
        computeCognitiveWeight(
          {
            frequency: node.frequency,
            lastSeenAt: node.lastSeenAt,
            intensity: node.importance,
          },
          nodeFrequencyBounds,
          nodeIntensityBounds,
        ).raw,
      );
    });

    const nodeWeightBounds = resolveNumericBounds(Array.from(rawWeightMap.values()), 0.5);
    const next = new Map<
      string,
      {
        width: number;
        height: number;
        cognitiveWeight: number;
        positionInfluence: number;
        glowOpacity: number;
        glowBlur: number;
        glowSpread: number;
        isDominantWeight: boolean;
        recencyOpacity: number;
        lastSeenLabel: string;
      }
    >();

    filteredNodes.forEach((node) => {
      const cognitiveWeight = rawWeightMap.get(node.id) ?? 0.5;
      const size = scaleNodeSize(cognitiveWeight, nodeWeightBounds);
      const glow = scaleNodeGlow(cognitiveWeight, nodeWeightBounds);

      next.set(node.id, {
        width: size.width,
        height: size.height,
        cognitiveWeight: size.normalized,
        positionInfluence: scaleNodePositionInfluence(cognitiveWeight, nodeWeightBounds),
        glowOpacity: glow.opacity,
        glowBlur: glow.blur,
        glowSpread: glow.spread,
        isDominantWeight: glow.isDominantWeight,
        recencyOpacity: scaleRecencyOpacity(node.lastSeenAt, 0.42, 1),
        lastSeenLabel: formatLastSeenLabel(node.lastSeenAt),
      });
    });

    return next;
  }, [filteredNodes, nodeFrequencyBounds, nodeIntensityBounds]);

  const nodeSignalMap = useMemo(() => {
    const next = new Map<
      string,
      {
        width: number;
        height: number;
        cognitiveWeight: number;
        positionInfluence: number;
        glowOpacity: number;
        glowBlur: number;
        glowSpread: number;
        isDominantWeight: boolean;
        recencyOpacity: number;
        lastSeenLabel: string;
      }
    >();

    displayNodes.forEach((node) => {
      if (node.isCollapsedGroup) {
        next.set(node.id, {
          width: 194,
          height: 88,
          cognitiveWeight: 0.3,
          positionInfluence: 0,
          glowOpacity: 0,
          glowBlur: 18,
          glowSpread: 0,
          isDominantWeight: false,
          recencyOpacity: scaleRecencyOpacity(node.lastSeenAt, 0.68, 0.94),
          lastSeenLabel: formatLastSeenLabel(node.lastSeenAt),
        });
        return;
      }

      const realSignal = realNodeSignalMap.get(node.id);

      next.set(node.id, {
        width: realSignal?.width ?? 220,
        height: realSignal?.height ?? 90,
        cognitiveWeight: realSignal?.cognitiveWeight ?? 0.5,
        positionInfluence: realSignal?.positionInfluence ?? 0,
        glowOpacity: realSignal?.glowOpacity ?? 0,
        glowBlur: realSignal?.glowBlur ?? 18,
        glowSpread: realSignal?.glowSpread ?? 0,
        isDominantWeight: realSignal?.isDominantWeight ?? false,
        recencyOpacity: realSignal?.recencyOpacity ?? 1,
        lastSeenLabel: realSignal?.lastSeenLabel ?? 'last seen recently',
      });
    });

    return next;
  }, [displayNodes, realNodeSignalMap]);

  const dimensionMap = useMemo(() => {
    const next = new Map<string, { width: number; height: number }>();

    nodeSignalMap.forEach((signal, nodeId) => {
      next.set(nodeId, { width: signal.width, height: signal.height });
    });

    return next;
  }, [nodeSignalMap]);
  const realDimensionMap = useMemo(() => {
    const next = new Map<string, { width: number; height: number }>();

    realNodeSignalMap.forEach((signal, nodeId) => {
      next.set(nodeId, { width: signal.width, height: signal.height });
    });

    return next;
  }, [realNodeSignalMap]);
  const realPositionInfluenceMap = useMemo(() => {
    const next = new Map<string, number>();

    realNodeSignalMap.forEach((signal, nodeId) => {
      next.set(nodeId, signal.positionInfluence);
    });

    return next;
  }, [realNodeSignalMap]);
  const realBasePositions = useMemo(
    () => layoutNodes(filteredNodes, realDimensionMap, realPositionInfluenceMap),
    [filteredNodes, realDimensionMap, realPositionInfluenceMap],
  );
  const collapsedNodesOnly = useMemo(() => displayNodes.filter((node) => node.isCollapsedGroup), [displayNodes]);
  const collapsedDimensionMap = useMemo(() => {
    const next = new Map<string, { width: number; height: number }>();

    collapsedNodesOnly.forEach((node) => {
      next.set(node.id, { width: 194, height: 88 });
    });

    return next;
  }, [collapsedNodesOnly]);
  const collapsedBasePositions = useMemo(
    () => layoutNodes(collapsedNodesOnly, collapsedDimensionMap),
    [collapsedDimensionMap, collapsedNodesOnly],
  );

  const positions = useMemo(() => {
    const next = new Map<string, { x: number; y: number }>();

    displayNodes.forEach((node) => {
      const basePosition = node.isCollapsedGroup ? collapsedBasePositions.get(node.id) : realBasePositions.get(node.id);
      next.set(node.id, basePosition ?? { x: COLUMN_X[node.kind], y: 120 });
    });

    return next;
  }, [collapsedBasePositions, displayNodes, realBasePositions]);

  const flowNodes = useMemo<Node<RelationshipMapFlowNodeData>[]>(
    () =>
      displayNodes.map((node) => ({
        id: node.id,
        type: 'relationshipMapNode',
        position: positions.get(node.id) ?? { x: 0, y: 0 },
        draggable: false,
        selectable: false,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          ...(nodeSignalMap.get(node.id) ?? {
            width: 220,
            height: 90,
            cognitiveWeight: 0.5,
            positionInfluence: 0,
            glowOpacity: 0,
            glowBlur: 18,
            glowSpread: 0,
            isDominantWeight: false,
            recencyOpacity: 1,
            lastSeenLabel: 'last seen recently',
          }),
          label: node.label,
          kind: node.kind,
          subtype: node.subtype,
          frequency: node.frequency,
          lastSeenAt: node.lastSeenAt,
          connectionCount: node.connectedNodeIds.length,
          cognitiveWeight: nodeSignalMap.get(node.id)?.cognitiveWeight ?? 0.5,
          focusDistance: activeDepthMap.get(node.id) ?? null,
          focusStrength:
            focusedNodeId && activeDepthMap.has(node.id)
              ? 1 - (activeDepthMap.get(node.id) ?? 0) / (normalizedFocusDepth + 1.2)
              : hoveredNodeId && activeDepthMap.has(node.id)
                ? 0.88 - (activeDepthMap.get(node.id) ?? 0) * 0.16
                : 0,
          isHovered: hoveredNodeId === node.id,
          isDimmed: activePreviewNodeId ? !highlightedNodeIds.has(node.id) : false,
          isHighlighted: activePreviewNodeId ? highlightedNodeIds.has(node.id) && focusedNodeId !== node.id : false,
          isSelected: false,
          isFocused: focusedNodeId === node.id,
          isDominantWeight: nodeSignalMap.get(node.id)?.isDominantWeight ?? false,
          isCollapsedGroup: node.isCollapsedGroup,
          collapsedCount: node.collapsedCount,
          collapsedHint: node.collapsedHint,
        },
      })),
    [activeDepthMap, activePreviewNodeId, displayNodes, focusedNodeId, highlightedNodeIds, hoveredNodeId, nodeSignalMap, normalizedFocusDepth, positions],
  );

  const flowEdges = useMemo<RelationshipMapFlowEdge[]>(
    () =>
      visibleEdges.map((edge) => {
        const isHighlighted = activePreviewNodeId
          ? highlightedNodeIds.has(edge.source) && highlightedNodeIds.has(edge.target)
          : true;
        const isPrimaryEdge = focusedNodeId
          ? edge.source === focusedNodeId || edge.target === focusedNodeId
          : hoveredNodeId
            ? edge.source === hoveredNodeId || edge.target === hoveredNodeId
            : false;
        const recencyOpacity = scaleRecencyOpacity(edge.lastSeenAt, 0.16, 0.88);
        const confidenceOpacity = scaleEdgeConfidence(edge.confidence, 1);
        const strokeWidth = scaleEdgeStrength(edge.weight, edgeWeightBounds);
        const sourceDepth = activeDepthMap.get(edge.source);
        const targetDepth = activeDepthMap.get(edge.target);
        const edgeDepth = sourceDepth == null || targetDepth == null ? null : Math.max(sourceDepth, targetDepth);
        const allPathsForEdge = patternModel.pathsByEdgeId.get(edge.id) ?? [];
        const activePathsForEdge = allPathsForEdge.filter((path) => activePatternPathIdSet.has(path.id));
        const activeTopPathsForEdge = activePathsForEdge.filter((path) => patternModel.topPathIds.has(path.id));
        const maxTopPathFrequency = activeTopPathsForEdge.reduce(
          (currentMax, path) => Math.max(currentMax, path.frequency),
          0,
        );
        const patternStrength = activeTopPathsForEdge.length > 0
          ? normalizeWeight(
              maxTopPathFrequency,
              patternModel.topPathFrequencyBounds.min,
              patternModel.topPathFrequencyBounds.max,
              0.6,
            )
          : activePathsForEdge.length > 0
            ? 0.36
            : 0;
        const ambientEdgeOpacity = recencyOpacity * confidenceOpacity;
        const relationFactor = focusedNodeId
          ? edgeDepth == null
            ? 0.16
            : 1 - edgeDepth / (normalizedFocusDepth + 1.8)
          : activePreviewNodeId
            ? isHighlighted
              ? 1
              : 0.26
            : 1;
        const patternFactor = hoveredPatternPaths.length > 0
          ? activePathsForEdge.length > 0
            ? activeTopPathsForEdge.length > 0
              ? 1.08
              : 0.84
            : allPathsForEdge.length > 0
              ? 0.18
              : 0.12
          : activeTopPathsForEdge.length > 0
            ? 1.06
            : allPathsForEdge.length > 0
              ? 0.28
              : 0.15;
        const visibleOpacity = ambientEdgeOpacity * relationFactor * patternFactor;
        const glowOpacity = activeTopPathsForEdge.length > 0
          ? 0.18 + patternStrength * 0.16
          : activePathsForEdge.length > 0
            ? 0.08 + patternStrength * 0.08
            : allPathsForEdge.length > 0
              ? 0.03
              : 0;
        const depthWidthBoost = focusedNodeId && edgeDepth != null ? Math.max(0.05, 0.48 - edgeDepth * 0.12) : 0;
        const patternWidthBoost = activeTopPathsForEdge.length > 0
          ? 0.24 + patternStrength * 0.85
          : activePathsForEdge.length > 0
            ? 0.2
            : 0;
        const finalStrokeWidth =
          strokeWidth + (isPrimaryEdge ? 0.55 : 0) + patternWidthBoost + depthWidthBoost;
        const strokeColor =
          isHighlighted || activePathsForEdge.length > 0
            ? EDGE_STROKES.active
            : allPathsForEdge.length > 0
              ? EDGE_STROKES.default
              : EDGE_STROKES.muted;
        const markerColor =
          isHighlighted || activePathsForEdge.length > 0 ? EDGE_STROKES.active : EDGE_STROKES.default;

        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: 'relationshipMapEdge',
          animated: false,
          selectable: false,
          data: {
            strokeColor,
            strokeWidth: finalStrokeWidth,
            opacity: visibleOpacity,
            strokeDasharray: edge.relation === 'state-entity' || edge.relation === 'context-entity' ? '7 5' : undefined,
            glowColor: EDGE_STROKES.glow,
            glowWidth: finalStrokeWidth + (activeTopPathsForEdge.length > 0 ? 4.4 + patternStrength * 1.8 : activePathsForEdge.length > 0 ? 3 : 0),
            glowOpacity,
            isPulsing: activeTopPathsForEdge.length > 0,
            pulseDuration: 4.6 - patternStrength * 1.4,
            pulseOpacity: Math.min(glowOpacity + 0.08, 0.52),
          } satisfies RelationshipMapFlowEdgeData,
          style: {
            opacity: visibleOpacity,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
            color: markerColor,
          },
        };
      }),
    [
      activePatternPathIdSet,
      activeDepthMap,
      activePreviewNodeId,
      edgeWeightBounds,
      focusedNodeId,
      highlightedNodeIds,
      hoveredNodeId,
      hoveredPatternPaths.length,
      normalizedFocusDepth,
      patternModel.pathsByEdgeId,
      patternModel.topPathFrequencyBounds.max,
      patternModel.topPathFrequencyBounds.min,
      patternModel.topPathIds,
      visibleEdges,
    ],
  );

  const toggleActivities = () => startTransition(() => setFilters((current) => ({ ...current, activities: !current.activities })));
  const toggleStates = () => startTransition(() => setFilters((current) => ({ ...current, states: !current.states })));
  const toggleEntityType = (type: EntityType) =>
    startTransition(() =>
      setFilters((current) => ({ ...current, entityTypes: { ...current.entityTypes, [type]: !current.entityTypes[type] } })),
    );
  const toggleContextType = (type: ContextGroup) =>
    startTransition(() =>
      setFilters((current) => ({ ...current, contextTypes: { ...current.contextTypes, [type]: !current.contextTypes[type] } })),
    );

  const clearMeaningFocus = () =>
    startTransition(() => {
      setHoveredNodeId(null);
      setHoverPreviewNodeId(null);
      setFocusedNodeId(null);
      setActiveQuestionId(null);
    });

  const resetLens = () =>
    startTransition(() => {
      setFilters(createDefaultFilters());
      setHoveredNodeId(null);
      setHoverPreviewNodeId(null);
      setFocusedNodeId(null);
      setActiveQuestionId(null);
    });

  const handleQuestionClick = (question: RelationshipQuestionViewModel) =>
    startTransition(() => {
      if (activeQuestionId === question.id) {
        setActiveQuestionId(null);
        setFocusedNodeId(null);
        setHoveredNodeId(null);
        setHoverPreviewNodeId(null);
        return;
      }

      setFilters(createQuestionFilters(question.id));
      setActiveQuestionId(question.id);
      setFocusedNodeId(question.targetNodeId);
      setHoveredNodeId(null);
      setHoverPreviewNodeId(null);
    });

  const sidebarBase = {
    borderRadius: '28px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'linear-gradient(180deg, rgba(20, 41, 38, 0.72), rgba(12, 27, 28, 0.6))',
    backdropFilter: 'blur(24px)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '14px',
  };

  useEffect(() => {
    const flowInstance = flowInstanceRef.current;

    if (!flowInstance?.viewportInitialized) {
      return;
    }

    if (focusedNodeId) {
      const position = positions.get(focusedNodeId);
      const nodeDimensions = dimensionMap.get(focusedNodeId);

      if (!position || !nodeDimensions) {
        return;
      }

      const nextZoom = Math.min(1.02, Math.max(flowInstance.getZoom(), 0.82));
      lastViewportFocusRef.current = focusedNodeId;

      void flowInstance.setCenter(position.x + nodeDimensions.width / 2, position.y + nodeDimensions.height / 2, {
        zoom: nextZoom,
        duration: 520,
        ease: easeOutCubic,
        interpolate: 'smooth',
      });

      return;
    }

    if (lastViewportFocusRef.current) {
      lastViewportFocusRef.current = null;

      void flowInstance.fitView({
        nodes: flowNodes.map((node) => ({ id: node.id })),
        padding: 0.18,
        minZoom: 0.64,
        duration: 520,
        ease: easeOutCubic,
        interpolate: 'smooth',
      });
    }
  }, [dimensionMap, flowNodes, focusedNodeId, positions]);

  return (
    <div style={{ display: 'grid', gap: '14px' }}>
      <section
        style={{
          borderRadius: '28px',
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'linear-gradient(180deg, rgba(24,48,42,0.8), rgba(14,30,30,0.68))',
          boxShadow: '0 20px 60px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.05)',
          padding: '1.35rem',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ maxWidth: '44rem' }}>
              <Eyebrow>Ask</Eyebrow>
              <h3
                style={{
                  marginTop: '0.45rem',
                  fontFamily: 'var(--font-display)',
                  fontSize: '2rem',
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  color: 'white',
                }}
              >
                Ask the graph what affects you
              </h3>
              <p style={{ marginTop: '0.6rem', fontSize: '0.88rem', lineHeight: 1.75, color: 'rgba(255,255,255,0.42)' }}>
                The graph starts folded. Click a question or a node and only the related boxes open in front of it, while the rest stay collapsed by lane.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', minWidth: '17rem' }}>
              {[
                { label: 'Visible', value: displayNodes.length, sub: 'boxes in view' },
                { label: 'Edges', value: visibleEdges.length, sub: 'live links' },
                { label: 'Focus', value: focusedNodeId ? 'Open' : 'Folded', sub: focusedNodeId ? 'related boxes expanded' : 'collapsed lanes' },
                { label: 'Questions', value: meaningModel.questions.length, sub: 'guided prompts' },
              ].map(({ label, value, sub }) => (
                <div
                  key={label}
                  style={{
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.07)',
                    background: 'rgba(255,255,255,0.03)',
                    padding: '12px 13px',
                  }}
                >
                  <p style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)' }}>
                    {label}
                  </p>
                  <p style={{ marginTop: '7px', fontSize: '1.15rem', fontWeight: 700, color: 'white' }}>{value}</p>
                  <p style={{ marginTop: '3px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.28)' }}>{sub}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {meaningModel.questions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                active={activeQuestionId === question.id}
                disabled={!question.targetNodeId}
                onClick={() => handleQuestionClick(question)}
              />
            ))}
          </div>
        </div>
      </section>

      <div style={{ display: 'grid', gap: '14px', gridTemplateColumns: 'minmax(0, 24rem) minmax(0, 1fr)' }}>
        <aside style={sidebarBase}>
          <SideSection>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <Eyebrow>Focus Mode</Eyebrow>
                <p style={{ marginTop: '8px', fontSize: '1.02rem', fontWeight: 600, color: 'white' }}>
                  {focusedNode ? focusedNode.label : 'All lanes are folded'}
                </p>
                <p style={{ marginTop: '6px', fontSize: '0.8rem', lineHeight: 1.65, color: 'rgba(255,255,255,0.4)' }}>
                  {activeQuestion
                    ? `Answering: ${activeQuestion.label}`
                    : focusedNode
                      ? `${labelForKind(focusedNode)} selected. Only the related boxes are expanded and the rest of the graph stays folded into lane summaries.`
                      : 'The default view stays compact. Click any visible node and only its related states, context, and entities will unfold ahead of it.'}
                </p>
              </div>
              {(focusedNodeId || activeQuestionId) ? (
                <button
                  type="button"
                  onClick={clearMeaningFocus}
                  style={{
                    borderRadius: '999px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.03)',
                    color: 'rgba(255,255,255,0.55)',
                    padding: '5px 11px',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Clear focus
                </button>
              ) : null}
            </div>
          </SideSection>

          {activeInsight && focusedNode ? (
            <>
              <SideSection>
                <Eyebrow>{activeInsight.kicker}</Eyebrow>
                <h3 style={{ marginTop: '10px', fontSize: '1.3rem', fontWeight: 600, color: 'white' }}>{activeInsight.title}</h3>
                <p style={{ marginTop: '10px', fontSize: '0.84rem', lineHeight: 1.75, color: 'rgba(255,255,255,0.5)' }}>
                  {activeInsight.summary}
                </p>
              </SideSection>

              <SideSection>
                <DriverList
                  title={primarySectionTitle(focusedNode)}
                  drivers={activeInsight.primaryDrivers}
                  emptyLabel="Not enough strong contributors are visible in the current lens yet."
                />
              </SideSection>

              <SideSection>
                <DriverList
                  title={secondarySectionTitle(focusedNode)}
                  drivers={activeInsight.secondaryDrivers}
                  emptyLabel="The surrounding signals are still too sparse to interpret."
                />
              </SideSection>

              <SideSection>
                <PatternList
                  patterns={activeInsight.patterns}
                  emptyLabel="No strong directional pattern stands out yet for this node."
                />
              </SideSection>

              <SideSection>
                <SectionTitle>All related data</SectionTitle>
                <p style={{ marginBottom: '12px', fontSize: '0.78rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.36)' }}>
                  Everything connected to this focus is grouped below so context, entities, and other signals stay visible without turning into one long column.
                </p>
                <div
                  style={{
                    display: 'grid',
                    gap: '10px',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    maxHeight: '470px',
                    overflowY: 'auto',
                    paddingRight: '4px',
                  }}
                >
                  {activeInsight.connectionGroups.map((group) => (
                    <SignalGroupCard key={group.id} group={group} />
                  ))}
                </div>
              </SideSection>
            </>
          ) : (
            <>
              <SideSection>
                <Eyebrow>Interpretation Layer</Eyebrow>
                <h3 style={{ marginTop: '10px', fontSize: '1.25rem', fontWeight: 600, color: 'white' }}>{meaningModel.overview.title}</h3>
                <p style={{ marginTop: '10px', fontSize: '0.84rem', lineHeight: 1.75, color: 'rgba(255,255,255,0.5)' }}>
                  {meaningModel.overview.summary}
                </p>
              </SideSection>

              <SideSection>
                <DriverList
                  title="Top positive influencers"
                  drivers={meaningModel.overview.topPositiveInfluencers}
                  emptyLabel="Positive influence patterns will appear here once the graph has stronger confidence signals."
                />
              </SideSection>

              <SideSection>
                <DriverList
                  title="Top negative patterns"
                  drivers={meaningModel.overview.topNegativePatterns}
                  emptyLabel="Negative loops will appear here once the graph has stronger uncertainty or friction signals."
                />
              </SideSection>
            </>
          )}

          <SideSection>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
              <SectionTitle>Graph lens</SectionTitle>
              <button
                type="button"
                onClick={resetLens}
                style={{
                  border: 'none',
                  background: 'none',
                  color: 'rgba(255,255,255,0.34)',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Reset lens
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              <FilterToggle label="Activities" active={filters.activities} onClick={toggleActivities} />
              <FilterToggle label="States" active={filters.states} onClick={toggleStates} />
            </div>
            <Eyebrow>
              <span style={{ display: 'block', marginTop: '14px' }}>Entity types</span>
            </Eyebrow>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
              {ENTITY_TYPES.map((type) => (
                <FilterToggle key={type} label={type} active={filters.entityTypes[type]} onClick={() => toggleEntityType(type)} />
              ))}
            </div>
            <Eyebrow>
              <span style={{ display: 'block', marginTop: '14px' }}>Context types</span>
            </Eyebrow>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
              {CONTEXT_GROUPS.map((type) => (
                <FilterToggle key={type} label={type} active={filters.contextTypes[type]} onClick={() => toggleContextType(type)} />
              ))}
            </div>
          </SideSection>
        </aside>

        <section
          style={{
            borderRadius: '28px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'linear-gradient(180deg, rgba(20, 41, 38, 0.72), rgba(12, 27, 28, 0.6))',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              padding: '14px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <Eyebrow>{focusedNode ? 'Focused reading' : 'Meaning-first graph'}</Eyebrow>
              <h3 style={{ marginTop: '3px', fontSize: '1rem', fontWeight: 600, color: 'white' }}>
                {focusedNode ? `${focusedNode.label} in focus` : 'Folded by default'}
              </h3>
              <p style={{ marginTop: '4px', fontSize: '0.76rem', lineHeight: 1.55, color: 'rgba(255,255,255,0.34)' }}>
                {focusedNode
                  ? 'Only the related boxes are unfolded. Hidden data stays visible as folded lane summaries so you keep context without a huge wall of nodes.'
                  : 'Activities stay visible as entry points. States, context, and entities remain folded until a related node opens them.'}
              </p>
            </div>

            <div style={{ textAlign: 'right', fontSize: '0.72rem', color: 'rgba(255,255,255,0.28)' }}>
              <p>{displayNodes.length} visible boxes</p>
              <p>{visibleEdges.length} visible edges</p>
            </div>
          </div>

          <div
            style={{ height: '820px', opacity: isPending ? 0.74 : 1, transition: 'opacity 0.25s' }}
            onMouseLeave={() => {
              if (focusedNodeId) return;

              setHoveredNodeId(null);
              setHoverPreviewNodeId(null);
            }}
          >
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onInit={(instance) => {
                flowInstanceRef.current = instance;
              }}
              fitView
              fitViewOptions={{ padding: 0.18, minZoom: 0.64 }}
              minZoom={0.48}
              maxZoom={1.7}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              selectNodesOnDrag={false}
              onlyRenderVisibleElements
              onNodeClick={(_, node) => {
                if (isCollapsedNodeId(node.id)) return;
                startTransition(() => {
                  setActiveQuestionId(null);
                  setHoverPreviewNodeId(null);
                  setFocusedNodeId((current) => (current === node.id ? null : node.id));
                  setHoveredNodeId(null);
                });
              }}
              onNodeMouseEnter={(_, node) => {
                if (focusedNodeId) return;

                setHoveredNodeId(node.id);

                if (isCollapsedNodeId(node.id)) {
                  return;
                }

                setHoverPreviewNodeId((current) => {
                  if (!current) {
                    return node.id;
                  }

                  if (current === node.id) {
                    return current;
                  }

                  return hoverPreviewNodeIds.has(node.id) ? current : node.id;
                });
              }}
              onNodeMouseLeave={(_, node) => {
                if (focusedNodeId) return;

                setHoveredNodeId((current) => (current === node.id ? null : current));
              }}
              onPaneClick={() =>
                startTransition(() => {
                  setHoveredNodeId(null);
                  setHoverPreviewNodeId(null);
                  setFocusedNodeId(null);
                  setActiveQuestionId(null);
                })
              }
              defaultEdgeOptions={{ animated: false, style: { stroke: EDGE_STROKES.default } }}
            >
              <MiniMap
                pannable
                zoomable
                nodeColor={(node) => NODE_COLOR[(node.data as RelationshipMapFlowNodeData).kind]}
                maskColor="rgba(5,12,18,0.75)"
                bgColor="rgba(5,14,20,0.88)"
                style={{
                  background: 'rgba(5,14,20,0.85)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '12px',
                }}
              />
              <Controls
                showInteractive={false}
                style={{
                  background: 'rgba(5,14,20,0.85)',
                  borderColor: 'rgba(255,255,255,0.07)',
                  borderRadius: '10px',
                }}
              />
              <Background color="rgba(148,163,184,0.12)" gap={24} size={1} />
            </ReactFlow>
          </div>
        </section>
      </div>
    </div>
  );
};
