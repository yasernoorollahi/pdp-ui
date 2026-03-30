import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import type {
  CognitiveSpace3DEdgeViewModel,
  CognitiveSpace3DNodeViewModel,
  CognitiveSpace3DViewModel,
  CognitiveSpaceOrbitLayerId,
  CognitiveSpaceOrbitLayerViewModel,
} from '../types';

type CognitiveSpace3DViewProps = {
  model: CognitiveSpace3DViewModel;
};

const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 6, 28);
const DEFAULT_LOOK_AT = new THREE.Vector3(0, 0, 0);

const ORBIT_LABELS: Record<CognitiveSpaceOrbitLayerId, string> = {
  ACTIVITY: 'Orbit 1 · Activities',
  ENTITY: 'Orbit 2 · Entities',
  STATE: 'Orbit 3 · States',
  CONTEXT: 'Orbit 4 · Context',
};

const softLineColor = '#b9d8e6';

const labelForKind = (node: CognitiveSpace3DNodeViewModel | null) => {
  if (!node) return 'None';
  return node.kind === 'self' ? 'Self' : node.kind.charAt(0).toUpperCase() + node.kind.slice(1);
};

const subtypeLabel = (node: CognitiveSpace3DNodeViewModel | null) => {
  if (!node?.subtype || node.subtype === 'SELF') return null;
  return String(node.subtype).replace(/_/g, ' ');
};

const OrbitGuide = memo(({ radius }: { radius: number }) => (
  <mesh rotation-x={Math.PI / 2}>
    <torusGeometry args={[radius, 0.014, 8, 140]} />
    <meshBasicMaterial color="#b5c5d3" transparent opacity={0.085} depthWrite={false} />
  </mesh>
));

OrbitGuide.displayName = 'OrbitGuide';

const SelfNode = memo(
  ({
    node,
    isDimmed,
    isHighlighted,
    isSelected,
    registerAnchor,
    onHover,
    onSelect,
  }: {
    node: CognitiveSpace3DNodeViewModel;
    isDimmed: boolean;
    isHighlighted: boolean;
    isSelected: boolean;
    registerAnchor: (id: string, object: THREE.Object3D | null) => void;
    onHover: (id: string | null) => void;
    onSelect: (id: string) => void;
  }) => {
    const groupRef = useRef<THREE.Group>(null);
    const coreRef = useRef<THREE.Mesh>(null);
    const haloRef = useRef<THREE.Mesh>(null);

    useEffect(() => {
      registerAnchor(node.id, groupRef.current);
      return () => {
        registerAnchor(node.id, null);
      };
    }, [node.id, registerAnchor]);

    useFrame((state, delta) => {
      if (!groupRef.current || !coreRef.current || !haloRef.current) return;

      const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.35) * 0.04;
      const targetScale = (isSelected ? 1.08 : isHighlighted ? 1.03 : 1) * pulse;
      const nextScale = THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, 1 - Math.exp(-delta * 5.2));
      groupRef.current.scale.setScalar(nextScale);

      const coreMaterial = coreRef.current.material as THREE.MeshStandardMaterial;
      const haloMaterial = haloRef.current.material as THREE.MeshBasicMaterial;

      coreMaterial.opacity = THREE.MathUtils.lerp(coreMaterial.opacity, isDimmed ? 0.22 : 0.98, 1 - Math.exp(-delta * 6.5));
      coreMaterial.emissiveIntensity = THREE.MathUtils.lerp(
        coreMaterial.emissiveIntensity,
        isSelected ? 2.6 : isHighlighted ? 2.1 : 1.6,
        1 - Math.exp(-delta * 5),
      );
      haloMaterial.opacity = THREE.MathUtils.lerp(
        haloMaterial.opacity,
        isDimmed ? 0.06 : isSelected ? 0.28 : isHighlighted ? 0.21 : 0.16,
        1 - Math.exp(-delta * 5),
      );
      haloRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 1.35) * 0.08);
    });

    return (
      <group
        ref={groupRef}
        position={[0, 0, 0]}
        onPointerOver={(event) => {
          event.stopPropagation();
          onHover(node.id);
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          onHover(null);
        }}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(node.id);
        }}
      >
        <pointLight color={node.color} intensity={1.7} distance={18} decay={2.2} />
        <mesh ref={haloRef}>
          <sphereGeometry args={[node.size * 1.95, 32, 32]} />
          <meshBasicMaterial color={node.color} transparent opacity={0.16} depthWrite={false} />
        </mesh>
        <mesh ref={coreRef}>
          <sphereGeometry args={[node.size, 40, 40]} />
          <meshStandardMaterial
            color={node.color}
            emissive={node.color}
            emissiveIntensity={1.6}
            roughness={0.08}
            metalness={0.16}
            transparent
            opacity={0.98}
          />
        </mesh>

        {(isSelected || isHighlighted) ? (
          <Html position={[0, node.size + 0.9, 0]} center distanceFactor={10} transform>
            <div className="rounded-full border border-white/10 bg-[rgba(5,14,18,0.78)] px-3 py-1.5 text-xs font-medium text-white shadow-[0_8px_26px_rgba(0,0,0,0.35)] backdrop-blur-md">
              {node.label}
            </div>
          </Html>
        ) : null}
      </group>
    );
  },
);

