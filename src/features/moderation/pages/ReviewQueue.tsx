import { useState, useEffect, useCallback } from 'react';
import { moderationService } from '../services/moderationService';
import type { ModerationCase, ModerationStatus, CasesFilter } from '../types/moderation.types';
import { StatusBadge } from '../components/StatusBadge';
import { RiskBadge } from '../components/RiskBadge';
import { CaseDetailsModal } from '../components/CaseDetailsModal';
import { Table } from '../../../components/ui/Table/Table';
import { Card } from '../../../components/ui/Card/Card';
import { Button } from '../../../components/ui/Button/Button';
import { Badge } from '../../../components/ui/Badge/Badge';
import { Skeleton } from '../../../components/ui/Skeleton/Skeleton';
import { Header } from '../../../components/layout/Header/Header';
import { PageWrapper } from '../../../components/layout/PageWrapper/PageWrapper';
import styles from './ReviewQueue.module.css';

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { value: ModerationStatus | ''; label: string }[] = [
  { value: '',         label: 'All Statuses' },
  { value: 'PENDING',  label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'AUTO_BLOCKED',  label: 'Auto Blocked' },
];

const TARGET_LABELS: Record<string, string> = {
  USER: 'User',
  CONTENT: 'Content',
};

const SOURCE_LABELS: Record<string, string> = {
  AI: 'AI',
  SYSTEM: 'System',
  MANUAL: 'Manual',
};

const REASON_LABELS: Record<string, string> = {
  SPAM: 'Spam',
  HATE_SPEECH: 'Hate Speech',
  HARASSMENT: 'Harassment',
  FRAUD: 'Fraud',
  VIOLENCE: 'Violence',
  SELF_HARM: 'Self Harm',
  OTHER: 'Other',
};

