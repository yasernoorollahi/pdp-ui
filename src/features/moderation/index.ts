// ── Pages ─────────────────────────────────────────────────────────────────────
export { ModerationDashboard } from './pages/ModerationDashboard';
export { ReviewQueue }         from './pages/ReviewQueue';
export { CreateCasePage }      from './pages/CreateCasePage';

// ── Components ────────────────────────────────────────────────────────────────
export { CaseDetailsModal } from './components/CaseDetailsModal';
export { StatusBadge }      from './components/StatusBadge';
export { RiskBadge }        from './components/RiskBadge';

// ── Service ───────────────────────────────────────────────────────────────────
export { moderationService } from './services/moderationService';

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  ModerationCase,
  ModerationStats,
  ModerationStatus,
  ModerationSource,
  TargetType,
  ReasonCategory,
  CasesFilter,
  PageResponse,
  CreateCasePayload,
} from './types/moderation.types';
