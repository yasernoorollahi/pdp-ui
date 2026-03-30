import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { RelationshipMapNodeKind, RelationshipMapNodeSubtype } from '../types';

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
};

export type RelationshipMapFlowNode = Node<RelationshipMapFlowNodeData, 'relationshipMapNode'>;

const KIND_STYLES: Record<
  RelationshipMapNodeKind,
  {
    border: string;
    background: string;
    badgeBackground: string;
    badgeBorder: string;
    badgeText: string;
    glow: string;
  }
> = {
  activity: {
    border: 'rgba(94, 234, 212, 0.42)',
    background: 'linear-gradient(180deg, rgba(15, 78, 72, 0.88), rgba(7, 23, 28, 0.95))',
    badgeBackground: 'rgba(45, 212, 191, 0.16)',
    badgeBorder: 'rgba(94, 234, 212, 0.22)',
    badgeText: '#d8fffa',
    glow: 'rgba(45, 212, 191, 0.26)',
  },
  entity: {
    border: 'rgba(125, 211, 252, 0.4)',
    background: 'linear-gradient(180deg, rgba(18, 56, 92, 0.82), rgba(7, 18, 32, 0.96))',
    badgeBackground: 'rgba(96, 165, 250, 0.14)',
    badgeBorder: 'rgba(125, 211, 252, 0.22)',
    badgeText: '#dbeafe',
    glow: 'rgba(96, 165, 250, 0.24)',
  },
  state: {
    border: 'rgba(167, 139, 250, 0.42)',
    background: 'linear-gradient(180deg, rgba(69, 37, 124, 0.86), rgba(18, 10, 38, 0.95))',
    badgeBackground: 'rgba(167, 139, 250, 0.14)',
    badgeBorder: 'rgba(196, 181, 253, 0.22)',
    badgeText: '#ede9fe',
    glow: 'rgba(167, 139, 250, 0.26)',
  },
  context: {
    border: 'rgba(251, 191, 36, 0.42)',
    background: 'linear-gradient(180deg, rgba(108, 60, 10, 0.86), rgba(31, 18, 6, 0.95))',
    badgeBackground: 'rgba(251, 191, 36, 0.16)',
    badgeBorder: 'rgba(253, 224, 71, 0.22)',
    badgeText: '#fef3c7',
    glow: 'rgba(251, 191, 36, 0.22)',
  },
};

const labelForKind = (kind: RelationshipMapNodeKind) => {
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

const subtypeLabel = (subtype: RelationshipMapNodeSubtype) => (subtype ? String(subtype).replace(/_/g, ' ') : null);

const RelationshipMapNodeComponent = ({ data }: NodeProps<RelationshipMapFlowNode>) => {
  const tone = KIND_STYLES[data.kind];
  const opacity = data.isDimmed ? 0.24 : 1;
  const borderColor = data.isSelected || data.isFocused ? '#ffffff' : tone.border;
  const boxShadow = data.isFocused
    ? `0 0 0 1px rgba(255,255,255,0.18), 0 16px 44px ${tone.glow}`
    : data.isHighlighted
      ? `0 14px 34px ${tone.glow}`
      : '0 10px 30px rgba(0, 0, 0, 0.22)';

  return (
    <>
      <Handle type="target" position={Position.Left} isConnectable={false} className="!h-3 !w-3 !border-0 !bg-transparent !opacity-0" />
      <div
        className="rounded-[24px] border px-4 py-3 text-white backdrop-blur-xl transition-all duration-300"
        style={{
          width: `${data.width}px`,
          minHeight: `${data.height}px`,
          opacity,
          borderColor,
          background: tone.background,
          boxShadow,
          transform: data.isSelected ? 'translateY(-1px) scale(1.01)' : 'translateY(0px) scale(1)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <span
              className="inline-flex rounded-full border px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.2em]"
              style={{
                background: tone.badgeBackground,
                borderColor: tone.badgeBorder,
                color: tone.badgeText,
              }}
            >
              {labelForKind(data.kind)}
            </span>
            <div>
              <p className="text-[0.95rem] font-semibold leading-5 text-white">{data.label}</p>
              {subtypeLabel(data.subtype) ? (
                <p className="mt-1 text-[0.7rem] uppercase tracking-[0.18em] text-white/58">{subtypeLabel(data.subtype)}</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-xs text-white/75">
            {data.frequency}x
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[0.7rem] uppercase tracking-[0.18em] text-white/55">
          <span>{data.connectionCount} links</span>
          {data.isFocused ? <span>Focus</span> : data.isSelected ? <span>Selected</span> : null}
        </div>
      </div>
      <Handle type="source" position={Position.Right} isConnectable={false} className="!h-3 !w-3 !border-0 !bg-transparent !opacity-0" />
    </>
  );
};

RelationshipMapNodeComponent.displayName = 'RelationshipMapNode';

export const RelationshipMapNode = memo(RelationshipMapNodeComponent);
