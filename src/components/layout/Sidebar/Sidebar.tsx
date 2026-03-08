import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../features/auth/hooks/useAuth';
import styles from './Sidebar.module.css';

type NavItem = {
    label: string;
    path: string;
    badge: string | null;
    badgeVariant: string | null;
    icon: ReactNode;
};

const navItems = [
    {
        section: 'Main',
        items: [
            {
                label: 'Overview', path: '/admin', badge: null, badgeVariant: 'red',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
            },
            {
                label: 'System Stats', path: '/admin/stats', badge: null, badgeVariant: null,
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>,
            },
            {
                label: 'User Management', path: '/admin/users', badge: '1.2k', badgeVariant: 'teal',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
            },
            {
                label: 'Locked Users', path: '/admin/users/locked', badge: null, badgeVariant: null,
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
            },
            {
                label: 'Moderation', path: '/admin/moderation', badge: null, badgeVariant: null,
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" /></svg>,
            },
            {
                label: 'Review Queue', path: '/admin/moderation/queue', badge: null, badgeVariant: null,
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>,
            },
            {
                label: 'Create Case', path: '/admin/moderation/new', badge: null, badgeVariant: null,
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><path d="M12 5v14M5 12h14" /><rect x="3" y="3" width="18" height="18" rx="2" /></svg>,
            },
            {
                label: 'Security & Threats', path: '/admin/security', badge: '3', badgeVariant: 'red',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
            },
            {
                label: 'Audit Logs', path: '/admin/audit', badge: null, badgeVariant: null,
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
            },
        ],
    },
    {
        section: 'Platform',
        items: [
            {
                label: 'Data Pipeline', path: '/admin/pipeline', badge: null, badgeVariant: null,
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" /><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" /></svg>,
            },
            {
                label: 'Integrations', path: '/admin/integrations', badge: null, badgeVariant: null,
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
            },
            {
                label: 'System Settings', path: '/admin/settings', badge: null, badgeVariant: null,
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
            },
        ],
    },
];

const getInitials = (email: string) => email ? email.slice(0, 2).toUpperCase() : 'AD';

const isItemActive = (item: NavItem, pathname: string, allPaths: string[]) => {
    if (item.path === '/admin') return pathname === '/admin';
    if (pathname === item.path) return true;

    const hasMoreSpecificMatch = allPaths.some(
        (path) => path !== item.path && (pathname === path || pathname.startsWith(`${path}/`)),
    );

    if (hasMoreSpecificMatch) return false;
    return pathname.startsWith(`${item.path}/`);
};

export const Sidebar = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const initials = getInitials(user?.email ?? '');
    const allPaths = navItems.flatMap((section) => section.items.map((item) => item.path));

    return (
        <aside className={styles.sidebar}>
            <a href="/" className={styles.sidebarLogo}>PDP</a>
            <span className={styles.sidebarTagline}>
                <span className={styles.adminDot} />
                Admin Console
            </span>

            <div className={styles.sidebarDivider} />

            <nav className={styles.sidebarNav}>
                {navItems.map((section) => (
                    <div key={section.section}>
                        <p className={styles.sidebarSection}>{section.section}</p>
                        {section.items.map((item) => {
                            const isActive = isItemActive(item, location.pathname, allPaths);
                            return (
                                <button
                                    key={item.label}
                                    onClick={() => navigate(item.path)}
                                    className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                                >
                                    <span className={styles.navIcon}>{item.icon}</span>
                                    <span className={styles.navLabel}>{item.label}</span>
                                    {item.badge && (
                                        <span className={`${styles.navBadge} ${item.badgeVariant === 'teal' ? styles.navBadgeTeal : ''}`}>
                                            {item.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </nav>

            <div className={styles.sidebarFooter}>
                <div className={styles.adminCard}>
                    <div className={styles.adminAvatar}>{initials}</div>
                    <div className={styles.adminInfo}>
                        <p className={styles.adminName}>{user?.email ?? 'Admin'}</p>
                        <p className={styles.adminRoleLabel}>Administrator</p>
                    </div>
                </div>
                <button className={styles.logoutBtn} onClick={logout}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sign Out
                </button>
            </div>
        </aside>
    );
};
