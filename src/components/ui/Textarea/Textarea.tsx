import styles from './Textarea.module.css';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  icon?: React.ReactNode;
}

export const Textarea = ({ icon, className, ...rest }: TextareaProps) => (
  <div className={styles.wrap}>
    {icon ? <span className={styles.icon}>{icon}</span> : null}
    <textarea
      className={`${styles.textarea} ${icon ? styles.withIcon : ''} ${className ?? ''}`}
      {...rest}
    />
  </div>
);
