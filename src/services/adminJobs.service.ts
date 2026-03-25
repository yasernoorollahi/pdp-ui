import api from '../api/axios';

export interface AdminJobConfig {
  jobKey: string;
  description: string;
  configuredEnabled: boolean | null;
  overrideEnabled: boolean | null;
  effectiveEnabled: boolean | null;
}

export interface AdminJobsConfigResponse {
  globalEnabled: boolean | null;
  globalOverride: boolean | null;
  jobs: AdminJobConfig[];
  generatedAt: string;
}

export interface AdminJobsUpdateRequest {
  globalEnabled: boolean;
  jobs: Array<{
    jobKey: string;
    enabled: boolean;
  }>;
}

export interface AdminJobOverrideAuditItem {
  jobKey?: string;
  jobkey?: string;
  enabledOverride?: boolean | null;
  updatedAt: string;
  updatedBy?: string | null;
}

const JOB_AUDIT_ENDPOINTS = [
  '/admin/jobs/overrides',
  '/admin/jobs/changes',
  '/admin/jobs/latest',
] as const;

export const adminJobsService = {
  getJobsConfig: async (): Promise<AdminJobsConfigResponse> => {
    const response = await api.get('/admin/jobs');
    return response.data;
  },

  updateJobsConfig: async (
    payload: AdminJobsUpdateRequest,
  ): Promise<AdminJobsConfigResponse> => {
    const response = await api.put('/admin/jobs', payload);
    return response.data;
  },

  getJobOverrideAudit: async (): Promise<AdminJobOverrideAuditItem[]> => {
    let lastError: unknown;

    for (const endpoint of JOB_AUDIT_ENDPOINTS) {
      try {
        const response = await api.get(endpoint);
        const payload = response.data;

        if (Array.isArray(payload)) {
          return payload;
        }

        if (payload) {
          return [payload];
        }

        return [];
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
  },
};
