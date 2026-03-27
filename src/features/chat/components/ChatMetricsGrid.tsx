import { StatItem } from '../../../components/ui';
import type { ChatDashboardMetric } from '../types/chat.types';
import styles from './ChatMetricsGrid.module.css';

interface ChatMetricsGridProps {
  metrics: ChatDashboardMetric[];
}

const metricIcons: Record<ChatDashboardMetric['id'], React.ReactNode> = {
  'thread-depth': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 8h10" />
      <path d="M7 12h6" />
      <path d="M7 16h8" />
      <rect x="3" y="4" width="18" height="16" rx="4" />
    </svg>
  ),
  'assistant-coverage': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l2.4 4.86L20 8.7l-4 3.9.94 5.4L12 15.5 7.06 18l.94-5.4-4-3.9 5.6-.84L12 3z" />
    </svg>
  ),
  'delivery-health': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  'signal-queue': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="6" cy="12" r="2" />
      <circle cx="18" cy="6" r="2" />
      <circle cx="18" cy="18" r="2" />
      <path d="M8 12h4" />
      <path d="M14 12h2a2 2 0 0 0 2-2V8" />
      <path d="M14 12h2a2 2 0 0 1 2 2v2" />
    </svg>
  ),
};

export const ChatMetricsGrid = ({ metrics }: ChatMetricsGridProps) => (
  <section className={styles.metricsGrid} aria-label="Chat overview metrics">
    {metrics.map((metric) => (
      <StatItem
        key={metric.id}
        label={metric.label}
        value={metric.value}
        change={metric.change}
        up={metric.up}
        variant={metric.variant}
        icon={metricIcons[metric.id]}
      />
    ))}
  </section>
);
