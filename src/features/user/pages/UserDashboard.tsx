import { useAuth } from '../../../features/auth/hooks/useAuth';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserChatPanel } from '../../../features/chat/components/UserChatPanel';
import { InsightsPage } from '../../insights/pages/InsightsPage';
import styles from './UserDashboard.module.css';

const navItems = [
  {
    label: 'Overview',
    path: '/app',
    badge: null,
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        width="18"
        height="18"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: 'Chat',
    path: '/app/chat',
    badge: null,
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        width="18"
        height="18"
      >
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
      </svg>
    ),
  },
  {
    label: 'Insights',
    path: '/app/insights',
    badge: null,
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        width="18"
        height="18"
      >
        <path d="M3 3v18h18" />
        <path d="M7 15l4-6 4 3 5-7" />
      </svg>
    ),
  },
  {
    label: 'Identity Graph',
    path: null,
    badge: null,
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        width="18"
        height="18"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
  {
    label: 'Analytics',
    path: null,
    badge: 'NEW',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        width="18"
        height="18"
      >
        <rect x="3" y="12" width="4" height="9" />
        <rect x="10" y="7" width="4" height="14" />
        <rect x="17" y="3" width="4" height="18" />
      </svg>
    ),
  },
  {
    label: 'Observability',
    path: null,
    badge: null,
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        width="18"
        height="18"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
      </svg>
    ),
  },
  {
    label: 'Integrations',
    path: null,
    badge: null,
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        width="18"
        height="18"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    label: 'Security',
    path: null,
    badge: null,
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        width="18"
        height="18"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    label: 'Settings',
    path: null,
    badge: null,
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        width="18"
        height="18"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

const stats = [
  {
    label: 'Data Sources',
    value: '12',
    change: '+2 this week',
    up: true,
    variant: 'teal',
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
  {
    label: 'Insights Generated',
    value: '248',
    change: '+18 today',
    up: true,
    variant: 'emerald',
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
    label: 'Privacy Score',
    value: '94%',
    change: '+3% vs last month',
    up: true,
    variant: 'gold',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        width="18"
        height="18"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    label: 'Active Sessions',
    value: '3',
    change: '2 devices',
    up: null,
    variant: 'blue',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        width="18"
        height="18"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
];

const activities = [
  {
    title: 'Identity graph updated with LinkedIn data',
    time: '2 min ago',
    dot: 'teal',
  },
  {
    title: 'New behavioral pattern detected in browsing',
    time: '18 min ago',
    dot: 'emerald',
  },
  {
    title: 'Privacy audit completed successfully',
    time: '1 hour ago',
    dot: 'gold',
  },
  {
    title: 'GitHub integration synced 142 events',
    time: '3 hours ago',
    dot: 'blue',
  },
  {
    title: 'Cognitive profile report generated',
    time: 'Yesterday',
    dot: 'teal',
  },
];

const variantClass: Record<string, string> = {
  teal: styles.statCardTeal,
  emerald: styles.statCardEmerald,
  gold: styles.statCardGold,
  blue: styles.statCardBlue,
};

const dotClass: Record<string, string> = {
  teal: styles.dotTeal,
  emerald: styles.dotEmerald,
  gold: styles.dotGold,
  blue: styles.dotBlue,
};

const getInitials = (email: string) => {
  return email ? email.slice(0, 2).toUpperCase() : 'U';
};

export const UserDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isChatRoute = location.pathname === '/app/chat';
  const isInsightsRoute = location.pathname === '/app/insights';

  const initials = getInitials(user?.email ?? '');

  return (
    <div className={styles.dashboard}>
      {/* Background */}
      <div className={styles.dashboardBg} />

      {/* ── SIDEBAR ── */}
      <aside className={styles.sidebar}>
        <a href="/" className={styles.sidebarLogo}>
          PDP
        </a>
        <span className={styles.sidebarTagline}>Personal Data Platform</span>

        <div className={styles.sidebarDivider} />

        <nav className={styles.sidebarNav}>
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`${styles.navItem} ${item.path === location.pathname ? styles.navItemActive : ''}`}
              onClick={() => item.path && navigate(item.path)}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
              {item.badge && (
                <span className={styles.navBadge}>{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>{initials}</div>
            <div className={styles.userInfo}>
              <p className={styles.userName}>{user?.email ?? 'User'}</p>
              <p className={styles.userRole}>Member</p>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={logout}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              width="16"
              height="16"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className={styles.main}>
        {/* Topbar */}
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <h1 className={styles.pageTitle}>{isChatRoute ? 'Chat' : isInsightsRoute ? 'Insights' : 'Overview'}</h1>
            <span className={styles.pageBreadcrumb}>
              {isChatRoute ? 'Dashboard · User Chat' : isInsightsRoute ? 'Dashboard · Insights' : 'Dashboard · Personal Data Platform'}
            </span>
          </div>
          <div className={styles.topbarRight}>
            <button
              type="button"
              className={styles.topbarBtn}
              onClick={() => navigate(isChatRoute ? '/app' : '/app/chat')}
              aria-label={isChatRoute ? 'Go to overview' : 'Go to chat'}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                width="16"
                height="16"
              >
                {isChatRoute ? (
                  <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
                ) : (
                  <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
                )}
              </svg>
            </button>
            <button className={`${styles.topbarBtn} ${styles.notifDot}`}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                width="16"
                height="16"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
            <button className={styles.topbarBtn}>
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
            </button>
          </div>
        </header>

        {/* Content */}
        <div className={styles.content}>
          {isChatRoute ? <UserChatPanel /> : null}
          {isInsightsRoute ? <InsightsPage /> : null}

          {!isChatRoute && !isInsightsRoute ? (
            <>
              {/* Welcome banner */}
              <div className={styles.welcomeBanner}>
                <div className={styles.welcomeBannerGlow} />
                <p className={styles.welcomeGreeting}>Good to see you back</p>
                <h2 className={styles.welcomeTitle}>
                  Hello, {user?.email?.split('@')[0] ?? 'User'} 👋
                </h2>
                <p className={styles.welcomeSubtitle}>
                  Your digital identity is being monitored and protected. Here's a
                  summary of your personal data activity.
                </p>
                <div className={styles.welcomeBadge}>
                  <span className={styles.badgeDot} />
                  All systems operational
                </div>
              </div>

              {/* Stats */}
              <div className={styles.statsGrid}>
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className={`${styles.statCard} ${variantClass[stat.variant]}`}
                  >
                    <div className={styles.statIcon}>{stat.icon}</div>
                    <div className={styles.statValue}>{stat.value}</div>
                    <div className={styles.statLabel}>{stat.label}</div>
                    <div
                      className={`${styles.statChange} ${stat.up === true ? styles.statChangeUp : stat.up === false ? styles.statChangeDown : ''}`}
                    >
                      {stat.up === true && '↑ '}
                      {stat.up === false && '↓ '}
                      {stat.change}
                    </div>
                    <div className={styles.statCardGlow} />
                  </div>
                ))}
              </div>

              {/* Bottom grid */}
              <div className={styles.bottomGrid}>
                {/* Recent Activity */}
                <div className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <h3 className={styles.panelTitle}>Recent Activity</h3>
                    <button className={styles.panelAction}>View all →</button>
                  </div>
                  <div className={styles.activityList}>
                    {activities.map((a, i) => (
                      <div key={i} className={styles.activityItem}>
                        <div
                          className={`${styles.activityDot} ${dotClass[a.dot]}`}
                        />
                        <div className={styles.activityText}>
                          <p className={styles.activityTitle}>{a.title}</p>
                          <p className={styles.activityTime}>{a.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Profile summary */}
                <div className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <h3 className={styles.panelTitle}>Your Profile</h3>
                    <button className={styles.panelAction}>Edit →</button>
                  </div>

                  <div className={styles.profileCard}>
                    <div className={styles.profileAvatar}>{initials}</div>
                    <p className={styles.profileName}>
                      {user?.email?.split('@')[0] ?? 'User'}
                    </p>
                    <p className={styles.profileEmail}>{user?.email}</p>
                    <span className={styles.profileRoleBadge}>● Member</span>
                  </div>

                  <div className={styles.profileStatRow}>
                    <div className={styles.profileStat}>
                      <span className={styles.profileStatValue}>12</span>
                      <span className={styles.profileStatLabel}>
                        Connected Sources
                      </span>
                    </div>
                    <div className={styles.profileStat}>
                      <span className={styles.profileStatValue}>94%</span>
                      <span className={styles.profileStatLabel}>Privacy Score</span>
                    </div>
                    <div className={styles.profileStat}>
                      <span className={styles.profileStatValue}>248</span>
                      <span className={styles.profileStatLabel}>
                        Total Insights
                      </span>
                    </div>
                    <div className={styles.profileStat}>
                      <span className={styles.profileStatValue}>30d</span>
                      <span className={styles.profileStatLabel}>Member Since</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
