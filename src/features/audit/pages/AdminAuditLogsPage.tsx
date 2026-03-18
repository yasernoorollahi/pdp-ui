import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, GlassPanel } from '../../../components/ui';
import { auditService } from '../../../services/audit.service';
import type {
  AuditPage,
  AuditQueryParams,
  BusinessAuditLog,
  SecurityAuditLog,
} from '../../../services/audit.service';
import { AuditLogFilters } from '../components/AuditLogFilters';
import type { AuditFiltersState } from '../components/AuditLogFilters';
import { AuditLogSkeleton } from '../components/AuditLogSkeleton';
import { AuditLogState } from '../components/AuditLogState';
import { AuditLogTable } from '../components/AuditLogTable';
import styles from './AdminAuditLogsPage.module.css';

const SECURITY_EVENT_OPTIONS = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'LOGOUT',
  'LOGOUT_ALL_DEVICES',
  'TOKEN_REFRESH',
  'ACCOUNT_LOCKED',
  'ACCOUNT_UNLOCKED',
  'ACCOUNT_ENABLED',
  'ACCOUNT_DISABLED',
  'REGISTER',
].map((value) => ({ value, label: value.replace(/_/g, ' ') }));

const BUSINESS_EVENT_OPTIONS = [
  'EXTRACTION_REQUESTED',
  'USER_MESSAGE_CREATED',
  'USER_MESSAGE_UPDATED',
  'USER_MESSAGE_DELETED',
  'USER_MESSAGE_PROCESSED',
  'SIGNAL_ENGINE_EXECUTED',
  'SIGNAL_NORMALIZATION_EXECUTED',
  'INSIGHTS_VIEWED',
  'ADMIN_SYSTEM_OVERVIEW_VIEWED',
  'TEST_DATA_SEEDED',
].map((value) => ({ value, label: value.replace(/_/g, ' ') }));

const defaultFilters: AuditFiltersState = {
  userId: '',
  email: '',
  eventType: '',
  sort: 'createdAt,desc',
  size: 20,
};

type TabKey = 'security' | 'business';

type AuditLogData = AuditPage<SecurityAuditLog> | AuditPage<BusinessAuditLog>;

export const AdminAuditLogsPage = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('security');
  const [filters, setFilters] = useState<AuditFiltersState>(defaultFilters);
  const [query, setQuery] = useState<AuditQueryParams>({ ...defaultFilters, page: 0 });
  const [data, setData] = useState<AuditLogData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventOptions = activeTab === 'security' ? SECURITY_EVENT_OPTIONS : BUSINESS_EVENT_OPTIONS;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = activeTab === 'security'
        ? await auditService.getSecurityLogs(query)
        : await auditService.getBusinessLogs(query);
      setData(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load audit logs.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, query]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const logs = data?.content ?? [];
  const isEmpty = !loading && !error && logs.length === 0;

  const pageLabel = useMemo(() => {
    if (!data) return 'Page 1';
    return `Page ${data.number + 1} of ${Math.max(data.totalPages, 1)}`;
  }, [data]);

  const totalLabel = data ? `${data.totalElements} total` : '0 total';

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setFilters(defaultFilters);
    setQuery({ ...defaultFilters, page: 0 });
  };

  const handleApply = () => {
    setQuery({ ...filters, page: 0 });
  };

  const handleReset = () => {
    setFilters(defaultFilters);
    setQuery({ ...defaultFilters, page: 0 });
  };

  const handlePageChange = (nextPage: number) => {
    setQuery((prev) => ({ ...prev, page: nextPage }));
  };

  const handleRefresh = () => {
    setQuery((prev) => ({ ...prev }));
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Audit Logs</h2>
          <p className={styles.subtitle}>Deep visibility into security and business events.</p>
        </div>
        <div className={styles.tabGroup}>
          <button
            type="button"
            onClick={() => handleTabChange('security')}
            className={`${styles.tabButton} ${activeTab === 'security' ? styles.tabActive : ''}`}
          >
            Security Logs
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('business')}
            className={`${styles.tabButton} ${activeTab === 'business' ? styles.tabActive : ''}`}
          >
            Business Logs
          </button>
        </div>
      </div>

      <GlassPanel className={styles.filtersPanel}>
        <AuditLogFilters
          title={activeTab === 'security' ? 'Security Audit Filters' : 'Business Event Filters'}
          filters={filters}
          eventTypeOptions={eventOptions}
          onChange={setFilters}
          onApply={handleApply}
          onReset={handleReset}
          loading={loading}
        />
      </GlassPanel>

      <GlassPanel>
        <div className={styles.listHeader}>
          <div>
            <h3 className={styles.listTitle}>
              {activeTab === 'security' ? 'Security Events' : 'Business Events'}
            </h3>
            <p className={styles.listSubtitle}>Showing {totalLabel}</p>
          </div>
          <div className={styles.listMeta}>
            <Badge variant="muted">{pageLabel}</Badge>
            <Button variant="ghost" onClick={handleRefresh} disabled={loading}>Refresh</Button>
          </div>
        </div>

        {loading && <AuditLogSkeleton />}

        {!loading && error && (
          <AuditLogState
            title="Unable to load logs"
            message={error}
            actionLabel="Retry"
            onAction={fetchLogs}
          />
        )}

        {!loading && !error && isEmpty && (
          <AuditLogState
            title="No logs found"
            message="Try adjusting filters or broaden the time range."
          />
        )}

        {!loading && !error && !isEmpty && (
          <AuditLogTable variant={activeTab} logs={logs} />
        )}

        {!loading && !error && data && (
          <div className={styles.pagination}>
            <Button
              variant="ghost"
              onClick={() => handlePageChange(Math.max(data.number - 1, 0))}
              disabled={data.first}
            >
              Previous
            </Button>
            <span className={styles.pageIndicator}>{pageLabel}</span>
            <Button
              variant="ghost"
              onClick={() => handlePageChange(data.number + 1)}
              disabled={data.last}
            >
              Next
            </Button>
          </div>
        )}
      </GlassPanel>
    </div>
  );
};
