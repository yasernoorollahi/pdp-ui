// ─── Enums ────────────────────────────────────────────────────────────────────

export type ModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'AUTO_BLOCKED';
export type ModerationSource  = 'MANUAL' | 'AI' | 'SYSTEM';
export type TargetType        = 'USER' | 'CONTENT';
export type ReasonCategory    =
  | 'SPAM'
  | 'HATE_SPEECH'
  | 'HARASSMENT'
  | 'FRAUD'
  | 'VIOLENCE'
  | 'SELF_HARM'
  | 'OTHER';

// ─── Core entities ────────────────────────────────────────────────────────────

export interface ModerationCase {
  id: string;
  targetType: TargetType;
  targetId: string;
  status: ModerationStatus;
  source: ModerationSource;
  reasonCategory: ReasonCategory;
  comment: string;
  riskScore: number;       // 0–100
  aiConfidence: number;    // 0–1 (percentage stored as decimal)
  reviewedBy?: string;
  reviewedAt?: string | null;
  createdAt: string;       // ISO-8601
  updatedAt: string;
}

export interface ModerationStats {
  totalCases: number;
  pending: number;
  approved: number;
  rejected: number;
  autoBlocked: number;
  avgRiskScore: number;
  resolvedToday: number;
  newToday: number;
}

// ─── Request / response shapes ────────────────────────────────────────────────

export interface CreateCasePayload {
  targetType: TargetType;
  targetId: string;
  reasonCategory: ReasonCategory;
  comment: string;
}

export interface CasesFilter {
  status?: ModerationStatus | '';
  page: number;
  size: number;
  sort?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;       // current page (0-based)
  size: number;
}