SelfNode.displayName = 'SelfNode';

const OrbitNode = memo(
  ({
    node,
    isDimmed,
    isHighlighted,
    isSelected,
    registerAnchor,
    onHover,
    onSelect,
  }: {
    node: CognitiveSpace3DNodeViewModel;
    isDimmed: boolean;
    isHighlighted: boolean;
    isSelected: boolean;
    registerAnchor: (id: string, object: THREE.Object3D | null) => void;
    onHover: (id: string | null) => void;
    onSelect: (id: string) => void;
  }) => {
    const groupRef = useRef<THREE.Group>(null);
    const sphereRef = useRef<THREE.Mesh>(null);
    const haloRef = useRef<THREE.Mesh>(null);

    useEffect(() => {
      registerAnchor(node.id, groupRef.current);
      return () => {
        registerAnchor(node.id, null);
      };
    }, [node.id, registerAnchor]);

    useFrame((state, delta) => {
      if (!groupRef.current || !sphereRef.current || !haloRef.current) return;

      const targetScale = isSelected ? 1.22 : isHighlighted ? 1.08 : 1;
      const nextScale = THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, 1 - Math.exp(-delta * 6.2));
      groupRef.current.scale.setScalar(nextScale);

      const sphereMaterial = sphereRef.current.material as THREE.MeshStandardMaterial;
      const haloMaterial = haloRef.current.material as THREE.MeshBasicMaterial;

      sphereMaterial.opacity = THREE.MathUtils.lerp(sphereMaterial.opacity, isDimmed ? 0.18 : 0.92, 1 - Math.exp(-delta * 7));
      sphereMaterial.emissiveIntensity = THREE.MathUtils.lerp(
        sphereMaterial.emissiveIntensity,
        isSelected ? 1.65 : isHighlighted ? 1.3 : 0.82,
        1 - Math.exp(-delta * 5.4),
      );
      haloMaterial.opacity = THREE.MathUtils.lerp(
        haloMaterial.opacity,
        isDimmed ? 0.03 : isSelected ? 0.19 : isHighlighted ? 0.14 : 0.08,
        1 - Math.exp(-delta * 5.4),
      );

      const wobble = Math.sin(state.clock.elapsedTime * 0.62 + node.angle * 1.7) * 0.055;
      haloRef.current.scale.setScalar(1 + wobble);
    });

    return (
      <group
        ref={groupRef}
        position={[0, 0, 0]}
        onPointerOver={(event) => {
          event.stopPropagation();
          onHover(node.id);
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          onHover(null);
        }}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(node.id);
        }}
      >
        <mesh ref={haloRef}>
          <sphereGeometry args={[node.size * 1.7, 20, 20]} />
          <meshBasicMaterial color={node.color} transparent opacity={0.08} depthWrite={false} />
        </mesh>
        <mesh ref={sphereRef}>
          <sphereGeometry args={[node.size, 24, 24]} />
          <meshStandardMaterial
            color={node.color}
            emissive={node.color}
            emissiveIntensity={0.82}
            roughness={0.24}
            metalness={0.08}
            transparent
            opacity={0.92}
          />
        </mesh>
        {(isSelected || isHighlighted) ? (
          <Html position={[0, node.size + 0.58, 0]} center distanceFactor={12} transform>
            <div className="rounded-full border border-white/10 bg-[rgba(5,14,18,0.8)] px-2.5 py-1 text-[0.68rem] font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md">
              {node.label}
            </div>
          </Html>
        ) : null}
      </group>
    );
  },
);

OrbitNode.displayName = 'OrbitNode';

