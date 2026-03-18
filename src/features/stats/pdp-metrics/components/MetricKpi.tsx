import styles from './MetricKpi.module.css';

type MetricKpiProps = {
  label: string;
  value: string;
  helper?: string;
  tone?: 'teal' | 'amber' | 'rose' | 'slate';
};

export const MetricKpi = ({ label, value, helper, tone = 'teal' }: MetricKpiProps) => (
  <div className={`${styles.kpi} ${styles[tone]}`}>
    <div className={styles.value}>{value}</div>
    <div className={styles.label}>{label}</div>
    {helper && <div className={styles.helper}>{helper}</div>}
  </div>
);
