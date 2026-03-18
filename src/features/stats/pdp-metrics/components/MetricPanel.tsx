import type { ReactNode } from 'react';
import { Card } from '../../../../components/ui';
import styles from './MetricPanel.module.css';

type MetricPanelProps = {
  title: string;
  subtitle?: string;
  metrics?: string[];
  badge?: string;
  size?: 'default' | 'wide';
  children: ReactNode;
};

export const MetricPanel = ({ title, subtitle, metrics = [], badge, size = 'default', children }: MetricPanelProps) => (
  <Card className={`${styles.panel} glassCard ${size === 'wide' ? styles.panelWide : ''}`}>
    <div className={styles.header}>
      <div>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>{title}</h3>
          {badge && <span className={styles.badge}>{badge}</span>}
        </div>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {metrics.length > 0 && (
        <div className={styles.metricTags}>
          {metrics.map((metric) => (
            <span key={metric} className={styles.metricTag}>{metric}</span>
          ))}
        </div>
      )}
    </div>
    <div className={styles.body}>{children}</div>
  </Card>
);
