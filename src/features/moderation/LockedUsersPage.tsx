import { useState, useEffect } from 'react';
import { userService } from '../../services/user.service';
import type { User } from '../../services/user.service';
import { useToast } from '../../hooks/useToast';
import { Header } from '../../components/layout/Header/Header';
import { PageWrapper } from '../../components/layout/PageWrapper/PageWrapper';
import { Badge } from '../../components/ui/Badge/Badge';
// import { Button } from '../../components/ui/Button/Button';
import { Skeleton } from '../../components/ui/Skeleton/Skeleton';
import { Card } from '../../components/ui/Card/Card';
import { Input } from '../../components/ui/Input/Input';
import { Table } from '../../components/ui/Table/Table';
import styles from './LockedUsersPage.module.css';

// ─── Tab type ────────────────────────────────────────────────────────────────
type Tab = 'flagged' | 'all';

// ─── Extended API calls (add these to your user.api.ts) ──────────────────────
// GET  /api/users        → User[]
// GET  /api/users/{id}   → User
// PUT  /api/users/{id}/unlock
// PUT  /api/users/{id}/enabled  (body: { enabled: boolean })

export const LockedUsersPage = () => {
  // ── Tab ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>('flagged');

  // ── Flagged users state ───────────────────────────────────────────────────
  const [flaggedUsers, setFlaggedUsers] = useState<User[]>([]);
  // const [flaggedLoading, setFlaggedLoading] = useState(true);

  // ── All users state ───────────────────────────────────────────────────────
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allLoading, setAllLoading] = useState(true);
  const [search, setSearch] = useState('');

  // ── Action state ──────────────────────────────────────────────────────────
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<
    'unlock' | 'enable' | 'disable' | null
  >(null);

  // ── Drawer state ─────────────────────────────────────────────────────────
  const [drawerUser, setDrawerUser] = useState<User | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const { toast, showToast } = useToast();

  // ═════════════════════════════════════════════════════════════════════════
  // Load data
  // ═════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    // loadFlagged();
  }, []);
  useEffect(() => {
    if (activeTab === 'all') loadAll();
  }, [activeTab]);

  // const loadFlagged = async () => {
  //   setFlaggedLoading(true);
  //   try {
  //     const data = await userApi.getLockedUsers();
  //     setFlaggedUsers(data);
  //   } catch {
  //     /* noop */
  //   } finally {
  //     setFlaggedLoading(false);
  //   }
  // };

  // const loadAll = async () => {
  //   setAllLoading(true);
  //   try {
  //     const resp = await fetch('users', { credentials: 'include' });
  //     const data: User[] = await resp.json();
  //     setAllUsers(data);
  //   } catch {
  //     // Fallback mock
  //   } finally {
  //     setAllLoading(false);
  //   }
  // };

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setAllLoading(true);
    try {
      const page = await userService.getAllUsers(0, 50);
      setAllUsers(page.content);
      setFlaggedUsers(page.content.filter((u) => u.locked));
    } catch {
      showToast('Failed to load users', 'error');
    } finally {
      setAllLoading(false);
    }
  };

  // ═════════════════════════════════════════════════════════════════════════
  // Actions
  // ═════════════════════════════════════════════════════════════════════════
  // loadAll

  // const handleUnlock = async (id: string) => {
  //   setActionId(id);
  //   setActionType('unlock');
  //   try {
  //     await userApi.unlockUser(id);
  //     setFlaggedUsers((prev) => prev.filter((u) => u.id !== id));
  //     setAllUsers((prev) =>
  //       prev.map((u) => (u.id === id ? { ...u, locked: false } : u)),
  //     );
  //     if (drawerUser?.id === id)
  //       setDrawerUser((d) => (d ? { ...d, locked: false } : null));
  //     showToast('Account unlocked successfully');
  //   } catch {
  //     showToast('Failed to unlock account', 'error');
  //   } finally {
  //     setActionId(null);
  //     setActionType(null);
  //   }
  // };

  const handleUnlock = async (id: string) => {
    setActionId(id);
    setActionType('unlock');

    try {
      await userService.unlockUser(id);

      setAllUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, locked: false } : u)),
      );

      setFlaggedUsers((prev) => prev.filter((u) => u.id !== id));

      if (drawerUser?.id === id) {
        setDrawerUser((prev) => (prev ? { ...prev, locked: false } : null));
      }

      showToast('Account unlocked successfully');
    } catch {
      showToast('Failed to unlock account', 'error');
    } finally {
      setActionId(null);
      setActionType(null);
    }
  };

  // const handleToggleEnabled = async (user: User) => {
  //   const newEnabled = user.locked;
  //   setActionId(user.id);
  //   setActionType(newEnabled ? 'enable' : 'disable');
  //   try {
  //     await fetch(`/users/${user.id}/enabled`, {
  //       method: 'PUT',
  //       credentials: 'include',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ enabled: newEnabled }),
  //     });
  //     const updated = { ...user, locked: !newEnabled };
  //     setAllUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
  //     if (drawerUser?.id === user.id) setDrawerUser(updated);
  //     if (!newEnabled)
  //       setFlaggedUsers((prev) => [
  //         ...prev.filter((u) => u.id !== user.id),
  //         updated,
  //       ]);
  //     else setFlaggedUsers((prev) => prev.filter((u) => u.id !== user.id));
  //     showToast(`Account ${newEnabled ? 'enabled' : 'disabled'}`);
  //   } catch {
  //     showToast('Action failed', 'error');
  //   } finally {
  //     setActionId(null);
  //     setActionType(null);
  //   }
  // };

  const handleToggleEnabled = async (user: User) => {
    const newEnabled = !user.enabled;

    setActionId(user.id);
    setActionType(newEnabled ? 'enable' : 'disable');

    try {
      await userService.setUserEnabled(user.id, newEnabled);

      const updated = { ...user, enabled: newEnabled };

      setAllUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));

      if (drawerUser?.id === user.id) {
        setDrawerUser(updated);
      }

      showToast(`Account ${newEnabled ? 'enabled' : 'disabled'}`);
    } catch {
      showToast('Action failed', 'error');
    } finally {
      setActionId(null);
      setActionType(null);
    }
  };
  // ═════════════════════════════════════════════════════════════════════════
  // Drawer
  // ═════════════════════════════════════════════════════════════════════════
  // const openDrawer = async (user: User) => {
  //   setDrawerVisible(true);
  //   setDrawerLoading(true);
  //   setDrawerUser(user);
  //   try {
  //     const resp = await fetch(`/users/${user.id}`, {
  //       credentials: 'include',
  //     });
  //     const detail: User = await resp.json();
  //     setDrawerUser(detail);
  //   } catch {
  //     /* keep existing */
  //   } finally {
  //     setDrawerLoading(false);
  //   }
  // };

  const openDrawer = async (user: User) => {
    setDrawerVisible(true);
    setDrawerLoading(true);

    try {
      const detail = await userService.getUserById(user.id);
      setDrawerUser(detail);
    } catch {
      setDrawerUser(user);
      showToast('Failed to load user details', 'error');
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    setDrawerVisible(false);
    setTimeout(() => setDrawerUser(null), 350);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // ═════════════════════════════════════════════════════════════════════════
  // Derived data
  // ═════════════════════════════════════════════════════════════════════════
  const filtered = allUsers.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const lockedCount = allUsers.filter((u) => u.locked).length;
  const activeCount = allUsers.filter((u) => !u.locked).length;
  const adminCount = allUsers.filter((u) =>
    u.role?.includes('ROLE_ADMIN'),
  ).length;

  // ═════════════════════════════════════════════════════════════════════════
  // Render
  // ═════════════════════════════════════════════════════════════════════════
  const headerRight = flaggedUsers.length > 0 ? (
    <Badge variant="red" dot pulseDot>{flaggedUsers.length} flagged</Badge>
  ) : undefined;

  return (
    <>
      <Header title="User Management" breadcrumb="Console · Admin · Users" right={headerRight} />

      <PageWrapper>
        {/* ── Tab switcher ─────────────────────────────────────────── */}
        <div className={styles.tabBar}>
          <button
            className={`${styles.tab} ${activeTab === 'flagged' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('flagged')}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="15"
              height="15"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Flagged Accounts
            {flaggedUsers.length > 0 && (
              <span className={styles.tabCount}>{flaggedUsers.length}</span>
            )}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'all' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="15"
              height="15"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            All Users
            {allUsers.length > 0 && (
              <span className={`${styles.tabCount} ${styles.tabCountTeal}`}>
                {allUsers.length}
              </span>
            )}
          </button>
          <div
            className={styles.tabIndicator}
            style={{ left: activeTab === 'flagged' ? '0' : '50%' }}
          />
        </div>

        {/* ══════════════════════════════════════════════════════════
                    TAB 1 — FLAGGED ACCOUNTS
                    ══════════════════════════════════════════════════════════ */}
        {activeTab === 'flagged' && (
          <div className={styles.tabPanel}>
            {allLoading ? (
              <LoadingSkeleton />
            ) : flaggedUsers.length === 0 ? (
              <EmptyState
                icon={
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    width="36"
                    height="36"
                  >
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                title="All Clear"
                desc="No locked or disabled accounts found. System is clean."
                color="emerald"
              />
            ) : (
              <div className={styles.flaggedGrid}>
                {flaggedUsers.map((u, i) => (
                  <FlaggedCard
                    key={u.id}
                    user={u}
                    index={i}
                    actionId={actionId}
                    actionType={actionType}
                    onUnlock={() => handleUnlock(u.id)}
                    onToggleEnabled={() => handleToggleEnabled(u)}
                    onView={() => openDrawer(u)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
                    TAB 2 — ALL USERS
                    ══════════════════════════════════════════════════════════ */}
        {activeTab === 'all' && (
          <div className={styles.tabPanel}>
            {/* Overview stats */}
            {!allLoading && allUsers.length > 0 && (
              <div className={styles.overviewGrid}>
                <OverviewCard
                  label="Total Users"
                  value={allUsers.length}
                  color="teal"
                  icon={
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      width="18"
                      height="18"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  }
                />
                <OverviewCard
                  label="Active"
                  value={activeCount}
                  color="emerald"
                  icon={
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      width="18"
                      height="18"
                    >
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
                <OverviewCard
                  label="Locked / Disabled"
                  value={lockedCount}
                  color="red"
                  icon={
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      width="18"
                      height="18"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  }
                />
                <OverviewCard
                  label="Admins"
                  value={adminCount}
                  color="gold"
                  icon={
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      width="18"
                      height="18"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  }
                />
              </div>
            )}

            {/* Search bar */}
            <Input
              placeholder="Search by email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              }
            />

            {/* Table */}
            {allLoading ? (
              <LoadingSkeleton />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    width="36"
                    height="36"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                }
                title="No results"
                desc={
                  search ? `No users matching "${search}"` : 'No users found'
                }
                color="teal"
              />
            ) : (
              <Card topLine>
                <Table
                  headers={['User', 'Role', 'Status', 'Last Login', 'Actions']}
                  columns="1fr 100px 100px 120px 120px"
                >
                  {filtered.map((u, i) => (
                    <AllUserRow
                      key={u.id}
                      user={u}
                      index={i}
                      actionId={actionId}
                      actionType={actionType}
                      onUnlock={() => handleUnlock(u.id)}
                      onToggleEnabled={() => handleToggleEnabled(u)}
                      onView={() => openDrawer(u)}
                    />
                  ))}
                </Table>
              </Card>
            )}
          </div>
        )}
      </PageWrapper>

      {/* ══════════════════════════════════════════════════════════════
                SLIDE-IN DRAWER
                ══════════════════════════════════════════════════════════════ */}
      {(drawerUser || drawerVisible) && (
        <>
          <div
            className={`${styles.drawerBackdrop} ${drawerVisible ? styles.drawerBackdropVisible : ''}`}
            onClick={closeDrawer}
          />
          <div
            className={`${styles.drawer} ${drawerVisible ? styles.drawerOpen : ''}`}
          >
            <div className={styles.drawerHeader}>
              <div
                className={styles.drawerAvatar}
                style={{ background: avatarGradient(drawerUser?.email ?? '') }}
              >
                {(drawerUser?.email ?? '??').slice(0, 2).toUpperCase()}
              </div>
              <div className={styles.drawerHeadInfo}>
                <span className={styles.drawerEmail}>{drawerUser?.email}</span>
                <span className={styles.drawerRole}>
                  {drawerUser?.role?.join(', ')}
                </span>
              </div>
              <button className={styles.drawerClose} onClick={closeDrawer}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  width="18"
                  height="18"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {drawerLoading ? (
              <div className={styles.drawerLoading}>
                <span className={styles.drawerSpinner} />
                Loading details…
              </div>
            ) : (
              drawerUser && (
                <>
                  <div className={styles.drawerSection}>
                    <p className={styles.drawerSectionTitle}>Account Info</p>
                    <DrawerRow label="User ID" value={drawerUser.id} mono />
                    <DrawerRow label="Email" value={drawerUser.email} />
                    <DrawerRow label="Joined" value={drawerUser.joinedAt} />
                    <DrawerRow
                      label="Last Login"
                      value={drawerUser.lastLogin ?? '—'}
                    />
                  </div>

                  <div className={styles.drawerSection}>
                    <p className={styles.drawerSectionTitle}>Status</p>
                    <div className={styles.drawerStatusRow}>
                      <span className={styles.drawerStatusLabel}>
                        Lock Status
                      </span>
                      <span
                        className={`${styles.statusPill} ${drawerUser.locked ? styles.statusPillRed : styles.statusPillGreen}`}
                      >
                        {drawerUser.locked ? '🔒 Locked' : '🔓 Unlocked'}
                      </span>
                    </div>
                  </div>

                  <div className={styles.drawerActions}>
                    {drawerUser.locked && (
                      <ActionButton
                        label="Unlock Account"
                        color="emerald"
                        loading={
                          actionId === drawerUser.id && actionType === 'unlock'
                        }
                        icon={
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            width="15"
                            height="15"
                          >
                            <rect
                              x="3"
                              y="11"
                              width="18"
                              height="11"
                              rx="2"
                              ry="2"
                            />
                            <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                          </svg>
                        }
                        onClick={() => handleUnlock(drawerUser.id)}
                      />
                    )}
                    <ActionButton
                      label={
                        drawerUser.locked ? 'Enable Account' : 'Disable Account'
                      }
                      color={drawerUser.locked ? 'teal' : 'red'}
                      loading={
                        actionId === drawerUser.id &&
                        (actionType === 'enable' || actionType === 'disable')
                      }
                      icon={
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          width="15"
                          height="15"
                        >
                          <circle cx="12" cy="12" r="10" />
                          {drawerUser.locked ? (
                            <path d="M8 12l2 2 4-4" />
                          ) : (
                            <>
                              <line x1="15" y1="9" x2="9" y2="15" />
                              <line x1="9" y1="9" x2="15" y2="15" />
                            </>
                          )}
                        </svg>
                      }
                      onClick={() => handleToggleEnabled(drawerUser)}
                    />
                  </div>
                </>
              )
            )}
          </div>
        </>
      )}

      {/* ── Toast ──────────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`}
        >
          {toast.type === 'success' ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="16"
              height="16"
            >
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="16"
              height="16"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
          {toast.msg}
        </div>
      )}
    </>
  );
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const avatarGradient = (email: string): string => {
  const gradients = [
    'linear-gradient(135deg,#2dd4bf,#0d9488)',
    'linear-gradient(135deg,#34d399,#059669)',
    'linear-gradient(135deg,#f59e0b,#d97706)',
    'linear-gradient(135deg,#818cf8,#4f46e5)',
    'linear-gradient(135deg,#fb7185,#e11d48)',
    'linear-gradient(135deg,#38bdf8,#0284c7)',
  ];
  return gradients[email.charCodeAt(0) % gradients.length];
};

// ─── Sub-components ──────────────────────────────────────────────────────────

interface FlaggedCardProps {
  user: User;
  index: number;
  actionId: string | null;
  actionType: string | null;
  onUnlock: () => void;
  onToggleEnabled: () => void;
  onView: () => void;
}

const FlaggedCard = ({
  user,
  index,
  actionId,
  actionType,
  onUnlock,
  onToggleEnabled,
  onView,
}: FlaggedCardProps) => {
  const isActing = actionId === user.id;
  return (
    <div
      className={styles.flaggedCard}
      style={{ animationDelay: `${index * 0.07}s` }}
    >
      <div className={styles.flaggedCardShine} />

      <div className={styles.flaggedCardTop}>
        <div
          className={styles.flaggedAvatar}
          style={{ background: avatarGradient(user.email) }}
        >
          {user.email.slice(0, 2).toUpperCase()}
          <span className={styles.flaggedAvatarBadge}>!</span>
        </div>
        <div className={styles.flaggedInfo}>
          <span className={styles.flaggedEmail}>{user.email}</span>
          <span className={styles.flaggedMeta}>
            {user.role?.join(' · ')} · since {user.joinedAt}
          </span>
        </div>
      </div>

      <div className={styles.flaggedStatusRow}>
        {user.locked && (
          <span className={`${styles.chip} ${styles.chipRed}`}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="11"
              height="11"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Locked
          </span>
        )}
        <span className={`${styles.chip} ${styles.chipOrange}`}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="11"
            height="11"
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Flagged
        </span>
      </div>

      <div className={styles.flaggedCardActions}>
        <button className={styles.flaggedActionBtn} onClick={onView}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="13"
            height="13"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Details
        </button>

        {user.locked && (
          <button
            className={`${styles.flaggedActionBtn} ${styles.flaggedActionUnlock}`}
            onClick={onUnlock}
            disabled={isActing}
          >
            {isActing && actionType === 'unlock' ? (
              <span className={styles.btnSpinner} />
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                width="13"
                height="13"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </svg>
            )}
            Unlock
          </button>
        )}

        <button
          className={`${styles.flaggedActionBtn} ${styles.flaggedActionEnable}`}
          onClick={onToggleEnabled}
          disabled={isActing}
        >
          {isActing && (actionType === 'enable' || actionType === 'disable') ? (
            <span className={styles.btnSpinner} />
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="13"
              height="13"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12l2 2 4-4" />
            </svg>
          )}
          Enable
        </button>
      </div>
    </div>
  );
};

interface AllUserRowProps {
  user: User;
  index: number;
  actionId: string | null;
  actionType: string | null;
  onUnlock: () => void;
  onToggleEnabled: () => void;
  onView: () => void;
}

const AllUserRow = ({
  user,
  index,
  actionId,
  actionType,
  onUnlock,
  onToggleEnabled,
  onView,
}: AllUserRowProps) => {
  const isActing = actionId === user.id;
  return (
    <div
      className={`${styles.allRow} ${user.locked ? styles.allRowFlagged : ''}`}
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <div className={styles.allRowUser}>
        <div
          className={styles.allRowAvatar}
          style={{ background: avatarGradient(user.email) }}
        >
          {user.email.slice(0, 2).toUpperCase()}
        </div>
        <span className={styles.allRowEmail}>{user.email}</span>
      </div>
      <span>
        {user.role?.includes('ROLE_ADMIN') ? (
          <span className={`${styles.chip} ${styles.chipGold}`}>Admin</span>
        ) : (
          <span className={`${styles.chip} ${styles.chipMuted}`}>User</span>
        )}
      </span>
      <span>
        {user.locked ? (
          <span className={`${styles.chip} ${styles.chipRed}`}>Locked</span>
        ) : (
          <span className={`${styles.chip} ${styles.chipGreen}`}>Active</span>
        )}
      </span>
      <span className={styles.allRowDate}>{user.lastLogin ?? '—'}</span>
      <div className={styles.allRowActions}>
        <button
          className={styles.rowIconBtn}
          title="View details"
          onClick={onView}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="14"
            height="14"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
        {user.locked && (
          <button
            className={`${styles.rowIconBtn} ${styles.rowIconBtnEmerald}`}
            title="Unlock"
            onClick={onUnlock}
            disabled={isActing}
          >
            {isActing && actionType === 'unlock' ? (
              <span className={styles.btnSpinnerSm} />
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                width="14"
                height="14"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </svg>
            )}
          </button>
        )}
        <button
          className={`${styles.rowIconBtn} ${user.locked ? styles.rowIconBtnTeal : styles.rowIconBtnRed}`}
          title={user.locked ? 'Enable' : 'Disable'}
          onClick={onToggleEnabled}
          disabled={isActing}
        >
          {isActing && (actionType === 'enable' || actionType === 'disable') ? (
            <span className={styles.btnSpinnerSm} />
          ) : user.locked ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="14"
              height="14"
            >
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
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
          )}
        </button>
      </div>
    </div>
  );
};

