import type { PdpMetric } from '../../../services/pdpMetrics.service';
import type { BoxPlot, ChartSeries, FunnelStage, PieSlice, ScatterPoint } from '../../../components/ui/MetricChart/MetricChart';

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const seeded = (seed: number, index: number) => {
  const x = Math.sin(seed + index * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

export const getMetricStat = (metrics: PdpMetric[], name: string, stat: string) => {
  const metric = metrics.find((item) => item.name === name);
  const entry = metric?.measurements.find((m) => m.statistic === stat);
  return entry?.value ?? 0;
};

export const getMetricCount = (metrics: PdpMetric[], name: string) => {
  const count = getMetricStat(metrics, name, 'COUNT');
  if (count) return count;
  return getMetricStat(metrics, name, 'VALUE');
};

export const getMetricAvgDuration = (metrics: PdpMetric[], name: string) => {
  const total = getMetricStat(metrics, name, 'TOTAL_TIME');
  const count = getMetricStat(metrics, name, 'COUNT');
  if (!count) return 0;
  return total / count;
};

export const buildSeries = (seedKey: string, base: number, length = 12, variance = 0.35): number[] => {
  const seed = hashString(seedKey);
  if (base <= 0) {
    return Array.from({ length }, () => 0);
  }
  return Array.from({ length }, (_, index) => {
    const jitter = seeded(seed, index) * variance * 2 - variance;
    const value = base * (1 + jitter);
    return Math.max(0, value);
  });
};

export const buildSeriesSet = (keys: string[], bases: number[], length = 12) =>
  keys.map((key, index) => ({
    id: key,
    values: buildSeries(key, bases[index] ?? 1, length),
  }));

export const buildHistogram = (seedKey: string, base: number, bins = 10) => {
  const seed = hashString(seedKey);
  if (base <= 0) {
    return Array.from({ length: bins }, () => 0);
  }
  return Array.from({ length: bins }, (_, index) => {
    const phase = index / Math.max(1, bins - 1);
    const curve = Math.exp(-Math.pow((phase - 0.45) * 2.6, 2));
    const jitter = seeded(seed, index + 3) * 0.3 + 0.8;
    return base * curve * jitter;
  });
};

export const buildBoxPlot = (seedKey: string, base: number): BoxPlot => {
  const seed = hashString(seedKey);
  const min = Math.max(0.1, base * (0.4 + seeded(seed, 1) * 0.2));
  const q1 = base * (0.7 + seeded(seed, 2) * 0.15);
  const median = base * (0.95 + seeded(seed, 3) * 0.1);
  const q3 = base * (1.2 + seeded(seed, 4) * 0.2);
  const max = base * (1.6 + seeded(seed, 5) * 0.3);
  return { min, q1, median, q3, max };
};

export const buildViolin = (seedKey: string, base: number, points = 12) => {
  const seed = hashString(seedKey);
  return Array.from({ length: points }, (_, index) => {
    const phase = index / Math.max(1, points - 1);
    const curve = Math.exp(-Math.pow((phase - 0.5) * 2.4, 2));
    const jitter = 0.8 + seeded(seed, index) * 0.4;
    return base * curve * jitter;
  });
};

export const buildScatter = (seedKey: string, points = 16): ScatterPoint[] => {
  const seed = hashString(seedKey);
  return Array.from({ length: points }, (_, index) => {
    const x = seeded(seed, index) * 0.9 + 0.05;
    const y = seeded(seed, index + 11) * 0.8 + 0.1;
    return { x, y };
  });
};

export const buildFunnel = (stages: FunnelStage[]) => stages;

export const buildPie = (items: PieSlice[]) => items;

export const buildLineSeries = (label: string, base: number, length = 12): ChartSeries[] => [
  { id: label, values: buildSeries(label, base, length) },
];
