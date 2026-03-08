import styles from './Button.module.css';

type ButtonVariant = 'ghost' | 'teal' | 'emerald' | 'red' | 'orange' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button = ({ variant = 'ghost', loading, icon, children, className, ...rest }: ButtonProps) => (
  <button className={`${styles.btn} ${styles[variant]} ${className ?? ''}`} {...rest}>
    {loading ? <span className={styles.spinner} /> : icon}
    {children}
  </button>
);
