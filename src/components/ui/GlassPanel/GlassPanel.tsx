import '../Card/Card.module.css';
import styles from './GlassPanel.module.css';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassPanel = ({ children, className }: GlassPanelProps) => (
  <div className={`${styles.panel} glassCard ${className ?? ''}`}>{children}</div>
);
