import styles from './PageWrapper.module.css';

interface PageWrapperProps {
  children: React.ReactNode;
}

export const PageWrapper = ({ children }: PageWrapperProps) => (
  <div className={styles.wrapper}>
    {children}
  </div>
);