const TABLE_HEADERS = ['Target', 'Risk Score', 'Category', 'Status', 'Source', 'Created', 'Actions'];
const TABLE_COLUMNS = '1fr 100px 120px 120px 90px 110px 100px';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export const ReviewQueue = () => {
  const [cases, setCases]           = useState<ModerationCase[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage]             = useState(0);
  const [statusFilter, setStatusFilter] = useState<ModerationStatus | ''>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionId, setActionId]     = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'block' | null>(null);

  // ── Load cases ─────────────────────────────────────────────────────────────
  const load = useCallback(async (p: number, status: ModerationStatus | '') => {
    setLoading(true);
    setError(null);
    const filter: CasesFilter = {
      page: p,
      size: PAGE_SIZE,
      status: status || undefined,
    };
    try {
      const res = await moderationService.getCases(filter);
      setCases(res.content);
      setTotalPages(res.totalPages);
      setTotalItems(res.totalElements);
    } catch (error) {
      const message = error instanceof Error && error.message === 'UNAUTHORIZED'
        ? 'Session expired. Please login again.'
        : 'Failed to load moderation cases. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(page, statusFilter); }, [load, page, statusFilter]);

  const handleFilterChange = (status: ModerationStatus | '') => {
    setStatusFilter(status);
    setPage(0);
  };

  // ── Inline quick action ────────────────────────────────────────────────────
  const handleQuickAction = async (
    c: ModerationCase,
    action: 'approve' | 'reject' | 'block',
  ) => {
    setActionId(c.id);
    setActionType(action);
    try {
      let updated: ModerationCase;
      if (action === 'approve')      updated = await moderationService.approveCase(c.id);
      else if (action === 'reject')  updated = await moderationService.rejectCase(c.id);
      else                           updated = await moderationService.autoBlockCase(c.id);
      setCases((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch {
      setError('Action failed. Please try again.');
    } finally {
      setActionId(null);
      setActionType(null);
    }
  };

  // ── Modal callback ─────────────────────────────────────────────────────────
  const handleActionComplete = (updated: ModerationCase) => {
    setCases((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
  };

  // ── Header right ───────────────────────────────────────────────────────────
  const headerRight = totalItems > 0 ? (
    <Badge variant="gold" pulseDot>
      {cases.filter((c) => c.status === 'PENDING').length} pending
    </Badge>
  ) : undefined;

  return (
    <>
      <Header
        title="Review Queue"
        breadcrumb="Console · Moderation · Cases"
        right={headerRight}
      />

      <PageWrapper>

        {/* ── Filters ────────────────────────────────────────────────── */}
        <div className={styles.toolbar}>
          <div className={styles.filterGroup}>
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`${styles.filterBtn} ${statusFilter === opt.value ? styles.filterBtnActive : ''}`}
                onClick={() => handleFilterChange(opt.value as ModerationStatus | '')}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <span className={styles.totalCount}>
            {loading ? '…' : `${totalItems} case${totalItems !== 1 ? 's' : ''}`}
          </span>
        </div>

        {/* ── Table ──────────────────────────────────────────────────── */}
        <Card topLine>
          {loading && <Skeleton count={PAGE_SIZE} height="52px" />}

          {!loading && error && (
            <div className={styles.errorBanner}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {!loading && !error && cases.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className={styles.emptyTitle}>Queue is empty</p>
              <p className={styles.emptyDesc}>
                {statusFilter
                  ? `No ${statusFilter.toLowerCase()} cases found.`
                  : 'No moderation cases found.'}
              </p>
            </div>
          )}

          {!loading && !error && cases.length > 0 && (
            <Table headers={TABLE_HEADERS} columns={TABLE_COLUMNS}>
              {cases.map((c, i) => (
                <div
                  key={c.id}
                  className={`${styles.row} ${c.status === 'PENDING' ? styles.rowPending : ''}`}
                  style={{ animationDelay: `${i * 0.03}s` }}
                >
                  {/* Target */}
                  <div className={styles.targetCell}>
                    <span className={styles.targetType}>
                      {TARGET_LABELS[c.targetType] ?? c.targetType}
                    </span>
                    <span className={styles.targetId}>{c.targetId}</span>
                  </div>

                  {/* Risk score */}
                  <div><RiskBadge score={c.riskScore} /></div>

                  {/* Reason category */}
                  <span className={styles.categoryText}>
                    {REASON_LABELS[c.reasonCategory] ?? c.reasonCategory}
                  </span>

                  {/* Status */}
                  <div><StatusBadge status={c.status} /></div>

                  {/* Source */}
                  <span className={styles.sourceText}>
                    {SOURCE_LABELS[c.source] ?? c.source}
                  </span>

                  {/* Date */}
                  <span className={styles.dateText}>{formatDate(c.createdAt)}</span>

                  {/* Actions */}
                  <div className={styles.actionsCell}>
                    <Button
                      variant="icon"
                      title="View details"
                      onClick={() => setSelectedId(c.id)}
                      icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      }
                    />

                    {c.status === 'PENDING' && (
                      <>
                        <Button
                          variant="icon"
                          title="Approve"
                          disabled={actionId === c.id}
                          loading={actionId === c.id && actionType === 'approve'}
                          onClick={() => handleQuickAction(c, 'approve')}
                          className={styles.approveBtn}
                          icon={
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          }
                        />
                        <Button
                          variant="icon"
                          title="Auto Block"
                          disabled={actionId === c.id}
                          loading={actionId === c.id && actionType === 'block'}
                          onClick={() => handleQuickAction(c, 'block')}
                          className={styles.blockBtn}
                          icon={
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                          }
                        />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </Table>
          )}
        </Card>

        {/* ── Pagination ─────────────────────────────────────────────── */}
        {!loading && totalPages > 1 && (
          <div className={styles.pagination}>
            <Button
              variant="ghost"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              }
            >
              Previous
            </Button>

            <div className={styles.pageNumbers}>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  className={`${styles.pageNum} ${i === page ? styles.pageNumActive : ''}`}
                  onClick={() => setPage(i)}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <Button
              variant="ghost"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              }
            >
              Next
            </Button>
          </div>
        )}
      </PageWrapper>

      {/* ── Case Details Modal ─────────────────────────────────────── */}
      <CaseDetailsModal
        caseId={selectedId}
        onClose={() => setSelectedId(null)}
        onActionComplete={handleActionComplete}
      />
    </>
  );
};
