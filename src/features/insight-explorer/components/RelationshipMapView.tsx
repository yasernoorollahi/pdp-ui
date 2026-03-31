import { memo, useMemo, useState, useTransition } from 'react';
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  CONTEXT_GROUPS,
  ENTITY_TYPES,
  type ContextGroup,
  type EntityType,
  type RelationshipMapNodeViewModel,
  type RelationshipMapViewModel,
} from '../types';
import { RelationshipMapNode, type RelationshipMapFlowNodeData } from './RelationshipMapNode';

type RelationshipMapFilters = {
  activities: boolean;
  states: boolean;
  entityTypes: Record<EntityType, boolean>;
  contextTypes: Record<ContextGroup, boolean>;
};

const DEFAULT_FILTERS: RelationshipMapFilters = {
  activities: true,
  states: true,
  entityTypes: { PERSON: true, LOCATION: true, TOOL: true, PROJECT: true },
  contextTypes: { LIKE: true, DISLIKE: true, CONSTRAINT: true },
};

const PEOPLE_PRESET: RelationshipMapFilters = {
  activities: true,
  states: false,
  entityTypes: { PERSON: true, LOCATION: false, TOOL: false, PROJECT: false },
  contextTypes: { LIKE: false, DISLIKE: false, CONSTRAINT: false },
};

const DISLIKE_PRESET: RelationshipMapFilters = {
  activities: true,
  states: false,
  entityTypes: { PERSON: false, LOCATION: false, TOOL: false, PROJECT: false },
  contextTypes: { LIKE: false, DISLIKE: true, CONSTRAINT: false },
};

const nodeTypes = { relationshipMapNode: RelationshipMapNode };

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
  active: 'rgba(240, 249, 255, 0.78)',
  default: 'rgba(148, 163, 184, 0.3)',
  muted: 'rgba(71, 85, 105, 0.18)',
} as const;

const scaleBetween = (value: number, minValue: number, maxValue: number, outputMin: number, outputMax: number) => {
  if (maxValue <= minValue) return (outputMin + outputMax) / 2;
  return outputMin + ((value - minValue) / (maxValue - minValue)) * (outputMax - outputMin);
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
  graph.nodes.forEach((node) => { adjacency.set(node.id, node.connectedNodeIds); });
  return adjacency;
};

const layoutNodes = (nodes: RelationshipMapNodeViewModel[], dimensions: Map<string, { width: number; height: number }>) => {
  const positions = new Map<string, { x: number; y: number }>();
  (['activity', 'state', 'context', 'entity'] as const).forEach((kind) => {
    const columnNodes = nodes
      .filter((node) => node.kind === kind)
      .sort((l, r) =>
        r.importance - l.importance ||
        String(l.subtype ?? '').localeCompare(String(r.subtype ?? '')) ||
        l.label.localeCompare(r.label),
      );
    const totalHeight = columnNodes.reduce((sum, node, index) => {
      const current = dimensions.get(node.id);
      return sum + (current?.height ?? 88) + (index === columnNodes.length - 1 ? 0 : 34);
    }, 0);
    let currentY = Math.max(42, 420 - totalHeight / 2);
    columnNodes.forEach((node) => {
      positions.set(node.id, { x: COLUMN_X[kind], y: currentY });
      currentY += (dimensions.get(node.id)?.height ?? 88) + 34;
    });
  });
  return positions;
};

// ── Filter toggle button ──
const FilterToggle = memo(({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      borderRadius: '100px',
      border: active ? '1px solid rgba(94,234,212,0.3)' : '1px solid rgba(255,255,255,0.08)',
      background: active ? 'rgba(45,212,191,0.08)' : 'rgba(255,255,255,0.03)',
      padding: '5px 12px',
      fontSize: '0.72rem',
      fontWeight: active ? 600 : 400,
      letterSpacing: '0.16em',
      textTransform: 'uppercase' as const,
      color: active ? 'rgba(94,234,212,0.9)' : 'rgba(255,255,255,0.42)',
      cursor: 'pointer',
      transition: 'all 0.18s',
    }}
  >
    {label}
  </button>
));
FilterToggle.displayName = 'FilterToggle';

