import styles from './Badge.module.css';

type BadgeVariant = 'teal' | 'emerald' | 'red' | 'gold' | 'orange' | 'muted';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
  pulseDot?: boolean;
  className?: string;
}

export const Badge = ({ variant = 'muted', children, dot, pulseDot, className }: BadgeProps) => (
  <span className={`${styles.badge} ${styles[variant]} ${className ?? ''}`}>
    {(dot || pulseDot) && (
      <span className={`${styles.dot} ${pulseDot ? styles.dotPulse : ''}`} />
    )}
    {children}
  </span>
);
