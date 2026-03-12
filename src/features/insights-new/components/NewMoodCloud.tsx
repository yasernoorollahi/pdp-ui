import { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts/core';
import { TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import 'echarts-wordcloud';
import type { MoodWord } from '../../../services/insights.service';
import { Card, Button, Skeleton } from '../../../components/ui';
import styles from './NewMoodCloud.module.css';

echarts.use([TooltipComponent, CanvasRenderer]);

type NewMoodCloudProps = {
  data: MoodWord[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

const palette = ['#2dd4bf', '#34d399', '#60a5fa', '#fcd34d', '#c084fc'];

export const NewMoodCloud = ({ data, loading, error, onRetry }: NewMoodCloudProps) => {
  const chartRef = useRef<HTMLDivElement | null>(null);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.map((item, index) => ({
      name: item.word,
      value: item.count,
      textStyle: {
        color: palette[index % palette.length],
      },
    }));
  }, [data]);

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    const chart = echarts.init(chartRef.current);

    chart.setOption({
      tooltip: {
        backgroundColor: 'rgba(6, 12, 16, 0.92)',
        borderColor: 'rgba(45, 212, 191, 0.2)',
        borderWidth: 1,
        textStyle: {
          color: '#e8f5f3',
          fontSize: 12,
        },
      },
      series: [
        {
          type: 'wordCloud',
          shape: 'circle',
          gridSize: 10,
          sizeRange: [14, 46],
          rotationRange: [-15, 15],
          drawOutOfBound: false,
          textStyle: {
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 600,
          },
          emphasis: {
            textStyle: {
              shadowBlur: 12,
              shadowColor: 'rgba(45, 212, 191, 0.6)',
            },
          },
          data: chartData,
        },
      ],
    });

    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });

    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [chartData, data]);

  if (loading) {
    return (
      <Card className={`${styles.card} glassCard`}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Mood Cloud</p>
            <h3 className={styles.title}>The emotional weather</h3>
          </div>
        </div>
        <Skeleton count={3} className={styles.skeletonRow} />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`${styles.card} glassCard`}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Mood Cloud</p>
            <h3 className={styles.title}>The emotional weather</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>We couldn’t load the mood cloud.</p>
          <p className={styles.stateHint}>{error}</p>
          <Button variant="teal" onClick={onRetry}>Try again</Button>
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className={`${styles.card} glassCard`}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Mood Cloud</p>
            <h3 className={styles.title}>The emotional weather</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>No mood signals yet.</p>
          <p className={styles.stateHint}>We’ll start shaping this once reflections are captured.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`${styles.card} glassCard`}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Mood Cloud</p>
          <h3 className={styles.title}>The emotional weather</h3>
        </div>
        <div className={styles.headerNote}>Dominant feelings from recent days.</div>
      </div>

      <div className={styles.cloud} ref={chartRef} />
    </Card>
  );
};
