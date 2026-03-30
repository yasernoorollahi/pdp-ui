import axios from 'axios';
import api from '../api/axios';

export type ActuatorMetricMeasurement = {
  statistic: string;
  value: number;
};

export type ActuatorMetric = {
  name: string;
  measurements: ActuatorMetricMeasurement[];
  availableTags?: { tag: string; values: string[] }[];
};

export type ActuatorMetricsList = {
  names: string[];
};

export type PdpMetric = {
  name: string;
  measurements: ActuatorMetricMeasurement[];
};

const getPdpMetricNames = (names: string[]) => names.filter((name) => name.startsWith('pdp.'));

const getActuatorBaseUrl = () => {
  const baseURL = api.defaults.baseURL ?? '';
  if (typeof baseURL === 'string' && baseURL.endsWith('/api')) {
    return baseURL.replace(/\/api$/, '');
  }
  return baseURL;
};

const actuatorApi = axios.create({
  baseURL: getActuatorBaseUrl(),
});

actuatorApi.interceptors.request.use((config) => {
  if (config.url && !config.url.includes('/auth')) {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const pdpMetricsService = {
  async getPdpMetrics(): Promise<PdpMetric[]> {
    const listResponse = await actuatorApi.get<ActuatorMetricsList>('/actuator/metrics');
    const names = getPdpMetricNames(listResponse.data?.names ?? []);

    if (names.length === 0) return [];

    const results = await Promise.allSettled(
      names.map((name) =>
        actuatorApi.get<ActuatorMetric>(`/actuator/metrics/${encodeURIComponent(name)}`),
      ),
    );

    return results
      .flatMap((result) => (result.status === 'fulfilled' ? [result.value.data] : []))
      .map((metric) => ({
        name: metric.name,
        measurements: metric.measurements ?? [],
      }));
  },
};
