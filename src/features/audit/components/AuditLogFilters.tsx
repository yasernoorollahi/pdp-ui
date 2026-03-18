import { Button, Input, Select } from '../../../components/ui';
import styles from './AuditLogFilters.module.css';

export interface AuditFiltersState {
  userId: string;
  email: string;
  eventType: string;
  sort: string;
  size: number;
}

interface AuditLogFiltersProps {
  title: string;
  filters: AuditFiltersState;
  eventTypeOptions: { value: string; label: string }[];
  onChange: (next: AuditFiltersState) => void;
  onApply: () => void;
  onReset: () => void;
  loading?: boolean;
}

const sortOptions = [
  { value: 'createdAt,desc', label: 'Newest first' },
  { value: 'createdAt,asc', label: 'Oldest first' },
];

const sizeOptions = [
  { value: '10', label: '10 per page' },
  { value: '20', label: '20 per page' },
  { value: '50', label: '50 per page' },
];

export const AuditLogFilters = ({
  title,
  filters,
  eventTypeOptions,
  onChange,
  onApply,
  onReset,
  loading,
}: AuditLogFiltersProps) => (
  <div className={styles.wrap}>
    <div className={styles.header}>
      <div>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.subtitle}>Filter by user, event type, and sort order.</p>
      </div>
      <div className={styles.actions}>
        <Button variant="ghost" onClick={onReset} disabled={loading}>Reset</Button>
        <Button variant="teal" onClick={onApply} disabled={loading}>Apply Filters</Button>
      </div>
    </div>
    <div className={styles.grid}>
      <Input
        placeholder="User ID"
        value={filters.userId}
        onChange={(event) => onChange({ ...filters, userId: event.target.value })}
      />
      <Input
        placeholder="Email"
        value={filters.email}
        onChange={(event) => onChange({ ...filters, email: event.target.value })}
      />
      <Select
        value={filters.eventType}
        onChange={(event) => onChange({ ...filters, eventType: event.target.value })}
        options={[{ value: '', label: 'All event types' }, ...eventTypeOptions]}
      />
      <Select
        value={filters.sort}
        onChange={(event) => onChange({ ...filters, sort: event.target.value })}
        options={sortOptions}
      />
      <Select
        value={String(filters.size)}
        onChange={(event) => onChange({ ...filters, size: Number(event.target.value) })}
        options={sizeOptions}
      />
    </div>
  </div>
);
