import type { ReactNode } from 'react';
import styles from './PdpMetricCard.module.css';

export type MetricKind =
  | 'duration'
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'insight'
  | 'neutral';

export type MetricSecondary = {
  label: string;
  value: string;
};

type PdpMetricCardProps = {
  title: string;
  metricKey: string;
  primaryValue: string;
  primaryLabel: string;
  secondary: MetricSecondary[];
  kind: MetricKind;
  level: 1 | 2 | 3 | 4 | 5;
  badge: string;
};

const ICONS: Record<MetricKind, ReactNode> = {
  duration: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  success: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  insight: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path d="M9.09 9a3 3 0 0 1 5.82 0c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
  neutral: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12h8" />
    </svg>
  ),
};

const kindClassMap: Record<MetricKind, string> = {
  duration: styles.kindDuration,
  success: styles.kindSuccess,
  error: styles.kindError,
  warning: styles.kindWarning,
  info: styles.kindInfo,
  insight: styles.kindInsight,
  neutral: styles.kindNeutral,
};

const levelClassMap: Record<number, string> = {
  1: styles.meterLevel1,
  2: styles.meterLevel2,
  3: styles.meterLevel3,
  4: styles.meterLevel4,
  5: styles.meterLevel5,
};

export const PdpMetricCard = ({
  title,
  metricKey,
  primaryValue,
  primaryLabel,
  secondary,
  kind,
  level,
  badge,
}: PdpMetricCardProps) => (
  <div className={`${styles.card} ${kindClassMap[kind]}`}>
    <div className={styles.header}>
      <div className={styles.iconWrap}>{ICONS[kind]}</div>
      <div className={styles.titleWrap}>
        <p className={styles.title}>{title}</p>
        <p className={styles.key}>{metricKey}</p>
      </div>
      <span className={styles.badge}>{badge}</span>
    </div>

    <div className={styles.valueRow}>
      <div className={styles.valueBlock}>
        <p className={styles.value}>{primaryValue}</p>
        <p className={styles.valueLabel}>{primaryLabel}</p>
      </div>
      <div className={`${styles.meter} ${levelClassMap[level]}`} aria-hidden>
        <span className={`${styles.meterBar} ${styles.meterBar1}`} />
        <span className={`${styles.meterBar} ${styles.meterBar2}`} />
        <span className={`${styles.meterBar} ${styles.meterBar3}`} />
        <span className={`${styles.meterBar} ${styles.meterBar4}`} />
        <span className={`${styles.meterBar} ${styles.meterBar5}`} />
      </div>
    </div>

    <div className={styles.footer}>
      {secondary.map((item) => (
        <div key={item.label} className={styles.footerItem}>
          <span className={styles.footerLabel}>{item.label}</span>
          <span className={styles.footerValue}>{item.value}</span>
        </div>
      ))}
    </div>
  </div>
);
