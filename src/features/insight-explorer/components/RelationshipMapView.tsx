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
import { CONTEXT_GROUPS, ENTITY_TYPES, type ContextGroup, type EntityType, type RelationshipMapNodeViewModel, type RelationshipMapViewModel } from '../types';
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
  entityTypes: {
    PERSON: true,
    LOCATION: true,
    TOOL: true,
    PROJECT: true,
  },
  contextTypes: {
    LIKE: true,
    DISLIKE: true,
    CONSTRAINT: true,
  },
};

const PEOPLE_PRESET: RelationshipMapFilters = {
  activities: true,
  states: false,
  entityTypes: {
    PERSON: true,
    LOCATION: false,
    TOOL: false,
    PROJECT: false,
  },
  contextTypes: {
    LIKE: false,
    DISLIKE: false,
    CONSTRAINT: false,
  },
};

const DISLIKE_PRESET: RelationshipMapFilters = {
  activities: true,
  states: false,
  entityTypes: {
    PERSON: false,
    LOCATION: false,
    TOOL: false,
    PROJECT: false,
  },
  contextTypes: {
    LIKE: false,
    DISLIKE: true,
    CONSTRAINT: false,
  },
};

const nodeTypes = {
  relationshipMapNode: RelationshipMapNode,
};

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
  active: 'rgba(240, 249, 255, 0.84)',
  default: 'rgba(148, 163, 184, 0.36)',
  muted: 'rgba(71, 85, 105, 0.24)',
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

  graph.nodes.forEach((node) => {
    adjacency.set(node.id, node.connectedNodeIds);
  });

  return adjacency;
};

const layoutNodes = (nodes: RelationshipMapNodeViewModel[], dimensions: Map<string, { width: number; height: number }>) => {
  const positions = new Map<string, { x: number; y: number }>();

  (['activity', 'state', 'context', 'entity'] as const).forEach((kind) => {
    const columnNodes = nodes
      .filter((node) => node.kind === kind)
      .sort(
        (left, right) =>
          right.importance - left.importance ||
          String(left.subtype ?? '').localeCompare(String(right.subtype ?? '')) ||
          left.label.localeCompare(right.label),
      );

    const totalHeight = columnNodes.reduce((sum, node, index) => {
      const current = dimensions.get(node.id);
      return sum + (current?.height ?? 88) + (index === columnNodes.length - 1 ? 0 : 34);
    }, 0);

    let currentY = Math.max(42, 420 - totalHeight / 2);

    columnNodes.forEach((node) => {
      positions.set(node.id, {
        x: COLUMN_X[kind],
        y: currentY,
      });
      currentY += (dimensions.get(node.id)?.height ?? 88) + 34;
    });
  });

  return positions;
};

