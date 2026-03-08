import styles from './StatItem.module.css';

type StatVariant = 'teal' | 'red' | 'gold' | 'emerald';

interface StatItemProps {
  label: string;
  value: string | number;
  change?: string;
  up?: boolean | null;
  variant: StatVariant;
  icon?: React.ReactNode;
}

export const StatItem = ({ label, value, change, up, variant, icon }: StatItemProps) => (
  <div className={`${styles.card} ${styles[variant]}`}>
    {icon && <div className={styles.icon}>{icon}</div>}
    <div className={styles.value}>{value}</div>
    <div className={styles.label}>{label}</div>
    {change && (
      <div className={`${styles.change} ${up === true ? styles.up : up === false ? styles.down : styles.neutral}`}>
        {up === true && '↑ '}{up === false && '↓ '}{change}
      </div>
    )}
    <div className={styles.glow} />
  </div>
);
