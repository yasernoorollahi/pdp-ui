import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type {
  RelationshipMapNodeKind,
  RelationshipMapNodeSubtype,
} from '../types';

export type RelationshipMapFlowNodeData = {
  label: string;
  kind: RelationshipMapNodeKind;
  subtype: RelationshipMapNodeSubtype;
  frequency: number;
  connectionCount: number;
  width: number;
  height: number;
  isDimmed: boolean;
  isHighlighted: boolean;
  isSelected: boolean;
  isFocused: boolean;
  isCollapsedGroup?: boolean;
  collapsedCount?: number;
  collapsedHint?: string | null;
};

export type RelationshipMapFlowNode = Node<
  RelationshipMapFlowNodeData,
  'relationshipMapNode'
>;

const KIND_STYLES: Record<
  RelationshipMapNodeKind,
  {
    border: string;
    borderActive: string;
    background: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    glowColor: string;
    dotColor: string;
    labelColor: string;
  }
> = {
  activity: {
    border: 'rgba(94, 234, 212, 0.22)',
    borderActive: 'rgba(94, 234, 212, 0.55)',
    background:
      'linear-gradient(145deg, rgba(14, 68, 64, 0.9), rgba(6, 20, 24, 0.96))',
    badgeBg: 'rgba(45, 212, 191, 0.12)',
    badgeBorder: 'rgba(94, 234, 212, 0.2)',
    badgeText: '#99f6e4',
    glowColor: 'rgba(45, 212, 191, 0.22)',
    dotColor: '#5eead4',
    labelColor: 'rgba(255,255,255,0.88)',
  },
  entity: {
    border: 'rgba(125, 211, 252, 0.22)',
    borderActive: 'rgba(125, 211, 252, 0.52)',
    background:
      'linear-gradient(145deg, rgba(16, 52, 88, 0.88), rgba(6, 16, 30, 0.96))',
    badgeBg: 'rgba(96, 165, 250, 0.12)',
    badgeBorder: 'rgba(125, 211, 252, 0.2)',
    badgeText: '#bae6fd',
    glowColor: 'rgba(96, 165, 250, 0.2)',
    dotColor: '#93c5fd',
    labelColor: 'rgba(255,255,255,0.88)',
  },
  state: {
    border: 'rgba(167, 139, 250, 0.22)',
    borderActive: 'rgba(167, 139, 250, 0.52)',
    background:
      'linear-gradient(145deg, rgba(60, 32, 112, 0.88), rgba(16, 8, 36, 0.96))',
    badgeBg: 'rgba(167, 139, 250, 0.12)',
    badgeBorder: 'rgba(196, 181, 253, 0.2)',
    badgeText: '#ede9fe',
    glowColor: 'rgba(167, 139, 250, 0.22)',
    dotColor: '#c4b5fd',
    labelColor: 'rgba(255,255,255,0.88)',
  },
  context: {
    border: 'rgba(251, 191, 36, 0.22)',
    borderActive: 'rgba(251, 191, 36, 0.52)',
    background:
      'linear-gradient(145deg, rgba(96, 54, 8, 0.88), rgba(28, 14, 4, 0.96))',
    badgeBg: 'rgba(251, 191, 36, 0.12)',
    badgeBorder: 'rgba(253, 224, 71, 0.2)',
    badgeText: '#fef3c7',
    glowColor: 'rgba(251, 191, 36, 0.18)',
    dotColor: '#fcd34d',
    labelColor: 'rgba(255,255,255,0.88)',
  },
};

const kindLabel = (kind: RelationshipMapNodeKind) => {
  switch (kind) {
    case 'activity':
      return 'Activity';
    case 'entity':
      return 'Entity';
    case 'state':
      return 'State';
    case 'context':
      return 'Context';
    default:
      return kind;
  }
};

const subtypeStr = (subtype: RelationshipMapNodeSubtype) =>
  subtype ? String(subtype).replace(/_/g, ' ') : null;

