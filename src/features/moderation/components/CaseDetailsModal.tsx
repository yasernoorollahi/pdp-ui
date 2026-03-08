import { useState, useEffect, useCallback } from 'react';
import { moderationService } from '../services/moderationService';
import type { ModerationCase } from '../types/moderation.types';
import { StatusBadge } from './StatusBadge';
import { RiskBadge } from './RiskBadge';
import { Button } from '../../../components/ui/Button/Button';
import styles from './CaseDetailsModal.module.css';

interface CaseDetailsModalProps {
  caseId: string | null;
  onClose: () => void;
  onActionComplete: (updated: ModerationCase) => void;
}

const REASON_LABELS: Record<string, string> = {
  SPAM:            'Spam',
  FRAUD:           'Fraud',
  HATE_SPEECH:     'Hate Speech',
  HARASSMENT:      'Harassment',
  VIOLENCE:        'Violence',
  SELF_HARM:       'Self Harm',
  OTHER:           'Other',
};

const SOURCE_LABELS: Record<string, string> = {
  AI:       'AI',
  SYSTEM:   'System',
  MANUAL:   'Manual',
};

const TARGET_LABELS: Record<string, string> = {
  USER:    'User',
  CONTENT: 'Content',
};

export const CaseDetailsModal = ({
  caseId,
  onClose,
  onActionComplete,
}: CaseDetailsModalProps) => {
  const [caseData, setCaseData] = useState<ModerationCase | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [actionId, setActionId] = useState<'approve' | 'reject' | 'block' | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [visible, setVisible]   = useState(false);

  // ── Animate in ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (caseId) {
      setVisible(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    }
  }, [caseId]);

  // ── Fetch case ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    setCaseData(null);
    setReviewComment('');

    moderationService
      .getCaseById(caseId)
      .then(setCaseData)
      .catch(() => setError('Failed to load case details.'))
      .finally(() => setLoading(false));
  }, [caseId]);

  // ── Close on Escape ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 280);
  }, [onClose]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleAction = async (action: 'approve' | 'reject' | 'block') => {
    if (!caseData) return;
    setActionId(action);
    try {
      let updated: ModerationCase;
      if (action === 'approve') updated = await moderationService.approveCase(caseData.id, reviewComment || undefined);
      else if (action === 'reject') updated = await moderationService.rejectCase(caseData.id, reviewComment || undefined);
      else updated = await moderationService.autoBlockCase(caseData.id, reviewComment || undefined);
      setCaseData(updated);
      onActionComplete(updated);
    } catch {
      setError('Action failed. Please try again.');
    } finally {
      setActionId(null);
    }
  };

  if (!caseId) return null;

  const isResolved = caseData && caseData.status !== 'PENDING';

  return (
    <>
      {/* Backdrop */}
      <div
        className={`${styles.backdrop} ${visible ? styles.backdropVisible : ''}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`${styles.panel} ${visible ? styles.panelVisible : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Case details"
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className={styles.headerTitle}>Case Details</p>
              {caseData && (
                <p className={styles.headerSubtitle}>#{caseData.id}</p>
              )}
            </div>
          </div>
          <button className={styles.closeBtn} onClick={handleClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className={styles.body}>

          {/* Loading */}
          {loading && (
            <div className={styles.stateCenter}>
              <span className={styles.spinner} />
              <span className={styles.stateText}>Loading case…</span>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className={styles.errorBanner}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {/* Content */}
          {caseData && !loading && (
            <>
              {/* Status row */}
              <div className={styles.statusRow}>
                <StatusBadge status={caseData.status} />
                <span className={styles.statusDate}>
                  {new Date(caseData.createdAt).toLocaleString()}
                </span>
              </div>

              {/* AI score (prominent) */}
              <div className={styles.section}>
                <RiskBadge score={caseData.riskScore} showBar />
                <div className={styles.confidenceRow}>
                  <span className={styles.metaLabel}>AI Confidence</span>
                  <span className={styles.confidenceVal}>
                    {Math.round(caseData.aiConfidence * 100)}%
                  </span>
                </div>
              </div>

              {/* Target info */}
              <div className={styles.section}>
                <p className={styles.sectionTitle}>Target</p>
                <div className={styles.metaGrid}>
                  <MetaRow label="Type"      value={TARGET_LABELS[caseData.targetType] ?? caseData.targetType} />
                  <MetaRow label="Target ID" value={caseData.targetId} mono />
                  <MetaRow label="Source"    value={SOURCE_LABELS[caseData.source] ?? caseData.source} />
                </div>
              </div>

              {/* Reason */}
              <div className={styles.section}>
                <p className={styles.sectionTitle}>Reason</p>
                <div className={styles.reasonChip}>
                  {REASON_LABELS[caseData.reasonCategory] ?? caseData.reasonCategory}
                </div>
                {caseData.comment && (
                  <p className={styles.comment}>{caseData.comment}</p>
                )}
              </div>

              {/* Review info (if resolved) */}
              {isResolved && caseData.reviewedBy && (
                <div className={styles.section}>
                  <p className={styles.sectionTitle}>Review</p>
                  <div className={styles.metaGrid}>
                    <MetaRow label="Reviewed by" value={caseData.reviewedBy} />
                    <MetaRow label="Reviewed at" value={new Date(caseData.reviewedAt || caseData.updatedAt).toLocaleString()} />
                  </div>
                </div>
              )}

              {/* Actions (only when pending) */}
              {!isResolved && (
                <div className={styles.actionsSection}>
                  <p className={styles.sectionTitle}>Review Note (optional)</p>
                  <textarea
                    className={styles.noteArea}
                    placeholder="Add a comment…"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    rows={3}
                  />

                  <div className={styles.actionBtns}>
                    <Button
                      variant="emerald"
                      loading={actionId === 'approve'}
                      disabled={actionId !== null}
                      onClick={() => handleAction('approve')}
                      icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      }
                    >
                      Approve
                    </Button>

                    <Button
                      variant="ghost"
                      loading={actionId === 'reject'}
                      disabled={actionId !== null}
                      onClick={() => handleAction('reject')}
                      icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                      }
                    >
                      Reject
                    </Button>

                    <Button
                      variant="red"
                      loading={actionId === 'block'}
                      disabled={actionId !== null}
                      onClick={() => handleAction('block')}
                      icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      }
                    >
                      Auto Block
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

// ── MetaRow sub-component ─────────────────────────────────────────────────────
const MetaRow = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className={styles.metaRow}>
    <span className={styles.metaLabel}>{label}</span>
    <span className={`${styles.metaValue} ${mono ? styles.mono : ''}`}>{value}</span>
  </div>
);
