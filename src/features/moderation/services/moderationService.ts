import api from '../../../api/axios';
import axios from 'axios';
import type {
  ModerationCase,
  ModerationStats,
  CasesFilter,
  CreateCasePayload,
  PageResponse,
} from '../types/moderation.types';

const MIN_PAGE_SIZE = 20;
const UNAUTHORIZED_STATUSES = new Set([401, 403]);

export const moderationService = {
  getStats: async (): Promise<ModerationStats> => buildStatsFromCases(),

  getCases: async (filter: CasesFilter): Promise<PageResponse<ModerationCase>> => {
    const params: Record<string, unknown> = {
      page: filter.page,
      size: Math.max(filter.size, MIN_PAGE_SIZE),
    };

    if (filter.status) params.status = filter.status;
    if (filter.sort) params.sort = filter.sort;

    let result = await fetchCasesPage(params);

    // Backward compatibility: some backends still use BLOCKED.
    if (!result.page && !result.unauthorized && filter.status === 'AUTO_BLOCKED') {
      result = await fetchCasesPage({ ...params, status: 'BLOCKED' });
    }

    // Some backends fail on unknown sort fields; retry without sort.
    if (!result.page && !result.unauthorized && 'sort' in params) {
      const retryParams = { ...params };
      delete retryParams.sort;
      result = await fetchCasesPage(retryParams);
    }

    if (result.unauthorized) {
      throw new Error('UNAUTHORIZED');
    }

    if (!result.page) {
      throw new Error('Failed to load moderation cases');
    }

    return {
      ...result.page,
      content: result.page.content.map(normalizeCase),
    };
  },

  getCaseById: async (id: string): Promise<ModerationCase> => {
    try {
      const res = await api.get(`/admin/moderation/cases/${id}`);
      return normalizeCase(unwrapPayload(res.data));
    } catch (error) {
      if (axios.isAxiosError(error) && UNAUTHORIZED_STATUSES.has(error.response?.status ?? 0)) {
        throw new Error('UNAUTHORIZED');
      }
      throw error;
    }
  },

  createCase: async (payload: CreateCasePayload): Promise<ModerationCase> => {
    try {
      const res = await api.post('/admin/moderation/cases', payload);
      return normalizeCase(unwrapPayload(res.data));
    } catch (error) {
      if (axios.isAxiosError(error) && UNAUTHORIZED_STATUSES.has(error.response?.status ?? 0)) {
        throw new Error('UNAUTHORIZED');
      }
      throw error;
    }
  },

  approveCase: async (id: string, comment?: string): Promise<ModerationCase> => {
    try {
      const res = await api.post(`/admin/moderation/cases/${id}/approve`, comment ? { comment } : {});
      return normalizeCase(unwrapPayload(res.data));
    } catch (error) {
      if (axios.isAxiosError(error) && UNAUTHORIZED_STATUSES.has(error.response?.status ?? 0)) {
        throw new Error('UNAUTHORIZED');
      }
      throw error;
    }
  },

  rejectCase: async (id: string, comment?: string): Promise<ModerationCase> => {
    try {
      const res = await api.post(`/admin/moderation/cases/${id}/reject`, comment ? { comment } : {});
      return normalizeCase(unwrapPayload(res.data));
    } catch (error) {
      if (axios.isAxiosError(error) && UNAUTHORIZED_STATUSES.has(error.response?.status ?? 0)) {
        throw new Error('UNAUTHORIZED');
      }
      throw error;
    }
  },

  autoBlockCase: async (id: string, comment?: string): Promise<ModerationCase> => {
    try {
      const res = await api.post(`/admin/moderation/cases/${id}/auto-block`, comment ? { comment } : {});
      return normalizeCase(unwrapPayload(res.data));
    } catch (error) {
      if (axios.isAxiosError(error) && UNAUTHORIZED_STATUSES.has(error.response?.status ?? 0)) {
        throw new Error('UNAUTHORIZED');
      }
      throw error;
    }
  },
};

