import styles from './Switch.module.css';

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
}

export const Switch = ({
  checked,
  onChange,
  disabled,
  className,
  label,
  description,
  ...rest
}: SwitchProps) => (
  <label className={`${styles.root} ${disabled ? styles.rootDisabled : ''} ${className ?? ''}`}>
    <input
      {...rest}
      checked={checked}
      className={styles.input}
      disabled={disabled}
      onChange={(event) => onChange?.(event.target.checked)}
      type="checkbox"
    />
    <span className={styles.track} aria-hidden>
      <span className={styles.thumb} />
    </span>
    {(label || description) && (
      <span className={styles.content}>
        {label && <span className={styles.label}>{label}</span>}
        {description && <span className={styles.description}>{description}</span>}
      </span>
    )}
  </label>
);