const OrbitLayer = memo(
  ({
    layer,
    activeNodeId,
    highlightedIds,
    selectedNodeId,
    focusNodeId,
    registerAnchor,
    onHover,
    onSelect,
  }: {
    layer: CognitiveSpaceOrbitLayerViewModel;
    activeNodeId: string | null;
    highlightedIds: Set<string>;
    selectedNodeId: string | null;
    focusNodeId: string | null;
    registerAnchor: (id: string, object: THREE.Object3D | null) => void;
    onHover: (id: string | null) => void;
    onSelect: (id: string) => void;
  }) => {
    const groupRef = useRef<THREE.Group>(null);
    const rotationRef = useRef(layer.tilt[1]);

    useFrame((_, delta) => {
      if (!groupRef.current) return;
      rotationRef.current += delta * layer.speed;
      groupRef.current.rotation.set(layer.tilt[0], rotationRef.current, layer.tilt[2]);
    });

    return (
      <group ref={groupRef} rotation={layer.tilt}>
        <OrbitGuide radius={layer.radius} />
        {layer.nodes.map((node) => {
          const isFocusedOut = Boolean(focusNodeId) && !highlightedIds.has(node.id) && node.id !== focusNodeId;
          const isDimmed = activeNodeId ? !highlightedIds.has(node.id) || isFocusedOut : false;

          return (
            <group
              key={node.id}
              position={[
                Math.cos(node.angle) * layer.radius,
                node.height,
                Math.sin(node.angle) * layer.radius,
              ]}
            >
              <OrbitNode
                node={node}
                isDimmed={isDimmed}
                isHighlighted={highlightedIds.has(node.id)}
                isSelected={selectedNodeId === node.id}
                registerAnchor={registerAnchor}
                onHover={onHover}
                onSelect={onSelect}
              />
            </group>
          );
        })}
      </group>
    );
  },
);

OrbitLayer.displayName = 'OrbitLayer';

const DynamicConnectionLine = memo(
  ({
    edge,
    anchorRefs,
  }: {
    edge: CognitiveSpace3DEdgeViewModel;
    anchorRefs: MutableRefObject<Map<string, THREE.Object3D>>;
  }) => {
    const geometry = useMemo(() => {
      const next = new THREE.BufferGeometry();
      next.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      return next;
    }, []);
    const material = useMemo(
      () =>
        new THREE.LineBasicMaterial({
          color: edge.relation === 'self-activity' ? '#9be7dc' : softLineColor,
          transparent: true,
          opacity: edge.relation === 'self-activity' ? 0.46 : 0.34,
          depthWrite: false,
        }),
      [edge.relation],
    );
    const line = useMemo(() => {
      const next = new THREE.Line(geometry, material);
      next.frustumCulled = false;
      next.renderOrder = 2;
      return next;
    }, [geometry, material]);
    const start = useMemo(() => new THREE.Vector3(), []);
    const end = useMemo(() => new THREE.Vector3(), []);

    useEffect(() => {
      return () => {
        geometry.dispose();
        material.dispose();
      };
    }, [geometry, material]);

    useFrame(() => {
      const source = anchorRefs.current.get(edge.source);
      const target = anchorRefs.current.get(edge.target);

      if (!source || !target) return;

      source.getWorldPosition(start);
      target.getWorldPosition(end);

      const attribute = geometry.getAttribute('position') as THREE.BufferAttribute;
      attribute.setXYZ(0, start.x, start.y, start.z);
      attribute.setXYZ(1, end.x, end.y, end.z);
      attribute.needsUpdate = true;
      geometry.computeBoundingSphere();
    });

    return <primitive object={line} />;
  },
);

DynamicConnectionLine.displayName = 'DynamicConnectionLine';

const CameraRig = ({
  selectedNodeId,
  focusMode,
  anchorRefs,
}: {
  selectedNodeId: string | null;
  focusMode: boolean;
  anchorRefs: MutableRefObject<Map<string, THREE.Object3D>>;
}) => {
  const { camera } = useThree();
  const targetLookAt = useRef(DEFAULT_LOOK_AT.clone());
  const desiredPosition = useRef(DEFAULT_CAMERA_POSITION.clone());
  const tempTarget = useRef(new THREE.Vector3());
  const tempDirection = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    const activeAnchor = selectedNodeId ? anchorRefs.current.get(selectedNodeId) : null;

    if (activeAnchor) {
      activeAnchor.getWorldPosition(tempTarget.current);
      targetLookAt.current.lerp(tempTarget.current, 1 - Math.exp(-delta * 3.4));

      tempDirection.current
        .copy(camera.position)
        .sub(tempTarget.current)
        .normalize()
        .multiplyScalar(focusMode ? 8.5 : 10.5);

      desiredPosition.current
        .copy(tempTarget.current)
        .add(tempDirection.current)
        .add(new THREE.Vector3(0, focusMode ? 1.2 : 2, 0));
    } else {
      targetLookAt.current.lerp(DEFAULT_LOOK_AT, 1 - Math.exp(-delta * 2.8));
      desiredPosition.current.lerp(DEFAULT_CAMERA_POSITION, 1 - Math.exp(-delta * 2.8));
    }

    camera.position.lerp(desiredPosition.current, 1 - Math.exp(-delta * 3.2));
    camera.lookAt(targetLookAt.current);
  });

  return null;
};

