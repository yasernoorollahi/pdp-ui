import { Header } from '../../components/layout/Header/Header';
import { PageWrapper } from '../../components/layout/PageWrapper/PageWrapper';
import { StatItem } from '../../components/ui/StatItem/StatItem';
import { Card } from '../../components/ui/Card/Card';
import { Badge } from '../../components/ui/Badge/Badge';
import { Button } from '../../components/ui/Button/Button';
import styles from './AdminDashboard.module.css';

/* ── Static data ─────────────────────────────────────────── */
const stats = [
  {
    label: 'Total Users',
    value: '1,247',
    change: '+34 this week',
    up: true as const,
    variant: 'teal' as const,
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        width="18"
        height="18"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: 'Security Alerts',
    value: '3',
    change: '2 critical',
    up: false as const,
    variant: 'red' as const,
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        width="18"
        height="18"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    label: 'System Uptime',
    value: '99.9%',
    change: 'Last 30 days',
    up: null,
    variant: 'emerald' as const,
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        width="18"
        height="18"
      >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    label: 'Data Processed',
    value: '4.2TB',
    change: '+0.3TB today',
    up: true as const,
    variant: 'gold' as const,
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        width="18"
        height="18"
      >
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
        <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
      </svg>
    ),
  },
];

const recentUsers = [
  { email: 'sara.r@example.com', joined: 'Today, 09:14', status: 'active' },
  { email: 'mark.j@example.com', joined: 'Today, 07:52', status: 'active' },
  { email: 'lena.k@example.com', joined: 'Yesterday', status: 'active' },
  { email: 'tom.w@example.com', joined: 'Yesterday', status: 'inactive' },
  { email: 'nina.p@example.com', joined: '2 days ago', status: 'active' },
];

type AuditVariant = 'teal' | 'red' | 'gold' | 'emerald';

const auditLog: {
  title: string;
  meta: string;
  variant: AuditVariant;
  icon: React.ReactNode;
}[] = [
  {
    title: 'User sara.r@example.com logged in',
    meta: 'Today 09:14 · IP 192.168.1.4',
    variant: 'teal',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        width="14"
        height="14"
      >
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <polyline points="10 17 15 12 10 7" />
        <line x1="15" y1="12" x2="3" y2="12" />
      </svg>
    ),
  },
  {
    title: 'Failed login attempt detected',
    meta: 'Today 08:47 · IP 83.21.44.12',
    variant: 'red',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        width="14"
        height="14"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  },
  {
    title: 'Data pipeline job completed',
    meta: 'Today 07:00 · 2.1M records',
    variant: 'emerald',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        width="14"
        height="14"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  {
    title: 'System config updated by admin',
    meta: 'Yesterday 22:30',
    variant: 'gold',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        width="14"
        height="14"
      >
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    title: 'User tom.w@example.com suspended',
    meta: 'Yesterday 18:05',
    variant: 'red',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        width="14"
        height="14"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
];

/* ── Header right side ───────────────────────────────────── */
const AlertIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    width="16"
    height="16"
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const SearchIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    width="16"
    height="16"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const headerRight = (
  <>
    <Button variant="icon" className={styles.alertBtn} icon={AlertIcon} />
    <Button variant="icon" icon={SearchIcon} />
  </>
);

/* ── Component ───────────────────────────────────────────── */
export const AdminDashboard = () => (
  <>
    <Header
      title="Admin Overview"
      breadcrumb="Console · Personal Data Platform"
      right={headerRight}
    />

    <PageWrapper>
      {/* Alert banner */}
      <div className={styles.alertBanner}>
        <div className={styles.alertIcon}>{AlertIcon}</div>
        <div className={styles.alertText}>
          <p className={styles.alertTitle}>
            3 Security Alerts Require Attention
          </p>
          <p className={styles.alertDesc}>
            2 critical threats and 1 suspicious login attempt detected in the
            last 24 hours.
          </p>
        </div>
        <Button variant="red">Review Now →</Button>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        {stats.map((s) => (
          <StatItem key={s.label} {...s} />
        ))}
      </div>

      {/* Bottom grid */}
      <div className={styles.bottomGrid}>
        {/* Recent Users */}
        <Card topLine>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Recent Registrations</h3>
            <Button variant="ghost">Manage users →</Button>
          </div>
          <div className={styles.userTable}>
            <div className={styles.userTableHeader}>
              <span>User</span>
              <span>Joined</span>
              <span>Status</span>
            </div>
            {recentUsers.map((u) => (
              <div key={u.email} className={styles.userRow}>
                <div className={styles.userRowInfo}>
                  <div className={styles.userRowAvatar}>
                    {u.email.slice(0, 2).toUpperCase()}
                  </div>
                  <span className={styles.userRowEmail}>{u.email}</span>
                </div>
                <span className={styles.userRowDate}>{u.joined}</span>
                <Badge variant={u.status === 'active' ? 'teal' : 'muted'}>
                  {u.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Audit Log */}
        <Card topLine>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Audit Log</h3>
            <Button variant="ghost">Full log →</Button>
          </div>
          <div className={styles.auditList}>
            {auditLog.map((log, i) => (
              <div key={i} className={styles.auditItem}>
                <Badge variant={log.variant} className={styles.auditIconWrap}>
                  {log.icon}
                </Badge>
                <div className={styles.auditText}>
                  <p className={styles.auditTitle}>{log.title}</p>
                  <p className={styles.auditMeta}>{log.meta}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageWrapper>
  </>
);
