import { memo } from 'react';
import { BaseEdge, getSmoothStepPath, type Edge, type EdgeProps } from '@xyflow/react';

export type RelationshipMapFlowEdgeData = {
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  strokeDasharray?: string;
  glowColor: string;
  glowWidth: number;
  glowOpacity: number;
  isPulsing: boolean;
  pulseDuration: number;
  pulseOpacity: number;
};

export type RelationshipMapFlowEdge = Edge<RelationshipMapFlowEdgeData, 'relationshipMapEdge'>;

const RelationshipMapEdgeComponent = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
}: EdgeProps<RelationshipMapFlowEdge>) => {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 22,
  });

  if (!data) {
    return <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} />;
  }

  return (
    <>
      {data.glowOpacity > 0 ? (
        <path
          d={edgePath}
          fill="none"
          stroke={data.glowColor}
          strokeWidth={data.glowWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={data.glowOpacity}
          style={{ mixBlendMode: 'screen' }}
        >
          {data.isPulsing ? (
            <>
              <animate
                attributeName="opacity"
                values={`${Math.max(data.glowOpacity * 0.72, 0.06)};${data.pulseOpacity};${Math.max(
                  data.glowOpacity * 0.72,
                  0.06,
                )}`}
                dur={`${data.pulseDuration}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="stroke-width"
                values={`${data.glowWidth};${data.glowWidth + 0.9};${data.glowWidth}`}
                dur={`${data.pulseDuration}s`}
                repeatCount="indefinite"
              />
            </>
          ) : null}
        </path>
      ) : null}

      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: data.strokeColor,
          strokeWidth: data.strokeWidth,
          opacity: data.opacity,
          strokeDasharray: data.strokeDasharray,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }}
      />
    </>
  );
};

RelationshipMapEdgeComponent.displayName = 'RelationshipMapEdge';

const areEdgesEqual = (previous: EdgeProps<RelationshipMapFlowEdge>, next: EdgeProps<RelationshipMapFlowEdge>) => {
  const previousData = previous.data;
  const nextData = next.data;

  return (
    previous.sourceX === next.sourceX &&
    previous.sourceY === next.sourceY &&
    previous.targetX === next.targetX &&
    previous.targetY === next.targetY &&
    previous.sourcePosition === next.sourcePosition &&
    previous.targetPosition === next.targetPosition &&
    previous.markerEnd === next.markerEnd &&
    previousData?.strokeColor === nextData?.strokeColor &&
    previousData?.strokeWidth === nextData?.strokeWidth &&
    previousData?.opacity === nextData?.opacity &&
    previousData?.strokeDasharray === nextData?.strokeDasharray &&
    previousData?.glowColor === nextData?.glowColor &&
    previousData?.glowWidth === nextData?.glowWidth &&
    previousData?.glowOpacity === nextData?.glowOpacity &&
    previousData?.isPulsing === nextData?.isPulsing &&
    previousData?.pulseDuration === nextData?.pulseDuration &&
    previousData?.pulseOpacity === nextData?.pulseOpacity
  );
};

export const RelationshipMapEdge = memo(RelationshipMapEdgeComponent, areEdgesEqual);
