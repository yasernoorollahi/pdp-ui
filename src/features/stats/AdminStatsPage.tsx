import { useEffect, useState } from 'react';
import axios from 'axios';
import { systemService } from '../../services/system.service';
import type { PdpMetric } from '../../services/pdpMetrics.service';
import { pdpMetricsDashboardService } from '../../services/pdpMetricsDashboard.service';
import type { SystemOverview, SystemStats, OverviewData } from '../../services/system.service';
import { JobsControlTab } from '../job-management/JobsControlTab';
import { PdpMetricsTab } from './pdp-metrics/PdpMetricsTab';
import styles from './AdminStatsPage.module.css';

type TabType = 'stats' | 'overview' | 'jobs' | 'pdp';

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

export const AdminStatsPage = () => {
    const [activeTab, setActiveTab] = useState<TabType>('stats');
    const [data, setData] = useState<SystemOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pdpMetrics, setPdpMetrics] = useState<PdpMetric[]>([]);
    const [pdpLoading, setPdpLoading] = useState(false);
    const [pdpError, setPdpError] = useState<string | null>(null);
    const [pdpUpdatedAt, setPdpUpdatedAt] = useState<string | null>(null);

    const getErrorMessage = (err: unknown, fallback: string) => {
        if (axios.isAxiosError(err)) {
            return err.response?.data?.message || fallback;
        }
        return fallback;
    };

    const fetchOverview = async (withLoader = false) => {
        if (withLoader) {
            setLoading(true);
        }

        setError(null);

        try {
            const overview = await systemService.getSystemOverview();
            setData(overview);
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to fetch system data'));
        } finally {
            if (withLoader) {
                setLoading(false);
            }
        }
    };

    const fetchPdp = async (withLoader = false) => {
        if (withLoader) {
            setPdpLoading(true);
        }

        setPdpError(null);

        try {
            const bundle = await pdpMetricsDashboardService.getBundle();
            setPdpMetrics(bundle.metrics);
            setPdpUpdatedAt(bundle.updatedAt);
        } catch (err) {
            setPdpError(getErrorMessage(err, 'Failed to fetch PDP metrics'));
        } finally {
            if (withLoader) {
                setPdpLoading(false);
            }
        }
    };

    useEffect(() => {
        void fetchOverview(true);
    }, []);

    useEffect(() => {
        if (activeTab === 'pdp' && pdpMetrics.length === 0 && !pdpLoading) {
            void fetchPdp(true);
        }
    }, [activeTab, pdpLoading, pdpMetrics.length]);

    useEffect(() => {
        const id = window.setInterval(() => {
            void fetchOverview(false);

            if (activeTab === 'pdp') {
                void fetchPdp(false);
            }
        }, 10000);

        return () => window.clearInterval(id);
    }, [activeTab]);

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
                <button
                    className={`${styles.tabBtn} ${activeTab === 'pdp' ? styles.tabBtnActive : ''}`}
                    onClick={() => setActiveTab('pdp')}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                    </svg>
                    PDP Metrics
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
                    <button onClick={() => void fetchOverview(true)} className={styles.retryBtn}>Retry Connection</button>
                </div>
            ) : data ? (
                <div key={activeTab} className={styles.tabContent}>
                    {activeTab === 'stats'    && <StatsTab stats={data.businessStats} />}
                    {activeTab === 'overview' && <OverviewTab data={data.system} />}
                    {activeTab === 'jobs'     && <JobsControlTab recentJobs={data.recentJobs} />}
                    {activeTab === 'pdp'      && (
                        <PdpMetricsTab
                            metrics={pdpMetrics}
                            loading={pdpLoading}
                            error={pdpError}
                            updatedAt={pdpUpdatedAt}
                            onRetry={() => {
                                void fetchOverview(false);
                                void fetchPdp(true);
                            }}
                        />
                    )}
                </div>
            ) : null}
        </div>
    );
};
