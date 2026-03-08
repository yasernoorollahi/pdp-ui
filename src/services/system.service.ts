import api from '../api/axios';

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  lockedUsers: number;
  totalItems: number;
  activeItems: number;
  archivedItems: number;
  totalRefreshTokens: number;
  activeRefreshTokens: number;
  pendingNotifications: number;
}

export interface SystemOverview {
  businessStats: SystemStats;
  system: OverviewData;
  recentJobs: JobLog[];
  generatedAt: string;
}

export interface OverviewData {
  overallStatus: string;
  healthComponents: Record<string, string>;
  metrics: {
    jvmHeapUsedBytes: number;
    jvmHeapMaxBytes: number;
    jvmThreadsLive: number;
    processCpuUsage: number;
    systemCpuUsage: number;
    processUptimeSeconds: number;
    httpServerRequestsCount: number;
    httpServerRequestsMeanSeconds: number;
    hikari: {
      activeConnections: number;
      idleConnections: number;
      pendingConnections: number;
      maxConnections: number;
      minConnections: number;
    };
    itemCreatedCount: number;
  };
  generatedAt: string;
}

export interface JobLog {
  id: string;
  jobName: string;
  startedAt: string;
  finishedAt: string;
  status: 'SUCCESS' | 'FAILED' | 'RUNNING' | string;
  duration: number;
  processedCount: number;
  errorMessage: string | null;
}

export const systemService = {
  getSystemOverview: async (): Promise<SystemOverview> => {
    const response = await api.get('/admin/system-overview');
    return response.data;
  },
};
