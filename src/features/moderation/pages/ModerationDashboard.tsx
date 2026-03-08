import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { moderationService } from '../services/moderationService';
import type { ModerationStats, ModerationCase } from '../types/moderation.types';
import { StatusBadge } from '../components/StatusBadge';
import { RiskBadge } from '../components/RiskBadge';
import { StatItem } from '../../../components/ui/StatItem/StatItem';
import { Card } from '../../../components/ui/Card/Card';
import { Button } from '../../../components/ui/Button/Button';
import { Skeleton } from '../../../components/ui/Skeleton/Skeleton';
import { Header } from '../../../components/layout/Header/Header';
import { PageWrapper } from '../../../components/layout/PageWrapper/PageWrapper';
import { CaseDetailsModal } from '../components/CaseDetailsModal';
import styles from './ModerationDashboard.module.css';

const TARGET_LABELS: Record<string, string> = {
  USER: 'User',
  CONTENT: 'Content',
};

export const ModerationDashboard = () => {
  const navigate = useNavigate();

  const [stats, setStats]           = useState<ModerationStats | null>(null);
  const [recent, setRecent]         = useState<ModerationCase[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [recentLoading, setRecentLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const didInitStats = useRef(false);
  const didInitRecent = useRef(false);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const data = await moderationService.getStats();
      setStats(data);
    } catch (error) {
      const message = error instanceof Error && error.message === 'UNAUTHORIZED'
        ? 'Session expired. Please login again.'
        : 'Failed to load statistics.';
      setStatsError(message);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── Fetch stats ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (didInitStats.current) return;
    didInitStats.current = true;
    loadStats();
  }, [loadStats]);

  // ── Fetch recent pending cases ──────────────────────────────────────────────
  useEffect(() => {
    if (didInitRecent.current) return;
    didInitRecent.current = true;
    setRecentLoading(true);
    moderationService
      .getCases({ page: 0, size: 20, status: 'PENDING' })
      .then((res) => setRecent(res.content.slice(0, 6)))
      .catch(() => {/* non-fatal */})
      .finally(() => setRecentLoading(false));
  }, []);

  const handleActionComplete = (updated: ModerationCase) => {
    setRecent((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    // Refresh stats
    loadStats();
  };

  // ── Stat definitions ────────────────────────────────────────────────────────
  const statItems = stats ? [
    {
      label: 'Total Cases',
      value: stats.totalCases,
      change: `+${stats.newToday} today`,
      up: stats.newToday > 0,
      variant: 'teal' as const,
      icon: <FileIcon />,
    },
    {
      label: 'Pending Review',
      value: stats.pending,
      change: 'Awaiting action',
      up: null,
      variant: 'gold' as const,
      icon: <ClockIcon />,
    },
    {
      label: 'Auto Blocked',
      value: stats.autoBlocked,
      change: `${stats.rejected} rejected`,
      up: false,
      variant: 'red' as const,
      icon: <BlockIcon />,
    },
    {
      label: 'Resolved Today',
      value: stats.resolvedToday,
      change: `${stats.approved} approved`,
      up: true,
      variant: 'emerald' as const,
      icon: <CheckIcon />,
    },
  ] : [];

  return (
    <>
      <Header
        title="Moderation Center"
        breadcrumb="Console · Moderation · Overview"
        right={
          <Button
            variant="teal"
            onClick={() => navigate('/admin/moderation/queue')}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            }
          >
            Open Queue
          </Button>
        }
      />

      <PageWrapper>

        {/* ── Pending alert banner ────────────────────────────────────── */}
        {!statsLoading && stats && stats.pending > 0 && (
          <div className={styles.alertBanner}>
            <div className={styles.alertIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className={styles.alertText}>
              <p className={styles.alertTitle}>
                {stats.pending} Case{stats.pending !== 1 ? 's' : ''} Awaiting Review
              </p>
              <p className={styles.alertDesc}>
                Average AI risk score: {stats.avgRiskScore}/100 — review high-risk cases first.
              </p>
            </div>
            <Button variant="red" onClick={() => navigate('/admin/moderation/queue')}>
              Review Now →
            </Button>
          </div>
        )}

        {/* ── Stats grid ──────────────────────────────────────────────── */}
        {statsLoading && (
          <div className={styles.statsGrid}>
            <Skeleton count={4} height="110px" />
          </div>
        )}

        {!statsLoading && statsError && (
          <div className={styles.statsError}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {statsError}
            <Button variant="ghost" onClick={loadStats}>Retry</Button>
          </div>
        )}

        {!statsLoading && stats && (
          <div className={styles.statsGrid}>
            {statItems.map((s) => (
              <StatItem key={s.label} {...s} />
            ))}
          </div>
        )}

        {/* ── Status breakdown ────────────────────────────────────────── */}
        {!statsLoading && stats && (
          <div className={styles.breakdownGrid}>
            <BreakdownBar stats={stats} />
            <AvgScoreCard score={stats.avgRiskScore} />
          </div>
        )}

        {/* ── Recent pending cases ─────────────────────────────────────── */}
        <Card topLine>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Pending Cases</h3>
            <Button variant="ghost" onClick={() => navigate('/admin/moderation/queue')}>
              Full queue →
            </Button>
          </div>

          {recentLoading && <Skeleton count={6} height="52px" />}

          {!recentLoading && recent.length === 0 && (
            <div className={styles.emptyPanel}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>No pending cases — queue is clear</span>
            </div>
          )}

          {!recentLoading && recent.length > 0 && (
            <div className={styles.recentList}>
              {recent.map((c, i) => (
                <div
                  key={c.id}
                  className={styles.recentRow}
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <div className={styles.recentTarget}>
                    <span className={styles.recentTargetType}>
                      {TARGET_LABELS[c.targetType] ?? c.targetType}
                    </span>
                    <span className={styles.recentTargetId}>{c.targetId}</span>
                  </div>
                  <RiskBadge score={c.riskScore} />
                  <StatusBadge status={c.status} />
                  <span className={styles.recentDate}>
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                  <Button
                    variant="icon"
                    title="Review case"
                    onClick={() => setSelectedId(c.id)}
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
      </PageWrapper>

      {/* ── Case modal ───────────────────────────────────────────────── */}
      <CaseDetailsModal
        caseId={selectedId}
        onClose={() => setSelectedId(null)}
        onActionComplete={handleActionComplete}
      />
    </>
  );
};

// ── Status breakdown bar ──────────────────────────────────────────────────────
const BreakdownBar = ({ stats }: { stats: ModerationStats }) => {
  const total = stats.totalCases || 1;
  const segments = [
    { key: 'pending',  pct: (stats.pending  / total) * 100, cls: styles.segGold,    label: 'Pending' },
    { key: 'approved', pct: (stats.approved / total) * 100, cls: styles.segEmerald, label: 'Approved' },
    { key: 'rejected', pct: (stats.rejected / total) * 100, cls: styles.segOrange,  label: 'Rejected' },
    { key: 'autoBlocked',  pct: (stats.autoBlocked  / total) * 100, cls: styles.segRed,     label: 'Auto Blocked' },
  ];

  return (
    <Card>
      <p className={styles.breakdownTitle}>Status Breakdown</p>
      <div className={styles.breakdownBar}>
        {segments.map((s) =>
          s.pct > 0 ? (
            <div
              key={s.key}
              className={`${styles.segment} ${s.cls}`}
              style={{ width: `${s.pct}%` }}
              title={`${s.label}: ${Math.round(s.pct)}%`}
            />
          ) : null,
        )}
      </div>
      <div className={styles.breakdownLegend}>
        {segments.map((s) => (
          <div key={s.key} className={styles.legendItem}>
            <span className={`${styles.legendDot} ${s.cls}`} />
            <span className={styles.legendLabel}>{s.label}</span>
            <span className={styles.legendVal}>
              {stats[s.key as keyof ModerationStats] as number}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};

// ── Avg score card ────────────────────────────────────────────────────────────
const AvgScoreCard = ({ score }: { score: number }) => (
  <Card>
    <p className={styles.breakdownTitle}>Avg AI Risk Score</p>
    <RiskBadge score={score} showBar />
  </Card>
);

// ── Icons (inline SVG components for stat items) ──────────────────────────────
const FileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const BlockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
