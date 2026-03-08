import styles from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  onClear?: () => void;
}

export const Input = ({ icon, onClear, className, ...rest }: InputProps) => (
  <div className={styles.wrap}>
    {icon && <span className={styles.icon}>{icon}</span>}
    <input className={`${styles.input} ${icon ? styles.withIcon : ''} ${className ?? ''}`} {...rest} />
    {onClear && rest.value && (
      <button className={styles.clear} onClick={onClear} type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    )}
  </div>
);