const SceneContent = ({
  model,
  hoveredNodeId,
  selectedNodeId,
  focusMode,
  onHover,
  onSelect,
}: {
  model: CognitiveSpace3DViewModel;
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
  focusMode: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) => {
  const anchorRefs = useRef(new Map<string, THREE.Object3D>());

  const registerAnchor = useCallback((id: string, object: THREE.Object3D | null) => {
    if (object) {
      anchorRefs.current.set(id, object);
    } else {
      anchorRefs.current.delete(id);
    }
  }, []);

  const activeNodeId = selectedNodeId ?? hoveredNodeId;
  const activeNode = model.nodes.find((node) => node.id === activeNodeId) ?? null;
  const highlightedIds = useMemo(
    () => new Set(activeNode ? ['self', activeNode.id, ...activeNode.connectedNodeIds] : ['self']),
    [activeNode],
  );

  const visibleLineEdges = useMemo(
    () =>
      activeNodeId
        ? model.edges.filter((edge) => edge.source === activeNodeId || edge.target === activeNodeId)
        : [],
    [activeNodeId, model.edges],
  );

  const focusNodeId = focusMode && selectedNodeId ? selectedNodeId : null;

  const visibleNodeIds = useMemo(() => {
    if (!focusNodeId) return new Set(model.nodes.map((node) => node.id));
    return new Set(['self', focusNodeId, ...(model.nodes.find((node) => node.id === focusNodeId)?.connectedNodeIds ?? [])]);
  }, [focusNodeId, model.nodes]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[DEFAULT_CAMERA_POSITION.x, DEFAULT_CAMERA_POSITION.y, DEFAULT_CAMERA_POSITION.z]} fov={42} />
      <CameraRig selectedNodeId={selectedNodeId} focusMode={focusMode} anchorRefs={anchorRefs} />

      <fog attach="fog" args={['#050b11', 18, 36]} />
      <ambientLight intensity={0.48} color="#c4d4df" />
      <directionalLight position={[8, 10, 6]} intensity={0.56} color="#dff4ff" />
      <pointLight position={[0, 0, 0]} intensity={0.9} distance={30} color="#73ecdf" />
      <pointLight position={[0, 8, -10]} intensity={0.35} distance={26} color="#95bbff" />

      <SelfNode
        node={model.selfNode}
        isDimmed={Boolean(activeNodeId) && !highlightedIds.has('self')}
        isHighlighted={highlightedIds.has('self')}
        isSelected={selectedNodeId === 'self'}
        registerAnchor={registerAnchor}
        onHover={onHover}
        onSelect={onSelect}
      />

      {model.layers.map((layer) => {
        const visibleLayerNodes = layer.nodes.filter((node) => visibleNodeIds.has(node.id));
        if (visibleLayerNodes.length === 0) return null;

        return (
          <OrbitLayer
            key={layer.id}
            layer={{ ...layer, nodes: visibleLayerNodes }}
            activeNodeId={activeNodeId}
            highlightedIds={highlightedIds}
            selectedNodeId={selectedNodeId}
            focusNodeId={focusNodeId}
            registerAnchor={registerAnchor}
            onHover={onHover}
            onSelect={onSelect}
          />
        );
      })}

      {activeNodeId
        ? visibleLineEdges
            .filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))
            .map((edge) => <DynamicConnectionLine key={edge.id} edge={edge} anchorRefs={anchorRefs} />)
        : null}
    </>
  );
};

