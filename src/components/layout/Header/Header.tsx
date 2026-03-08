import styles from './Header.module.css';

interface HeaderProps {
  title: string;
  breadcrumb?: string;
  right?: React.ReactNode;
}

export const Header = ({ title, breadcrumb, right }: HeaderProps) => (
  <header className={styles.topbar}>
    <div className={styles.left}>
      <h1 className={styles.title}>{title}</h1>
      {breadcrumb && <span className={styles.breadcrumb}>{breadcrumb}</span>}
    </div>
    {right && <div className={styles.right}>{right}</div>}
  </header>
);
