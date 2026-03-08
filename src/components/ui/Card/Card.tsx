import styles from './Card.module.css';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  topLine?: boolean;
}

export const Card = ({ children, className, topLine }: CardProps) => (
  <div className={`${styles.card} ${topLine ? styles.topLine : ''} ${className ?? ''}`}>
    {children}
  </div>
);