const OverviewCard = ({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}) => (
  <div className={`${styles.overviewCard} ${styles[`overviewCard_${color}`]}`}>
    <div className={styles.overviewIcon}>{icon}</div>
    <div className={styles.overviewValue}>{value}</div>
    <div className={styles.overviewLabel}>{label}</div>
  </div>
);

const LoadingSkeleton = () => <Skeleton count={3} />;

const EmptyState = ({
  icon,
  title,
  desc,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
}) => (
  <div className={`${styles.emptyState} ${styles[`emptyState_${color}`]}`}>
    <div className={styles.emptyIcon}>{icon}</div>
    <p className={styles.emptyTitle}>{title}</p>
    <p className={styles.emptyDesc}>{desc}</p>
  </div>
);

const DrawerRow = ({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) => (
  <div className={styles.drawerRow}>
    <span className={styles.drawerRowLabel}>{label}</span>
    <span className={`${styles.drawerRowValue} ${mono ? styles.mono : ''}`}>
      {value}
    </span>
  </div>
);

const ActionButton = ({
  label,
  color,
  loading,
  icon,
  onClick,
}: {
  label: string;
  color: string;
  loading: boolean;
  icon: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    className={`${styles.drawerActionBtn} ${styles[`drawerActionBtn_${color}`]}`}
    onClick={onClick}
    disabled={loading}
  >
    {loading ? <span className={styles.btnSpinner} /> : icon}
    {label}
  </button>
);