const RelationshipMapNodeComponent = ({
  data,
}: NodeProps<RelationshipMapFlowNode>) => {
  const tone = KIND_STYLES[data.kind];
  const isActive = data.isSelected || data.isFocused || data.isHighlighted;
  const opacity = data.isDimmed ? 0.2 : data.isCollapsedGroup ? 0.92 : 1;

  const borderColor =
    data.isFocused || data.isSelected
      ? 'rgba(255,255,255,0.55)'
      : isActive
        ? tone.borderActive
        : tone.border;

  const boxShadow = data.isCollapsedGroup
    ? `0 6px 18px rgba(0,0,0,0.22), inset 0 0 0 1px rgba(255,255,255,0.03)`
    : data.isFocused
      ? `0 0 0 1.5px rgba(255,255,255,0.14), 0 12px 36px ${tone.glowColor}, 0 0 0 4px rgba(255,255,255,0.04)`
      : data.isSelected
        ? `0 0 0 1px rgba(255,255,255,0.10), 0 12px 32px ${tone.glowColor}`
        : data.isHighlighted
          ? `0 10px 28px ${tone.glowColor}`
          : `0 6px 20px rgba(0,0,0,0.28)`;

  const transform = data.isCollapsedGroup
    ? 'scale(1)'
    : data.isSelected
      ? 'translateY(-2px) scale(1.015)'
      : data.isFocused
        ? 'scale(1.02)'
        : 'scale(1)';

  const background = data.isCollapsedGroup
    ? `linear-gradient(145deg, rgba(255,255,255,0.06), ${tone.badgeBg}, rgba(255,255,255,0.02))`
    : tone.background;

  const badgeLabel = data.isCollapsedGroup ? `${kindLabel(data.kind)} lane` : kindLabel(data.kind);

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        style={{
          width: '10px',
          height: '10px',
          border: 'none',
          background: 'transparent',
          opacity: 0,
        }}
      />
      <div
        style={{
          width: `${data.width}px`,
          minHeight: `${data.height}px`,
          borderRadius: '20px',
          border: `1px solid ${borderColor}`,
          background,
          boxShadow,
          opacity,
          transform,
          padding: '13px 15px',
          color: 'white',
          backdropFilter: 'blur(16px)',
          transition: 'all 0.25s ease',
          cursor: data.isCollapsedGroup ? 'default' : 'pointer',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '10px',
        }}
      >
        {/* Top row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div>
            {/* Badge */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                borderRadius: '100px',
                border: `1px solid ${tone.badgeBorder}`,
                background: tone.badgeBg,
                padding: '2px 9px',
                fontSize: '0.6rem',
                fontWeight: 600,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: tone.badgeText,
                marginBottom: '6px',
              }}
            >
              <span
                style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  background: tone.dotColor,
                  flexShrink: 0,
                }}
              />
              {badgeLabel}
            </span>

            {/* Label */}
            <p
              style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                lineHeight: 1.3,
                color: tone.labelColor,
              }}
              >
                {data.label}
              </p>

            {data.isCollapsedGroup && data.collapsedHint ? (
              <p
                style={{
                  marginTop: '6px',
                  fontSize: '0.72rem',
                  lineHeight: 1.5,
                  color: 'rgba(255,255,255,0.44)',
                  maxWidth: '18rem',
                }}
              >
                {data.collapsedHint}
              </p>
            ) : null}

            {/* Subtype */}
            {subtypeStr(data.subtype) && !data.isCollapsedGroup && (
              <p
                style={{
                  marginTop: '3px',
                  fontSize: '0.65rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.32)',
                }}
              >
                {subtypeStr(data.subtype)}
              </p>
            )}
          </div>

          {/* Frequency badge */}
          <span
            style={{
              flexShrink: 0,
              borderRadius: '100px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(0,0,0,0.28)',
              padding: '3px 9px',
              fontSize: '0.68rem',
              fontWeight: 500,
              color: 'rgba(255,255,255,0.55)',
            }}
          >
            {data.isCollapsedGroup ? `${data.collapsedCount ?? data.frequency} hidden` : `${data.frequency}×`}
          </span>
        </div>

        {/* Bottom row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.65rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.28)',
            paddingTop: '8px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <span>{data.isCollapsedGroup ? 'collapsed' : `${data.connectionCount} links`}</span>
          {data.isCollapsedGroup ? (
            <span style={{ color: tone.badgeText }}>Expand via related node</span>
          ) : data.isFocused ? (
            <span style={{ color: tone.badgeText }}>Focused</span>
          ) : data.isSelected ? (
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Selected</span>
          ) : null}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        style={{
          width: '10px',
          height: '10px',
          border: 'none',
          background: 'transparent',
          opacity: 0,
        }}
      />
    </>
  );
};

RelationshipMapNodeComponent.displayName = 'RelationshipMapNode';
export const RelationshipMapNode = memo(RelationshipMapNodeComponent);