export const CognitiveSpace3DView = ({ model }: CognitiveSpace3DViewProps) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [isPending, startTransition] = useTransition();
  const activePreviewNodeId = selectedNodeId ?? hoveredNodeId;

  const selectedNode = useMemo(
    () => model.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [model.nodes, selectedNodeId],
  );

  const activeEdgesCount = useMemo(
    () => (activePreviewNodeId ? model.edges.filter((edge) => edge.source === activePreviewNodeId || edge.target === activePreviewNodeId).length : 0),
    [activePreviewNodeId, model.edges],
  );

  const effectiveFocusMode = focusMode && Boolean(selectedNodeId);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]">
      <aside className="space-y-5 rounded-[30px] border border-white/10 bg-[rgba(5,14,18,0.78)] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-teal-200/70">3D Cognitive Space</p>
          <h3 className="mt-2 font-serif text-2xl text-white">Orbital system</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Inner layers emphasize repeated behavior, outer layers carry social and emotional context, and relation lines stay hidden until you interact.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400">3D nodes</p>
            <p className="mt-2 text-xl font-semibold text-white">{model.summary.nodeCount}</p>
            <p className="mt-1 text-xs text-slate-400">rendered</p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400">Hidden</p>
            <p className="mt-2 text-xl font-semibold text-white">{model.summary.hiddenCount}</p>
            <p className="mt-1 text-xs text-slate-400">trimmed for smooth motion</p>
          </div>
        </div>

        <div className="space-y-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-sm font-semibold text-white">Orbit legend</p>
          <div className="space-y-2.5">
            {model.layers.map((layer) => (
              <div key={layer.id} className="flex items-center justify-between gap-3 text-sm text-slate-300">
                <span>{ORBIT_LABELS[layer.id]}</span>
                <span className="text-xs text-slate-400">{layer.nodes.length} nodes</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-sm font-semibold text-white">Interaction</p>
          <p className="text-sm leading-6 text-slate-400">
            Hover previews local structure. Click locks it, shifts the camera toward it, and reveals only its relationship lines.
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedNode ? (
              <button
                type="button"
                onClick={() =>
                  startTransition(() => {
                    setFocusMode((current) => !current);
                  })
                }
                className={`rounded-full border px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] transition-all ${
                  effectiveFocusMode
                    ? 'border-teal-300/55 bg-teal-400/12 text-white'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/[0.08]'
                }`}
              >
                {effectiveFocusMode ? 'Focused neighborhood' : 'Focus node'}
              </button>
            ) : null}
            {(selectedNodeId || hoveredNodeId) ? (
              <button
                type="button"
                onClick={() =>
                  startTransition(() => {
                    setHoveredNodeId(null);
                    setSelectedNodeId(null);
                    setFocusMode(false);
                  })
                }
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-slate-300 hover:border-white/20 hover:bg-white/[0.08]"
              >
                Clear selection
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-white">Selection</p>
            <span className="text-xs uppercase tracking-[0.18em] text-slate-400">{activeEdgesCount} active links</span>
          </div>

          {selectedNode ? (
            <div className="rounded-[20px] border border-white/10 bg-black/20 p-4">
              <p className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400">{labelForKind(selectedNode)}</p>
              <p className="mt-2 text-lg font-semibold text-white">{selectedNode.label}</p>
              {subtypeLabel(selectedNode) ? (
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{subtypeLabel(selectedNode)}</p>
              ) : null}
              <div className="mt-3 flex items-center gap-4 text-xs text-slate-300">
                <span>{selectedNode.frequency}x frequency</span>
                <span>{selectedNode.connectedNodeIds.length} visible connections</span>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-6 text-slate-400">
              Select a sphere to shift the camera, surface its visible connections, and optionally isolate its neighborhood.
            </p>
          )}
        </div>
      </aside>

      <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(35,90,96,0.22),transparent_40%),linear-gradient(180deg,rgba(5,14,18,0.95),rgba(4,10,14,0.98))] shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 border-b border-white/8 px-5 py-4">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-400">Immersive Orbit View</p>
            <h3 className="mt-1 text-xl font-semibold text-white">Self-centered cognitive motion</h3>
          </div>
          <div className="text-right text-xs text-slate-400">
            <p>{model.summary.orbitLayerCount} orbit layers</p>
            <p>{effectiveFocusMode ? 'Focus mode active' : 'Ambient orbit motion'}</p>
          </div>
        </div>

        <div className={`h-[860px] transition-opacity duration-300 ${isPending ? 'opacity-75' : 'opacity-100'}`}>
          <Canvas dpr={[1, 1.6]} gl={{ antialias: true, alpha: true }}>
            <SceneContent
              model={model}
              hoveredNodeId={hoveredNodeId}
              selectedNodeId={selectedNodeId}
              focusMode={effectiveFocusMode}
              onHover={setHoveredNodeId}
              onSelect={(id) =>
                startTransition(() => {
                  setSelectedNodeId((current) => {
                    const next = current === id ? null : id;
                    if (next === null) {
                      setFocusMode(false);
                    }
                    return next;
                  });
                  setHoveredNodeId(null);
                })
              }
            />
          </Canvas>
        </div>
      </section>
    </div>
  );
};
