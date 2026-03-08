import { useState } from 'react';
import axios from 'axios';
import { systemService } from '../../services/system.service';
import { usePolling } from '../../hooks/usePolling';
import type { SystemOverview, JobLog, SystemStats, OverviewData } from '../../services/system.service';
import styles from './AdminStatsPage.module.css';

type TabType = 'stats' | 'overview' | 'jobs';

const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
};

const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb.toFixed(0)} MB`;
};

const formatPercent = (val: number) => `${(val * 100).toFixed(2)}%`;

const StatusBadge = ({ status }: { status: string }) => (
    <span className={status === 'UP' ? styles.badgeUp : styles.badgeDown}>
        <span className={status === 'UP' ? styles.badgeDot : styles.badgeDotRed}></span>
        {status}
    </span>
);

const CircleProgress = ({ percent, color, label, value }: {
    percent: number; color: string; label: string; value: string;
}) => {
    const r = 36;
    const circ = 2 * Math.PI * r;
    const offset = circ - (Math.min(percent, 100) / 100) * circ;
    return (
        <div className={styles.circleWrapper}>
            <svg width="90" height="90" viewBox="0 0 90 90">
                <circle cx="45" cy="45" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
                <circle
                    cx="45" cy="45" r={r} fill="none"
                    stroke={color} strokeWidth="7"
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform="rotate(-90 45 45)"
                    style={{ transition: 'stroke-dashoffset 1.2s ease' }}
                />
            </svg>
            <div className={styles.circleInner}>
                <span className={styles.circleValue}>{value}</span>
            </div>
            <span className={styles.circleLabel}>{label}</span>
        </div>
    );
};

const StatsTab = ({ stats }: { stats: SystemStats }) => {
    if (!stats) return null;

    return (
        <div className={styles.statsGrid}>
            {/* Users */}
            <div className={styles.glassCard}>
                <div className={styles.cardHeader}>
                    <div className={`${styles.cardIconWrapper} ${styles.blueIcon}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                    </div>
                    <h3 className={styles.cardTitle}>User Metrics</h3>
                </div>
                <div className={styles.miniBarGroup}>
                    <div className={styles.miniBarItem}>
                        <div className={styles.miniBarHeader}>
                            <span className={styles.statLabel}>Total</span>
                            <span className={styles.statValue}>{stats.totalUsers}</span>
                        </div>
                        <div className={styles.miniBarTrack}>
                            <div className={styles.miniBarFillBlue} style={{ width: '100%' }} />
                        </div>
                    </div>
                    <div className={styles.miniBarItem}>
                        <div className={styles.miniBarHeader}>
                            <span className={styles.statLabel}>Active</span>
                            <span className={`${styles.statValue} ${styles.statValueHighlight}`}>{stats.activeUsers}</span>
                        </div>
                        <div className={styles.miniBarTrack}>
                            <div className={styles.miniBarFillGreen} style={{ width: `${stats.totalUsers > 0 ? (stats.activeUsers / stats.totalUsers) * 100 : 0}%` }} />
                        </div>
                    </div>
                    <div className={styles.miniBarItem}>
                        <div className={styles.miniBarHeader}>
                            <span className={styles.statLabel}>Locked</span>
                            <span className={styles.statValue}>{stats.lockedUsers}</span>
                        </div>
                        <div className={styles.miniBarTrack}>
                            <div className={styles.miniBarFillRed} style={{ width: `${stats.totalUsers > 0 ? (stats.lockedUsers / stats.totalUsers) * 100 : 0}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Items */}
            <div className={styles.glassCard}>
                <div className={styles.cardHeader}>
                    <div className={`${styles.cardIconWrapper} ${styles.purpleIcon}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                            <line x1="12" y1="22.08" x2="12" y2="12"></line>
                        </svg>
                    </div>
                    <h3 className={styles.cardTitle}>Content Items</h3>
                </div>
                <div className={styles.miniBarGroup}>
                    <div className={styles.miniBarItem}>
                        <div className={styles.miniBarHeader}>
                            <span className={styles.statLabel}>Total</span>
                            <span className={styles.statValue}>{stats.totalItems}</span>
                        </div>
                        <div className={styles.miniBarTrack}>
                            <div className={styles.miniBarFillPurple} style={{ width: '100%' }} />
                        </div>
                    </div>
                    <div className={styles.miniBarItem}>
                        <div className={styles.miniBarHeader}>
                            <span className={styles.statLabel}>Active</span>
                            <span className={`${styles.statValue} ${styles.statValueHighlight}`}>{stats.activeItems}</span>
                        </div>
                        <div className={styles.miniBarTrack}>
                            <div className={styles.miniBarFillGreen} style={{ width: `${stats.totalItems > 0 ? (stats.activeItems / stats.totalItems) * 100 : 0}%` }} />
                        </div>
                    </div>
                    <div className={styles.miniBarItem}>
                        <div className={styles.miniBarHeader}>
                            <span className={styles.statLabel}>Archived</span>
                            <span className={styles.statValue}>{stats.archivedItems}</span>
                        </div>
                        <div className={styles.miniBarTrack}>
                            <div className={styles.miniBarFillOrange} style={{ width: `${stats.totalItems > 0 ? (stats.archivedItems / stats.totalItems) * 100 : 0}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tokens */}
            <div className={styles.glassCard}>
                <div className={styles.cardHeader}>
                    <div className={`${styles.cardIconWrapper} ${styles.tealIcon}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                    </div>
                    <h3 className={styles.cardTitle}>Security & Tokens</h3>
                </div>
                <div>
                    <div className={styles.statRow}>
                        <span className={styles.statLabel}>Refresh Tokens</span>
                        <span className={styles.statValue}>{stats.totalRefreshTokens}</span>
                    </div>
                    <div className={styles.statRow}>
                        <span className={styles.statLabel}>Active Tokens</span>
                        <span className={`${styles.statValue} ${styles.statValueHighlight}`}>{stats.activeRefreshTokens}</span>
                    </div>
                    <div className={styles.animatedSvg}>
                        <svg width="100%" height="100%" viewBox="0 0 200 80">
                            <path className={styles.pathPulse} d="M10,40 Q50,10 100,40 T190,40" fill="none" stroke="#2dd4bf" strokeWidth="2" opacity="0.6" />
                            <circle className={styles.floatingNode} cx="10" cy="40" r="4" fill="#60a5fa" />
                            <circle className={styles.floatingNode} cx="100" cy="40" r="5" fill="#2dd4bf" style={{ animationDelay: '1s' }} />
                            <circle className={styles.floatingNode} cx="190" cy="40" r="4" fill="#a855f7" style={{ animationDelay: '2s' }} />
                            <path d="M100,40 L190,40" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="4 4" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Notifications */}
            <div className={styles.glassCard}>
                <div className={styles.cardHeader}>
                    <div className={`${styles.cardIconWrapper} ${styles.orangeIcon}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                        </svg>
                    </div>
                    <h3 className={styles.cardTitle}>Notifications</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '0.75rem', padding: '1rem 0' }}>
                    <div style={{ position: 'relative', display: 'inline-flex' }}>
                        <span style={{ fontSize: '3.5rem', fontWeight: 800, color: stats.pendingNotifications > 0 ? '#fb923c' : '#1e293b', lineHeight: 1, transition: 'color 0.3s' }}>
                            {stats.pendingNotifications}
                        </span>
                        {stats.pendingNotifications > 0 && (
                            <span style={{
                                position: 'absolute', top: -4, right: -12,
                                width: 10, height: 10, borderRadius: '50%',
                                background: '#fb923c', boxShadow: '0 0 8px #fb923c',
                                animation: 'glow 1.5s infinite'
                            }} />
                        )}
                    </div>
                    <span style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Pending Notifications
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
                        <span style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: stats.pendingNotifications > 0 ? '#fb923c' : '#4ade80',
                            boxShadow: stats.pendingNotifications > 0 ? '0 0 6px #fb923c' : '0 0 6px #4ade80'
                        }} />
                        <span style={{ color: stats.pendingNotifications > 0 ? '#fb923c' : '#4ade80' }}>
                            {stats.pendingNotifications > 0 ? 'Queued' : 'All clear'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const OverviewTab = ({ data }: { data: OverviewData }) => {
    if (!data) return null;
    const { metrics } = data;
    const heapPercent = Math.round((metrics.jvmHeapUsedBytes / metrics.jvmHeapMaxBytes) * 100);
    const cpuProcessPercent = metrics.processCpuUsage * 100;
    const cpuSystemPercent = metrics.systemCpuUsage * 100;

    const componentIcons: Record<string, React.ReactNode> = {
        application: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
        database: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
        db: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
        diskSpace: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M22 12H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" y1="16" x2="6.01" y2="16"/><line x1="10" y1="16" x2="10.01" y2="16"/></svg>,
        ping: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
        ssl: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    };

    return (
        <div className={styles.overviewGrid}>
            {/* Status Banner */}
            <div className={`${styles.glassCard} ${styles.statusBanner}`}>
                <div className={styles.statusBannerInner}>
                    <div className={data.overallStatus === 'UP' ? styles.statusPulseRing : styles.statusPulseRingRed}>
                        <div className={data.overallStatus === 'UP' ? styles.statusPulseCore : styles.statusPulseCoreRed} />
                    </div>
                    <div>
                        <p className={styles.statusBannerLabel}>Overall System Status</p>
                        <h2 className={data.overallStatus === 'UP' ? styles.statusBannerValueUp : styles.statusBannerValueDown}>
                            {data.overallStatus}
                        </h2>
                    </div>
                </div>
                <div className={styles.statusTimestamp}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Last checked: {new Date(data.generatedAt).toLocaleTimeString()}
                </div>
            </div>

            {/* Health Components */}
            <div className={styles.glassCard}>
                <div className={styles.cardHeader}>
                    <div className={`${styles.cardIconWrapper} ${styles.tealIcon}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                        </svg>
                    </div>
                    <h3 className={styles.cardTitle}>Health Components</h3>
                </div>
                <div className={styles.healthGrid}>
                    {Object.entries(data.healthComponents).map(([key, status]) => (
                        <div key={key} className={styles.healthItem}>
                            <div className={styles.healthItemIcon}>
                                {componentIcons[key] || <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="12" cy="12" r="10"/></svg>}
                            </div>
                            <span className={styles.healthItemName}>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                            <StatusBadge status={status} />
                        </div>
                    ))}
                </div>
            </div>

            {/* CPU Gauges */}
            <div className={styles.glassCard}>
                <div className={styles.cardHeader}>
                    <div className={`${styles.cardIconWrapper} ${styles.purpleIcon}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/>
                            <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
                            <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
                            <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
                            <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
                        </svg>
                    </div>
                    <h3 className={styles.cardTitle}>CPU Usage</h3>
                </div>
                <div className={styles.circleRow}>
                    <CircleProgress
                        percent={cpuProcessPercent}
                        color="#a855f7"
                        label="Process CPU"
                        value={formatPercent(metrics.processCpuUsage)}
                    />
                    <CircleProgress
                        percent={cpuSystemPercent}
                        color="#3b82f6"
                        label="System CPU"
                        value={formatPercent(metrics.systemCpuUsage)}
                    />
                </div>
            </div>

            {/* JVM Heap */}
            <div className={styles.glassCard}>
                <div className={styles.cardHeader}>
                    <div className={`${styles.cardIconWrapper} ${styles.orangeIcon}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                        </svg>
                    </div>
                    <h3 className={styles.cardTitle}>JVM Heap Memory</h3>
                </div>
                <div style={{ marginTop: 'auto', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.8rem', fontWeight: 700, color: 'white' }}>{formatBytes(metrics.jvmHeapUsedBytes)}</span>
                        <span style={{ color: '#94a3b8' }}>/ {formatBytes(metrics.jvmHeapMaxBytes)}</span>
                    </div>
                    <div className={styles.memoryBarContainer}>
                        <div className={styles.memoryBarFill} style={{
                            width: `${heapPercent}%`,
                            background: heapPercent > 85 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'linear-gradient(90deg, #f97316, #a855f7)'
                        }} />
                    </div>
                    <div className={styles.memoryText}>
                        <span>Heap Usage</span>
                        <span>{heapPercent}%</span>
                    </div>
                </div>
            </div>

            {/* Runtime Metrics */}
            <div className={`${styles.glassCard} ${styles.metricsRow}`}>
                <div className={styles.cardHeader}>
                    <div className={`${styles.cardIconWrapper} ${styles.blueIcon}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                        </svg>
                    </div>
                    <h3 className={styles.cardTitle}>Runtime Metrics</h3>
                </div>
                <div className={styles.metricsInlineGrid}>
                    <div className={styles.metricInlineTile}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" width="20" height="20">
                            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <div>
                            <p className={styles.metricTileValue}>{formatUptime(metrics.processUptimeSeconds)}</p>
                            <p className={styles.metricTileLabel}>Process Uptime</p>
                        </div>
                    </div>
                    <div className={styles.metricInlineTile}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="2" width="20" height="20">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        <div>
                            <p className={styles.metricTileValue}>{metrics.httpServerRequestsCount.toFixed(0)}</p>
                            <p className={styles.metricTileLabel}>HTTP Requests</p>
                        </div>
                    </div>
                    <div className={styles.metricInlineTile}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" width="20" height="20">
                            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <div>
                            <p className={styles.metricTileValue}>{((metrics.httpServerRequestsMeanSeconds ?? 0) * 1000).toFixed(1)}<span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ms</span></p>
                            <p className={styles.metricTileLabel}>Mean Response</p>
                        </div>
                    </div>
                    <div className={styles.metricInlineTile}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" width="20" height="20">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                        <div>
                            <p className={styles.metricTileValue}>{(metrics.jvmThreadsLive ?? 0).toFixed(0)}</p>
                            <p className={styles.metricTileLabel}>Live Threads</p>
                        </div>
                    </div>
                    <div className={styles.metricInlineTile}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" width="20" height="20">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                        <div>
                            <p className={styles.metricTileValue}>{metrics.itemCreatedCount.toFixed(0)}</p>
                            <p className={styles.metricTileLabel}>Items Created</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hikari Connection Pool */}
            {metrics.hikari && (
            <div className={`${styles.glassCard} ${styles.metricsRow}`}>
                <div className={styles.cardHeader}>
                    <div className={`${styles.cardIconWrapper} ${styles.tealIcon}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <ellipse cx="12" cy="5" rx="9" ry="3"/>
                            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                        </svg>
                    </div>
                    <h3 className={styles.cardTitle}>HikariCP — Connection Pool</h3>
                    <span className={styles.logCount}>{metrics.hikari.maxConnections.toFixed(0)} max</span>
                </div>
                <div className={styles.hikariGrid}>
                    {/* Pool usage bar */}
                    <div style={{ gridColumn: '1 / -1' }}>
                        <div className={styles.miniBarHeader} style={{ marginBottom: '0.4rem' }}>
                            <span className={styles.statLabel}>Pool Utilization</span>
                            <span style={{ fontSize: '0.85rem', color: '#2dd4bf', fontWeight: 600 }}>
                                {metrics.hikari.activeConnections.toFixed(0)} active / {metrics.hikari.maxConnections.toFixed(0)} max
                            </span>
                        </div>
                        <div className={styles.miniBarTrack} style={{ height: '8px' }}>
                            <div className={styles.miniBarFillBlue}
                                style={{ width: `${(metrics.hikari.idleConnections / metrics.hikari.maxConnections) * 100}%` }} />
                            <div className={styles.miniBarFillGreen}
                                style={{ width: `${(metrics.hikari.activeConnections / metrics.hikari.maxConnections) * 100}%`, marginLeft: 0 }} />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem' }}>
                            <span style={{ fontSize: '0.75rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#60a5fa', display: 'inline-block' }} /> Idle
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#4ade80', display: 'inline-block' }} /> Active
                            </span>
                        </div>
                    </div>
                    {/* Stats */}
                    <div className={styles.hikariStat}>
                        <span className={styles.hikariStatVal} style={{ color: '#4ade80' }}>{metrics.hikari.activeConnections.toFixed(0)}</span>
                        <span className={styles.hikariStatLabel}>Active</span>
                    </div>
                    <div className={styles.hikariStat}>
                        <span className={styles.hikariStatVal} style={{ color: '#60a5fa' }}>{metrics.hikari.idleConnections.toFixed(0)}</span>
                        <span className={styles.hikariStatLabel}>Idle</span>
                    </div>
                    <div className={styles.hikariStat}>
                        <span className={styles.hikariStatVal} style={{ color: metrics.hikari.pendingConnections > 0 ? '#f87171' : '#475569' }}>{metrics.hikari.pendingConnections.toFixed(0)}</span>
                        <span className={styles.hikariStatLabel}>Pending</span>
                    </div>
                    <div className={styles.hikariStat}>
                        <span className={styles.hikariStatVal} style={{ color: '#94a3b8' }}>{metrics.hikari.minConnections.toFixed(0)}</span>
                        <span className={styles.hikariStatLabel}>Min</span>
                    </div>
                    <div className={styles.hikariStat}>
                        <span className={styles.hikariStatVal} style={{ color: '#94a3b8' }}>{metrics.hikari.maxConnections.toFixed(0)}</span>
                        <span className={styles.hikariStatLabel}>Max</span>
                    </div>
                </div>
            </div>
            )}
        </div>
    );
};

// ─── Jobs Tab ─────────────────────────────────────────────────────────────────

const formatJobName = (name: string) =>
    name.replace(/Job$/, '').replace(/([A-Z])/g, ' $1').trim();

const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const formatDateShort = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const JobStatusBadge = ({ status }: { status: string }) => {
    const cfg: Record<string, { bg: string; color: string; border: string; dot: string }> = {
        SUCCESS: { bg: 'rgba(74,222,128,0.1)', color: '#4ade80', border: 'rgba(74,222,128,0.2)', dot: '#4ade80' },
        FAILED:  { bg: 'rgba(248,113,113,0.1)', color: '#f87171', border: 'rgba(248,113,113,0.2)', dot: '#f87171' },
        RUNNING: { bg: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: 'rgba(251,191,36,0.2)', dot: '#fbbf24' },
    };
    const s = cfg[status] ?? cfg.RUNNING;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.2rem 0.7rem', borderRadius: 999, fontSize: '0.78rem',
            fontWeight: 600, background: s.bg, color: s.color,
            border: `1px solid ${s.border}`, letterSpacing: '0.04em',
        }}>
            <span style={{
                width: 6, height: 6, borderRadius: '50%', background: s.dot,
                boxShadow: status === 'RUNNING' ? `0 0 6px ${s.dot}` : undefined,
                animation: status === 'RUNNING' ? 'glow 1.5s infinite' : undefined,
            }} />
            {status}
        </span>
    );
};

// ─── Job Accordion Row ────────────────────────────────────────────────────────

const JobAccordionRow = ({ name, logs, prevLatestId }: {
    name: string;
    logs: JobLog[];
    prevLatestId: string | null;
}) => {
    const [open, setOpen] = useState(false);
    const latestRun = logs[0];
    const isNewRun = prevLatestId !== null && latestRun.id !== prevLatestId;
    const successCount = logs.filter(j => j.status === 'SUCCESS').length;
    const failedCount  = logs.filter(j => j.status === 'FAILED').length;
    const successRate  = Math.round((successCount / logs.length) * 100);
    const avgDuration  = (logs.reduce((a, j) => a + j.duration, 0) / logs.length).toFixed(0);
    const hasFailed    = latestRun.status === 'FAILED';

    const accentColor = hasFailed ? '#f87171' : '#4ade80';
    const accentBorder= hasFailed ? 'rgba(248,113,113,0.2)' : 'rgba(74,222,128,0.15)';

    return (
        <div
            className={`${styles.accordionCard} ${isNewRun ? styles.accordionFlash : ''}`}
            style={{ borderColor: open ? accentBorder : undefined }}
        >
            {/* Header — always visible */}
            <button className={styles.accordionHeader} onClick={() => setOpen(o => !o)}>
                {/* Left: status pulse + name */}
                <div className={styles.accordionLeft}>
                    <div className={styles.jobPulseWrapper}>
                        <span className={styles.jobPulseDot} style={{ background: accentColor, boxShadow: `0 0 8px ${accentColor}` }} />
                        {isNewRun && <span className={styles.jobPulseRing} style={{ borderColor: accentColor }} />}
                    </div>
                    <div>
                        <p className={styles.accordionName}>{formatJobName(name)}</p>
                        <p className={styles.accordionRaw}>{name}</p>
                    </div>
                </div>

                {/* Center: mini sparkline of last 8 runs */}
                <div className={styles.sparklineWrapper}>
                    {logs.slice(0, 8).reverse().map((job, i) => (
                        <div
                            key={job.id}
                            className={styles.sparkBar}
                            style={{
                                height: `${Math.max(20, Math.min(100, (job.duration / Math.max(...logs.map(j => j.duration), 1)) * 100))}%`,
                                background: job.status === 'SUCCESS' ? '#4ade80' : '#f87171',
                                animationDelay: `${i * 0.05}s`,
                                opacity: i === logs.slice(0, 8).length - 1 ? 1 : 0.4 + i * 0.08,
                            }}
                        />
                    ))}
                </div>

                {/* Right: stats + badge + chevron */}
                <div className={styles.accordionRight}>
                    <div className={styles.accordionMeta}>
                        <span className={styles.accordionMetaItem}>
                            <span style={{ color: '#64748b', fontSize: '0.75rem' }}>runs</span>
                            <span className={styles.accordionMetaVal}>{logs.length}</span>
                        </span>
                        <span className={styles.accordionMetaItem}>
                            <span style={{ color: '#64748b', fontSize: '0.75rem' }}>avg</span>
                            <span className={styles.accordionMetaVal}>{avgDuration}ms</span>
                        </span>
                        <span className={styles.accordionMetaItem}>
                            <span style={{ color: '#64748b', fontSize: '0.75rem' }}>last</span>
                            <span className={styles.accordionMetaVal}>{formatDateTime(latestRun.startedAt)}</span>
                        </span>
                    </div>
                    <JobStatusBadge status={latestRun.status} />
                    <svg
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        width="16" height="16"
                        style={{ color: '#475569', transition: 'transform 0.3s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
                    >
                        <polyline points="6 9 12 15 18 9"/>
                    </svg>
                </div>
            </button>

            {/* Success rate bar under header */}
            <div className={styles.accordionProgressBar}>
                <div
                    className={successRate === 100 ? styles.miniBarFillGreen : styles.miniBarFillRed}
                    style={{ width: `${successRate}%`, height: '3px', borderRadius: 0, transition: 'width 1s ease' }}
                />
            </div>

            {/* Expandable detail table */}
            {open && (
                <div className={styles.accordionBody}>
                    {/* Stats row */}
                    <div className={styles.accordionStats}>
                        <div className={styles.accordionStatTile} style={{ borderColor: 'rgba(74,222,128,0.15)' }}>
                            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4ade80' }}>{successCount}</span>
                            <span className={styles.accordionStatLabel}>Success</span>
                        </div>
                        <div className={styles.accordionStatTile} style={{ borderColor: failedCount > 0 ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.06)' }}>
                            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: failedCount > 0 ? '#f87171' : '#64748b' }}>{failedCount}</span>
                            <span className={styles.accordionStatLabel}>Failed</span>
                        </div>
                        <div className={styles.accordionStatTile}>
                            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fbbf24' }}>{avgDuration}<span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>ms</span></span>
                            <span className={styles.accordionStatLabel}>Avg Duration</span>
                        </div>
                        <div className={styles.accordionStatTile}>
                            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: successRate === 100 ? '#4ade80' : '#f87171' }}>{successRate}%</span>
                            <span className={styles.accordionStatLabel}>Success Rate</span>
                        </div>
                    </div>

                    {/* Runs list */}
                    <div className={styles.accordionRunList}>
                        {logs.map((job, i) => (
                            <div key={job.id} className={`${styles.accordionRunRow} ${i === 0 ? styles.accordionRunRowLatest : ''}`}
                                style={{ animationDelay: `${i * 0.04}s` }}>
                                <div className={styles.accordionRunIndex}>
                                    {i === 0 && <span className={styles.latestTag}>latest</span>}
                                    {i > 0 && <span style={{ color: '#334155', fontSize: '0.75rem' }}>#{i + 1}</span>}
                                </div>
                                <div className={styles.accordionRunTime}>
                                    <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>{formatDateShort(job.startedAt)}</span>
                                    <span style={{ color: '#64748b', fontSize: '0.78rem' }}>{formatDateTime(job.startedAt)} → {formatDateTime(job.finishedAt)}</span>
                                </div>
                                <span className={styles.durationPill}>{job.duration}ms</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {job.processedCount > 0 && (
                                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{job.processedCount} processed</span>
                                    )}
                                    <JobStatusBadge status={job.status} />
                                </div>
                                {job.errorMessage && (
                                    <div className={styles.accordionError}>{job.errorMessage}</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Jobs Tab ─────────────────────────────────────────────────────────────────

const JobsTab = ({ jobs, prevJobs }: { jobs: JobLog[]; prevJobs: JobLog[] | null }) => {
    if (!jobs || jobs.length === 0) return (
        <div className={styles.glassCard}>
            <div className={styles.emptyJobs}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40" style={{ color: '#334155' }}>
                    <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                </svg>
                <p>No job executions recorded yet</p>
            </div>
        </div>
    );

    const successCount = jobs.filter(j => j.status === 'SUCCESS').length;
    const failedCount  = jobs.filter(j => j.status === 'FAILED').length;
    const avgDuration  = (jobs.reduce((a, j) => a + j.duration, 0) / jobs.length).toFixed(1);

    // Group by jobName, sorted by most recent first
    const byName: Record<string, JobLog[]> = {};
    jobs.forEach(j => { (byName[j.jobName] = byName[j.jobName] || []).push(j); });

    // Build prevLatestId map from previous fetch
    const prevLatestMap: Record<string, string | null> = {};
    if (prevJobs) {
        const prevByName: Record<string, JobLog[]> = {};
        prevJobs.forEach(j => { (prevByName[j.jobName] = prevByName[j.jobName] || []).push(j); });
        Object.entries(prevByName).forEach(([name, logs]) => { prevLatestMap[name] = logs[0]?.id ?? null; });
    }

    return (
        <div className={styles.jobsContainer}>
            {/* Summary strip */}
            <div className={styles.jobsSummaryRow}>
                <div className={`${styles.glassCard} ${styles.jobSummaryCard}`}>
                    <div className={styles.jobSummaryIcon} style={{ background: 'rgba(96,165,250,0.12)', color: '#60a5fa' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                            <line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
                        </svg>
                    </div>
                    <div>
                        <p className={styles.jobSummaryValue}>{jobs.length}</p>
                        <p className={styles.jobSummaryLabel}>Total Executions</p>
                    </div>
                </div>
                <div className={`${styles.glassCard} ${styles.jobSummaryCard}`}>
                    <div className={styles.jobSummaryIcon} style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <div>
                        <p className={styles.jobSummaryValue} style={{ color: '#4ade80' }}>{successCount}</p>
                        <p className={styles.jobSummaryLabel}>Succeeded</p>
                    </div>
                </div>
                <div className={`${styles.glassCard} ${styles.jobSummaryCard}`}>
                    <div className={styles.jobSummaryIcon} style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                    </div>
                    <div>
                        <p className={styles.jobSummaryValue} style={{ color: failedCount > 0 ? '#f87171' : '#f1f5f9' }}>{failedCount}</p>
                        <p className={styles.jobSummaryLabel}>Failed</p>
                    </div>
                </div>
                <div className={`${styles.glassCard} ${styles.jobSummaryCard}`}>
                    <div className={styles.jobSummaryIcon} style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                    </div>
                    <div>
                        <p className={styles.jobSummaryValue}>{avgDuration}<span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 400 }}>ms</span></p>
                        <p className={styles.jobSummaryLabel}>Avg Duration</p>
                    </div>
                </div>
                <div className={`${styles.glassCard} ${styles.jobSummaryCard}`}>
                    <div className={styles.jobSummaryIcon} style={{ background: 'rgba(168,85,247,0.12)', color: '#c084fc' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                        </svg>
                    </div>
                    <div>
                        <p className={styles.jobSummaryValue}>{Object.keys(byName).length}</p>
                        <p className={styles.jobSummaryLabel}>Job Types</p>
                    </div>
                </div>
            </div>

            {/* Accordion list */}
            <div className={styles.accordionList}>
                {Object.entries(byName).map(([name, logs]) => (
                    <JobAccordionRow
                        key={name}
                        name={name}
                        logs={logs}
                        prevLatestId={prevLatestMap[name] ?? null}
                    />
                ))}
            </div>
        </div>
    );
};

export const AdminStatsPage = () => {
    const [activeTab, setActiveTab] = useState<TabType>('stats');
    const [data, setData] = useState<SystemOverview | null>(null);
    const [prevJobs, setPrevJobs] = useState<JobLog[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAll = async () => {
        try {
            setError(null);
            const response = await systemService.getSystemOverview();
            setData(prev => {
                setPrevJobs(prev?.recentJobs ?? null);
                return response;
            });
        } catch (err) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.message || 'Failed to fetch system data');
            } else {
                setError('Failed to fetch system data');
            }
        } finally {
            setLoading(false);
        }
    };

    usePolling(fetchAll, 10000);

    return (
        <div className={styles.statsContainer}>
            <header className={styles.statsHeader}>
                <div>
                    <h1 className={styles.title}>
                        <svg className={styles.titleIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="28" height="28">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                        </svg>
                        System Statistics
                    </h1>
                    <p className={styles.subtitle}>Real-time overview of platform metrics and health</p>
                </div>
            </header>

            <div className={styles.tabBar}>
                <button
                    className={`${styles.tabBtn} ${activeTab === 'stats' ? styles.tabBtnActive : ''}`}
                    onClick={() => setActiveTab('stats')}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                    </svg>
                    Stats
                </button>
                <button
                    className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.tabBtnActive : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                    Health Overview
                    {data?.system?.overallStatus && (
                        <span className={data.system.overallStatus === 'UP' ? styles.tabDotGreen : styles.tabDotRed} />
                    )}
                </button>
                <button
                    className={`${styles.tabBtn} ${activeTab === 'jobs' ? styles.tabBtnActive : ''}`}
                    onClick={() => setActiveTab('jobs')}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <rect x="2" y="7" width="20" height="14" rx="2"/>
                        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                    </svg>
                    Jobs
                    {data?.recentJobs?.some(j => j.status === 'FAILED') && (
                        <span className={styles.tabDotRed} />
                    )}
                </button>
            </div>

            {loading && !data ? (
                <div className={styles.loadingContainer}>
                    <div className={styles.spinner}></div>
                    <p>Loading System Statistics...</p>
                </div>
            ) : error && !data ? (
                <div className={styles.errorContainer}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48" style={{ marginBottom: '1rem' }}>
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <h2>Oops! Something went wrong</h2>
                    <p>{error}</p>
                    <button onClick={fetchAll} className={styles.retryBtn}>Retry Connection</button>
                </div>
            ) : data ? (
                <div key={activeTab} className={styles.tabContent}>
                    {activeTab === 'stats'    && <StatsTab stats={data.businessStats} />}
                    {activeTab === 'overview' && <OverviewTab data={data.system} />}
                    {activeTab === 'jobs'     && <JobsTab jobs={data.recentJobs} prevJobs={prevJobs} />}
                </div>
            ) : null}
        </div>
    );
};
