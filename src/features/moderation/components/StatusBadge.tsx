import { Badge } from '../../../components/ui/Badge/Badge';
import type { ModerationStatus } from '../types/moderation.types';

interface StatusBadgeProps {
  status: ModerationStatus;
}

const STATUS_CONFIG: Record<
  ModerationStatus,
  { variant: 'teal' | 'emerald' | 'red' | 'gold' | 'orange' | 'muted'; label: string; pulse?: boolean }
> = {
  PENDING:  { variant: 'gold',    label: 'Pending',  pulse: true },
  APPROVED: { variant: 'emerald', label: 'Approved' },
  REJECTED: { variant: 'orange',  label: 'Rejected' },
  AUTO_BLOCKED: { variant: 'red', label: 'Auto Blocked', pulse: true },
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <Badge variant={cfg.variant} pulseDot={cfg.pulse}>
      {cfg.label}
    </Badge>
  );
};