// ── Sidebar section card ──
const SideSection = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    borderRadius: '18px',
    border: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.025)',
    padding: '14px',
  }}>
    {children}
  </div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'white', marginBottom: '10px' }}>{children}</p>
);

const SectionMeta = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.24)', marginTop: '10px', marginBottom: '8px' }}>
    {children}
  </p>
);

const labelForKind = (node: RelationshipMapNodeViewModel | null) => {
  if (!node) return 'None';
  return node.kind.charAt(0).toUpperCase() + node.kind.slice(1);
};

export const RelationshipMapView = ({ graph }: { graph: RelationshipMapViewModel }) => {
  const [filters, setFilters] = useState<RelationshipMapFilters>(DEFAULT_FILTERS);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const adjacency = useMemo(() => createAdjacencyMap(graph), [graph]);
  const activePreviewNodeId = focusNodeId ?? selectedNodeId ?? hoveredNodeId;

  const highlightedNodeIds = useMemo(() => {
    if (!activePreviewNodeId) return new Set<string>();
    return new Set([activePreviewNodeId, ...(adjacency.get(activePreviewNodeId) ?? [])]);
  }, [activePreviewNodeId, adjacency]);

  const filteredNodes = useMemo(() => graph.nodes.filter((n) => isNodeVisible(n, filters)), [filters, graph.nodes]);
  const filteredNodeIdSet = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  const visibleNodeIdSet = useMemo(() => {
    if (!focusNodeId || !filteredNodeIdSet.has(focusNodeId)) return filteredNodeIdSet;
    const focusedIds = new Set<string>([focusNodeId, ...(adjacency.get(focusNodeId) ?? [])]);
    return new Set(Array.from(filteredNodeIdSet).filter((id) => focusedIds.has(id)));
  }, [adjacency, filteredNodeIdSet, focusNodeId]);

  const visibleNodes = useMemo(() => filteredNodes.filter((n) => visibleNodeIdSet.has(n.id)), [filteredNodes, visibleNodeIdSet]);
  const visibleEdges = useMemo(() => graph.edges.filter((e) => visibleNodeIdSet.has(e.source) && visibleNodeIdSet.has(e.target)), [graph.edges, visibleNodeIdSet]);

  const dimensionMap = useMemo(() => {
    const maxI = Math.max(...visibleNodes.map((n) => n.importance), 1);
    const minI = Math.min(...visibleNodes.map((n) => n.importance), maxI);
    const map = new Map<string, { width: number; height: number }>();
    visibleNodes.forEach((node) => {
      map.set(node.id, {
        width: Math.round(scaleBetween(node.importance, minI, maxI, 198, 272)),
        height: Math.round(scaleBetween(node.importance, minI, maxI, 84, 108)),
      });
    });
    return map;
  }, [visibleNodes]);

  const positions = useMemo(() => layoutNodes(visibleNodes, dimensionMap), [dimensionMap, visibleNodes]);

  const flowNodes = useMemo<Node<RelationshipMapFlowNodeData>[]>(
    () => visibleNodes.map((node) => ({
      id: node.id,
      type: 'relationshipMapNode',
      position: positions.get(node.id) ?? { x: 0, y: 0 },
      draggable: false,
      selectable: false,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        label: node.label,
        kind: node.kind,
        subtype: node.subtype,
        frequency: node.frequency,
        connectionCount: node.connectedNodeIds.length,
        width: dimensionMap.get(node.id)?.width ?? 220,
        height: dimensionMap.get(node.id)?.height ?? 90,
        isDimmed: activePreviewNodeId ? !highlightedNodeIds.has(node.id) : false,
        isHighlighted: activePreviewNodeId ? highlightedNodeIds.has(node.id) : false,
        isSelected: selectedNodeId === node.id,
        isFocused: focusNodeId === node.id,
      },
    })),
    [activePreviewNodeId, dimensionMap, focusNodeId, highlightedNodeIds, positions, selectedNodeId, visibleNodes],
  );

  const flowEdges = useMemo<Edge[]>(
    () => visibleEdges.map((edge) => {
      const isHighlighted = activePreviewNodeId
        ? highlightedNodeIds.has(edge.source) && highlightedNodeIds.has(edge.target)
        : true;
      const isSelectedEdge = selectedNodeId ? edge.source === selectedNodeId || edge.target === selectedNodeId : false;
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        animated: isSelectedEdge,
        selectable: false,
        style: {
          stroke: isHighlighted ? EDGE_STROKES.active : EDGE_STROKES.muted,
          strokeWidth: isSelectedEdge ? 2.5 : isHighlighted ? 1.8 : 1,
          opacity: activePreviewNodeId ? (isHighlighted ? 1 : 0.36) : 0.78,
          strokeDasharray: edge.relation === 'state-entity' || edge.relation === 'context-entity' ? '7 5' : undefined,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: isHighlighted ? EDGE_STROKES.active : EDGE_STROKES.default,
        },
      };
    }),
    [activePreviewNodeId, highlightedNodeIds, selectedNodeId, visibleEdges],
  );

  const selectedNode = useMemo(() => graph.nodes.find((n) => n.id === selectedNodeId) ?? null, [graph.nodes, selectedNodeId]);

  const toggleActivities = () => startTransition(() => setFilters((c) => ({ ...c, activities: !c.activities })));
  const toggleStates = () => startTransition(() => setFilters((c) => ({ ...c, states: !c.states })));
  const toggleEntityType = (type: EntityType) => startTransition(() =>
    setFilters((c) => ({ ...c, entityTypes: { ...c.entityTypes, [type]: !c.entityTypes[type] } })));
  const toggleContextType = (type: ContextGroup) => startTransition(() =>
    setFilters((c) => ({ ...c, contextTypes: { ...c.contextTypes, [type]: !c.contextTypes[type] } })));
  const applyPreset = (preset: RelationshipMapFilters) => startTransition(() => { setFilters(preset); setFocusNodeId(null); });
  const clearInteraction = () => startTransition(() => { setHoveredNodeId(null); setSelectedNodeId(null); setFocusNodeId(null); });

  const sidebarBase = {
    borderRadius: '28px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(6, 14, 20, 0.82)',
    backdropFilter: 'blur(24px)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '14px',
  };

  return (
    <div style={{ display: 'grid', gap: '14px', gridTemplateColumns: 'minmax(0, 20rem) minmax(0, 1fr)' }}>
      {/* ── SIDEBAR ── */}
      <aside style={sidebarBase}>
        {/* Header */}
        <div>
          <p style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(94,234,212,0.45)' }}>
            Relationship Map
          </p>
          <h3 style={{ marginTop: '0.4rem', fontFamily: "'Instrument Serif', serif", fontSize: '1.5rem', color: 'white', fontWeight: 400 }}>
            Graph controls
          </h3>
          <p style={{ marginTop: '0.5rem', fontSize: '0.78rem', lineHeight: 1.65, color: 'rgba(255,255,255,0.32)' }}>
            Hover to preview connections, click to persist, focus to isolate a neighborhood.
          </p>
        </div>

        {/* Counts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {[
            { label: 'Visible', value: visibleNodes.length, sub: 'nodes' },
            { label: 'Edges', value: visibleEdges.length, sub: 'rendered' },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,255,255,0.03)',
              padding: '11px 13px',
            }}>
              <p style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)' }}>
                {label}
              </p>
              <p style={{ marginTop: '6px', fontSize: '1.4rem', fontWeight: 700, color: 'white', letterSpacing: '-0.01em' }}>
                {value}
              </p>
              <p style={{ marginTop: '2px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.28)' }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Presets */}
        <SideSection>
          <SectionTitle>Quick presets</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <FilterToggle label="All types" active={false} onClick={() => applyPreset(DEFAULT_FILTERS)} />
            <FilterToggle label="People" active={false} onClick={() => applyPreset(PEOPLE_PRESET)} />
            <FilterToggle label="Dislikes" active={false} onClick={() => applyPreset(DISLIKE_PRESET)} />
          </div>
        </SideSection>

        {/* Filters */}
        <SideSection>
          <SectionTitle>Filters</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <FilterToggle label="Activities" active={filters.activities} onClick={toggleActivities} />
            <FilterToggle label="States" active={filters.states} onClick={toggleStates} />
          </div>
          <SectionMeta>Entity types</SectionMeta>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {ENTITY_TYPES.map((type) => (
              <FilterToggle key={type} label={type} active={filters.entityTypes[type]} onClick={() => toggleEntityType(type)} />
            ))}
          </div>
          <SectionMeta>Context types</SectionMeta>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {CONTEXT_GROUPS.map((type) => (
              <FilterToggle key={type} label={type} active={filters.contextTypes[type]} onClick={() => toggleContextType(type)} />
            ))}
          </div>
        </SideSection>

        {/* Selection */}
        <SideSection>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <SectionTitle>Selection</SectionTitle>
            {(selectedNodeId || focusNodeId) ? (
              <button
                type="button"
                onClick={clearInteraction}
                style={{
                  fontSize: '0.72rem',
                  color: 'rgba(255,255,255,0.35)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Clear
              </button>
            ) : null}
          </div>

          {selectedNode ? (
            <>
              <div style={{
                borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(0,0,0,0.2)',
                padding: '12px',
                marginBottom: '10px',
              }}>
                <p style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)' }}>
                  {labelForKind(selectedNode)}
                </p>
                <p style={{ marginTop: '6px', fontSize: '0.95rem', fontWeight: 600, color: 'white' }}>{selectedNode.label}</p>
                {selectedNode.subtype ? (
                  <p style={{ marginTop: '3px', fontSize: '0.68rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
                    {String(selectedNode.subtype)}
                  </p>
                ) : null}
                <div style={{ marginTop: '10px', display: 'flex', gap: '16px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.42)' }}>
                  <span>{selectedNode.frequency}× freq</span>
                  <span>{selectedNode.connectedNodeIds.length} links</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <FilterToggle
                  label={focusNodeId === selectedNode.id ? 'Focused ✓' : 'Focus neighborhood'}
                  active={focusNodeId === selectedNode.id}
                  onClick={() => startTransition(() => setFocusNodeId((c) => (c === selectedNode.id ? null : selectedNode.id)))}
                />
                {focusNodeId ? (
                  <FilterToggle
                    label="Clear focus"
                    active={false}
                    onClick={() => startTransition(() => setFocusNodeId(null))}
                  />
                ) : null}
              </div>
            </>
          ) : (
            <p style={{ fontSize: '0.78rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.28)' }}>
              Click a node to lock its neighborhood, then use focus mode to isolate the local structure.
            </p>
          )}
        </SideSection>

        {/* Legend */}
        <SideSection>
          <SectionTitle>Legend</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {([
              ['activity', 'Activity'],
              ['entity', 'Entity'],
              ['state', 'Cognitive state'],
              ['context', 'Context'],
            ] as const).map(([kind, label]) => (
              <div key={kind} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: NODE_COLOR[kind], flexShrink: 0 }} />
                {label}
              </div>
            ))}
          </div>
        </SideSection>
      </aside>

      {/* ── GRAPH CANVAS ── */}
      <section style={{
        borderRadius: '28px',
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(6, 14, 20, 0.82)',
        backdropFilter: 'blur(24px)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          padding: '14px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div>
            <p style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)' }}>
              Relationship Graph
            </p>
            <h3 style={{ marginTop: '3px', fontSize: '1rem', fontWeight: 600, color: 'white' }}>
              Activities, entities, states &amp; context
            </h3>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.72rem', color: 'rgba(255,255,255,0.28)' }}>
            <p>{graph.summary.nodeCount} nodes</p>
            <p>{graph.summary.edgeCount} edges</p>
          </div>
        </div>

        <div style={{ height: '820px', opacity: isPending ? 0.72 : 1, transition: 'opacity 0.25s' }}>
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.16, minZoom: 0.55 }}
            minZoom={0.4}
            maxZoom={1.7}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            selectNodesOnDrag={false}
            onlyRenderVisibleElements
            onNodeClick={(_, node) => startTransition(() => setSelectedNodeId(node.id))}
            onNodeMouseEnter={(_, node) => setHoveredNodeId(node.id)}
            onNodeMouseLeave={(_, node) => setHoveredNodeId((c) => (c === node.id ? null : c))}
            onPaneClick={() => startTransition(() => { setHoveredNodeId(null); setSelectedNodeId(null); })}
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
  );
};
