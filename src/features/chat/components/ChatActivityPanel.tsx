import { GlassPanel } from '../../../components/ui';
import type { ChatActivityItem } from '../types/chat.types';
import styles from './ChatActivityPanel.module.css';

interface ChatActivityPanelProps {
  activity: ChatActivityItem[];
}

export const ChatActivityPanel = ({ activity }: ChatActivityPanelProps) => (
  <GlassPanel className={styles.activityPanel}>
    <div className={styles.header}>
      <div>
        <p className={styles.eyebrow}>Flow Timeline</p>
        <h3 className={styles.title}>Recent thread activity</h3>
      </div>
      <span className={styles.caption}>Live relay snapshots</span>
    </div>

    <div className={styles.timeline}>
      {activity.map((item) => (
        <article key={item.id} className={styles.timelineItem}>
          <span className={`${styles.timelineDot} ${styles[item.tone]}`} aria-hidden="true" />
          <div className={styles.itemContent}>
            <div className={styles.itemHeader}>
              <strong className={styles.itemTitle}>{item.title}</strong>
              <span className={styles.itemTime}>{item.timeLabel}</span>
            </div>
            <p className={styles.itemDetail}>{item.detail}</p>
          </div>
        </article>
      ))}
    </div>
  </GlassPanel>
);
