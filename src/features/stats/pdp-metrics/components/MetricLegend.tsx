import styles from './MetricLegend.module.css';

type MetricLegendItem = {
  label: string;
  tone: 'series0' | 'series1' | 'series2' | 'series3' | 'series4';
};

type MetricLegendProps = {
  items: MetricLegendItem[];
};

export const MetricLegend = ({ items }: MetricLegendProps) => (
  <div className={styles.legend}>
    {items.map((item) => (
      <div key={item.label} className={styles.item}>
        <span className={`${styles.dot} ${styles[item.tone]}`} />
        <span className={styles.label}>{item.label}</span>
      </div>
    ))}
  </div>
);
