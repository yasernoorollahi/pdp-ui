import styles from './Select.module.css';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  label?: string;
}

export const Select = ({ options, label, className, ...rest }: SelectProps) => (
  <div className={styles.wrap}>
    {label && <span className={styles.label}>{label}</span>}
    <div className={styles.selectWrap}>
      <select className={`${styles.select} ${className ?? ''}`} {...rest}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className={styles.chevron}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </span>
    </div>
  </div>
);
