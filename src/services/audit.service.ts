import api from '../api/axios';

export type SecurityEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'LOGOUT_ALL_DEVICES'
  | 'TOKEN_REFRESH'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_UNLOCKED'
  | 'ACCOUNT_ENABLED'
  | 'ACCOUNT_DISABLED'
  | 'REGISTER';

export type BusinessEventType =
  | 'EXTRACTION_REQUESTED'
  | 'USER_MESSAGE_CREATED'
  | 'USER_MESSAGE_UPDATED'
  | 'USER_MESSAGE_DELETED'
  | 'USER_MESSAGE_PROCESSED'
  | 'SIGNAL_ENGINE_EXECUTED'
  | 'SIGNAL_NORMALIZATION_EXECUTED'
  | 'INSIGHTS_VIEWED'
  | 'ADMIN_SYSTEM_OVERVIEW_VIEWED'
  | 'TEST_DATA_SEEDED';

export interface SecurityAuditLog {
  id: string;
  userId: string | null;
  email: string | null;
  eventType: SecurityEventType | string;
  ipAddress: string | null;
  userAgent: string | null;
  details: string | null;
  createdAt: string;
  success: boolean;
}

export interface BusinessAuditLog {
  id: string;
  userId: string | null;
  email: string | null;
  eventType: BusinessEventType | string;
  details: string | null;
  createdAt: string;
  success: boolean;
}

export interface AuditPage<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  last: boolean;
  size: number;
  number: number;
  numberOfElements: number;
  first: boolean;
  empty: boolean;
}

export interface AuditQueryParams {
  userId?: string;
  email?: string;
  eventType?: string;
  page?: number;
  size?: number;
  sort?: string;
}

const buildParams = (params: AuditQueryParams) => {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== '');
  return Object.fromEntries(entries);
};

export const auditService = {
  getSecurityLogs: async (params: AuditQueryParams): Promise<AuditPage<SecurityAuditLog>> => {
    const response = await api.get('/admin/audit/security', { params: buildParams(params) });
    return response.data;
  },
  getBusinessLogs: async (params: AuditQueryParams): Promise<AuditPage<BusinessAuditLog>> => {
    const response = await api.get('/admin/audit/business', { params: buildParams(params) });
    return response.data;
  },
};
