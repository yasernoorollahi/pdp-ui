import styles from './RiskBadge.module.css';

interface RiskBadgeProps {
  score: number;       // 0–100
  showBar?: boolean;   // render the progress bar (default: false → pill only)
}

type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

function getRiskLevel(score: number): RiskLevel {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

const LEVEL_LABEL: Record<RiskLevel, string> = {
  critical: 'Critical',
  high:     'High',
  medium:   'Medium',
  low:      'Low',
};

export const RiskBadge = ({ score, showBar = false }: RiskBadgeProps) => {
  const level = getRiskLevel(score);

  if (showBar) {
    return (
      <div className={styles.barWrap}>
        <div className={styles.barHeader}>
          <span className={styles.barLabel}>AI Risk Score</span>
          <span className={`${styles.barScore} ${styles[level]}`}>{score}</span>
        </div>
        <div className={styles.track}>
          <div
            className={`${styles.fill} ${styles[level]}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className={`${styles.levelLabel} ${styles[level]}`}>
          {LEVEL_LABEL[level]} Risk
        </span>
      </div>
    );
  }

  return (
    <span className={`${styles.pill} ${styles[level]}`}>
      <span className={styles.pillDot} />
      {score}
    </span>
  );
};
