import type { PdpMetric } from './pdpMetrics.service';
import { pdpMetricsService } from './pdpMetrics.service';

export type PdpMetricsBundle = {
  metrics: PdpMetric[];
  updatedAt: string;
};

export const pdpMetricsDashboardService = {
  async getBundle(): Promise<PdpMetricsBundle> {
    const metrics = await pdpMetricsService.getPdpMetrics();
    return {
      metrics,
      updatedAt: new Date().toISOString(),
    };
  },
};