const FilterButton = memo(
  ({
    label,
    active,
    onClick,
  }: {
    label: string;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] transition-all duration-200 ${
        active
          ? 'border-teal-300/50 bg-teal-400/12 text-teal-100'
          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/[0.08]'
      }`}
    >
      {label}
    </button>
  ),
);

FilterButton.displayName = 'FilterButton';

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

  const filteredNodes = useMemo(
    () => graph.nodes.filter((node) => isNodeVisible(node, filters)),
    [filters, graph.nodes],
  );

  const filteredNodeIdSet = useMemo(() => new Set(filteredNodes.map((node) => node.id)), [filteredNodes]);

  const visibleNodeIdSet = useMemo(() => {
    if (!focusNodeId || !filteredNodeIdSet.has(focusNodeId)) return filteredNodeIdSet;

    const focusedIds = new Set<string>([focusNodeId, ...(adjacency.get(focusNodeId) ?? [])]);
    return new Set(Array.from(filteredNodeIdSet).filter((nodeId) => focusedIds.has(nodeId)));
  }, [adjacency, filteredNodeIdSet, focusNodeId]);

  const visibleNodes = useMemo(
    () => filteredNodes.filter((node) => visibleNodeIdSet.has(node.id)),
    [filteredNodes, visibleNodeIdSet],
  );

  const visibleEdges = useMemo(
    () =>
      graph.edges.filter((edge) => visibleNodeIdSet.has(edge.source) && visibleNodeIdSet.has(edge.target)),
    [graph.edges, visibleNodeIdSet],
  );

  const dimensionMap = useMemo(() => {
    const maxImportance = Math.max(...visibleNodes.map((node) => node.importance), 1);
    const minImportance = Math.min(...visibleNodes.map((node) => node.importance), maxImportance);
    const map = new Map<string, { width: number; height: number }>();

    visibleNodes.forEach((node) => {
      const width = Math.round(scaleBetween(node.importance, minImportance, maxImportance, 198, 272));
      const height = Math.round(scaleBetween(node.importance, minImportance, maxImportance, 84, 108));
      map.set(node.id, { width, height });
    });

    return map;
  }, [visibleNodes]);

  const positions = useMemo(() => layoutNodes(visibleNodes, dimensionMap), [dimensionMap, visibleNodes]);

  const flowNodes = useMemo<Node<RelationshipMapFlowNodeData>[]>(
    () =>
      visibleNodes.map((node) => ({
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
    () =>
      visibleEdges.map((edge) => {
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
            strokeWidth: isSelectedEdge ? 2.8 : isHighlighted ? 2.15 : 1.1,
            opacity: activePreviewNodeId ? (isHighlighted ? 1 : 0.42) : 0.86,
            strokeDasharray: edge.relation === 'state-entity' || edge.relation === 'context-entity' ? '7 5' : undefined,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 16,
            height: 16,
            color: isHighlighted ? EDGE_STROKES.active : EDGE_STROKES.default,
          },
        };
      }),
    [activePreviewNodeId, highlightedNodeIds, selectedNodeId, visibleEdges],
  );

  const selectedNode = useMemo(
    () => graph.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [graph.nodes, selectedNodeId],
  );

  const visibleSummary = {
    nodes: visibleNodes.length,
    edges: visibleEdges.length,
  };

  const toggleActivities = () => {
    startTransition(() => {
      setFilters((current) => ({
        ...current,
        activities: !current.activities,
      }));
    });
  };

  const toggleStates = () => {
    startTransition(() => {
      setFilters((current) => ({
        ...current,
        states: !current.states,
      }));
    });
  };

  const toggleEntityType = (type: EntityType) => {
    startTransition(() => {
      setFilters((current) => ({
        ...current,
        entityTypes: {
          ...current.entityTypes,
          [type]: !current.entityTypes[type],
        },
      }));
    });
  };

  const toggleContextType = (type: ContextGroup) => {
    startTransition(() => {
      setFilters((current) => ({
        ...current,
        contextTypes: {
          ...current.contextTypes,
          [type]: !current.contextTypes[type],
        },
      }));
    });
  };

  const applyPreset = (preset: RelationshipMapFilters) => {
    startTransition(() => {
      setFilters(preset);
      setFocusNodeId(null);
    });
  };

  const clearInteraction = () => {
    startTransition(() => {
      setHoveredNodeId(null);
      setSelectedNodeId(null);
      setFocusNodeId(null);
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]">
      <aside className="space-y-5 rounded-[30px] border border-white/10 bg-[rgba(5,14,18,0.78)] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-teal-200/70">Relationship Map</p>
          <h3 className="mt-2 font-serif text-2xl text-white">Graph controls</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Hover previews local connections, click persists them, and focus mode isolates one node with its immediate neighborhood.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400">Visible</p>
            <p className="mt-2 text-xl font-semibold text-white">{visibleSummary.nodes}</p>
            <p className="mt-1 text-xs text-slate-400">nodes</p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400">Edges</p>
            <p className="mt-2 text-xl font-semibold text-white">{visibleSummary.edges}</p>
            <p className="mt-1 text-xs text-slate-400">rendered</p>
          </div>
        </div>

        <div className="space-y-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-sm font-semibold text-white">Quick presets</p>
          <div className="flex flex-wrap gap-2">
            <FilterButton label="All types" active={false} onClick={() => applyPreset(DEFAULT_FILTERS)} />
            <FilterButton label="People + activities" active={false} onClick={() => applyPreset(PEOPLE_PRESET)} />
            <FilterButton label="Dislikes + actions" active={false} onClick={() => applyPreset(DISLIKE_PRESET)} />
          </div>
        </div>

        <div className="space-y-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-sm font-semibold text-white">Core types</p>
          <div className="flex flex-wrap gap-2">
            <FilterButton label="Activities" active={filters.activities} onClick={toggleActivities} />
            <FilterButton label="States" active={filters.states} onClick={toggleStates} />
          </div>

          <p className="pt-2 text-xs uppercase tracking-[0.18em] text-slate-400">Entity types</p>
          <div className="flex flex-wrap gap-2">
            {ENTITY_TYPES.map((type) => (
              <FilterButton key={type} label={type} active={filters.entityTypes[type]} onClick={() => toggleEntityType(type)} />
            ))}
          </div>

          <p className="pt-2 text-xs uppercase tracking-[0.18em] text-slate-400">Context types</p>
          <div className="flex flex-wrap gap-2">
            {CONTEXT_GROUPS.map((type) => (
              <FilterButton key={type} label={type} active={filters.contextTypes[type]} onClick={() => toggleContextType(type)} />
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-white">Selection</p>
            {(selectedNodeId || focusNodeId) ? (
              <button type="button" onClick={clearInteraction} className="text-xs text-slate-400 hover:text-white">
                Clear
              </button>
            ) : null}
          </div>

          {selectedNode ? (
            <>
              <div className="rounded-[18px] border border-white/10 bg-black/20 p-3">
                <p className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400">{labelForKind(selectedNode)}</p>
                <p className="mt-2 text-base font-semibold text-white">{selectedNode.label}</p>
                {selectedNode.subtype ? (
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{String(selectedNode.subtype)}</p>
                ) : null}
                <div className="mt-3 flex items-center gap-4 text-xs text-slate-300">
                  <span>{selectedNode.frequency}x frequency</span>
                  <span>{selectedNode.connectedNodeIds.length} links</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <FilterButton
                  label={focusNodeId === selectedNode.id ? 'Focused' : 'Focus neighborhood'}
                  active={focusNodeId === selectedNode.id}
                  onClick={() =>
                    startTransition(() => {
                      setFocusNodeId((current) => (current === selectedNode.id ? null : selectedNode.id));
                    })
                  }
                />
                {focusNodeId ? (
                  <FilterButton
                    label="Clear focus"
                    active={false}
                    onClick={() =>
                      startTransition(() => {
                        setFocusNodeId(null);
                      })
                    }
                  />
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-sm leading-6 text-slate-400">
              Click a node to lock its neighborhood, then use focus mode to isolate that local structure.
            </p>
          )}
        </div>

        <div className="space-y-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-sm font-semibold text-white">Legend</p>
          <div className="space-y-2">
            {([
              ['activity', 'Activity'],
              ['entity', 'Entity'],
              ['state', 'Cognitive state'],
              ['context', 'Context'],
            ] as const).map(([kind, label]) => (
              <div key={kind} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="h-3 w-3 rounded-full" style={{ background: NODE_COLOR[kind] }} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[rgba(5,14,18,0.78)] shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 border-b border-white/8 px-5 py-4">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-400">Relationship Graph</p>
            <h3 className="mt-1 text-xl font-semibold text-white">Activities, entities, states, and context</h3>
          </div>
          <div className="text-right text-xs text-slate-400">
            <p>{graph.summary.nodeCount} total nodes</p>
            <p>{graph.summary.edgeCount} total edges</p>
          </div>
        </div>

        <div className={`h-[820px] transition-opacity duration-300 ${isPending ? 'opacity-75' : 'opacity-100'}`}>
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
            onNodeClick={(_, node) =>
              startTransition(() => {
                setSelectedNodeId(node.id);
              })
            }
            onNodeMouseEnter={(_, node) => {
              setHoveredNodeId(node.id);
            }}
            onNodeMouseLeave={(_, node) => {
              setHoveredNodeId((current) => (current === node.id ? null : current));
            }}
            onPaneClick={() =>
              startTransition(() => {
                setHoveredNodeId(null);
                setSelectedNodeId(null);
              })
            }
            defaultEdgeOptions={{
              animated: false,
              style: {
                stroke: EDGE_STROKES.default,
              },
            }}
          >
            <MiniMap
              pannable
              zoomable
              nodeColor={(node) => {
                const data = node.data as RelationshipMapFlowNodeData;
                return NODE_COLOR[data.kind];
              }}
              maskColor="rgba(6,12,16,0.72)"
              bgColor="rgba(5,14,18,0.85)"
              style={{
                background: 'rgba(5,14,18,0.82)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            />
            <Controls
              showInteractive={false}
              style={{
                background: 'rgba(5,14,18,0.82)',
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            />
            <Background color="rgba(148,163,184,0.16)" gap={24} size={1.1} />
          </ReactFlow>
        </div>
      </section>
    </div>
  );
};
