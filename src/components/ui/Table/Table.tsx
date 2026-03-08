import styles from './Table.module.css';

interface TableProps {
  headers: string[];
  columns: string;
  children: React.ReactNode;
}

export const Table = ({ headers, columns, children }: TableProps) => (
  <div>
    <div className={styles.header} style={{ gridTemplateColumns: columns }}>
      {headers.map((h) => <span key={h}>{h}</span>)}
    </div>
    <div className={styles.body}>
      {children}
    </div>
  </div>
);