const unwrapPayload = <T>(data: unknown): T => {
  if (data && typeof data === 'object') {
    const payload = data as Record<string, unknown>;
    if ('data' in payload) return payload.data as T;
    if ('result' in payload) return payload.result as T;
    if ('payload' in payload) return payload.payload as T;
  }
  return data as T;
};

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

const normalizeCase = (raw: unknown): ModerationCase => {
  const r = (raw ?? {}) as Record<string, unknown>;

  return {
    id: asString(r.id),
    targetType: asString(r.targetType ?? r.target_type) as ModerationCase['targetType'],
    targetId: asString(r.targetId ?? r.target_id),
    status: asString(r.status) as ModerationCase['status'],
    source: asString(r.source) as ModerationCase['source'],
    reasonCategory: asString(r.reasonCategory ?? r.reason_category) as ModerationCase['reasonCategory'],
    comment: asString(r.comment),
    riskScore: toNumber(r.riskScore ?? r.risk_score),
    aiConfidence: toNumber(r.aiConfidence ?? r.ai_confidence),
    reviewedBy: asString(r.reviewedBy ?? r.reviewed_by) || undefined,
    reviewedAt: asString(r.reviewedAt ?? r.reviewed_at) || null,
    createdAt: asString(r.createdAt ?? r.created_at),
    updatedAt: asString(r.updatedAt ?? r.updated_at),
  };
};

const normalizePageResponse = <T>(raw: unknown): PageResponse<T> => {
  const r = (raw ?? {}) as Record<string, unknown>;
  const content = Array.isArray(r.content) ? (r.content as T[]) : [];

  return {
    content,
    totalElements: toNumber(r.totalElements ?? r.total_elements ?? content.length),
    totalPages: toNumber(r.totalPages ?? r.total_pages ?? 1),
    number: toNumber(r.number ?? r.page ?? 0),
    size: toNumber(r.size ?? content.length),
  };
};

const buildStatsFromCases = async (): Promise<ModerationStats> => {
  try {
    const result = await fetchCasesPage({ page: 0, size: 50 });
    if (!result.page) {
      throw new Error('Failed to load');
    }
    const items = result.page.content.map(normalizeCase);

    const pending = items.filter((c) => c.status === 'PENDING').length;
    const approved = items.filter((c) => c.status === 'APPROVED').length;
    const rejected = items.filter((c) => c.status === 'REJECTED').length;
    const autoBlocked = items.filter((c) => c.status === 'AUTO_BLOCKED').length;

    let avgRiskScore = 0;
    if (items.length > 0) {
      avgRiskScore = Math.round(items.reduce((sum, c) => sum + c.riskScore, 0) / items.length);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newToday = items.filter((c) => {
      const d = new Date(c.createdAt);
      return !Number.isNaN(d.getTime()) && d >= today;
    }).length;

    const resolvedToday = items.filter((c) => {
      if (c.status === 'PENDING') return false;
      const stamp = c.reviewedAt || c.updatedAt;
      const d = new Date(stamp);
      return !Number.isNaN(d.getTime()) && d >= today;
    }).length;

    return {
      totalCases: result.page.totalElements || items.length,
      pending,
      approved,
      rejected,
      autoBlocked,
      avgRiskScore,
      resolvedToday,
      newToday,
    };
  } catch {
    return {
      totalCases: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      autoBlocked: 0,
      avgRiskScore: 0,
      resolvedToday: 0,
      newToday: 0,
    };
  }
};

const fetchCasesPage = async (params: Record<string, unknown>) => {
  try {
    const res = await api.get('/admin/moderation/cases', { params });
    return { page: normalizePageResponse<unknown>(unwrapPayload(res.data)), unauthorized: false };
  } catch (error) {
    if (axios.isAxiosError(error) && UNAUTHORIZED_STATUSES.has(error.response?.status ?? 0)) {
      return { page: null, unauthorized: true };
    }
    return { page: null, unauthorized: false };
  }
};
