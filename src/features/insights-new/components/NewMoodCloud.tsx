import { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts/core';
import { TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import 'echarts-wordcloud';
import type { MoodWord } from '../../../services/insights.service';
import { Card, Button, Skeleton } from '../../../components/ui';
import { SIGNAL_COLORS } from '../utils/signalUtils';
import styles from './NewMoodCloud.module.css';

echarts.use([TooltipComponent, CanvasRenderer]);

type NewMoodCloudProps = {
  data: MoodWord[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

const palette = [
  SIGNAL_COLORS.energy,
  SIGNAL_COLORS.motivation,
  SIGNAL_COLORS.social,
  SIGNAL_COLORS.discipline,
  SIGNAL_COLORS.friction,
];

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
        show: true,
        confine: true,
        backgroundColor: 'rgba(6, 12, 16, 0.92)',
        borderColor: 'rgba(91, 140, 255, 0.25)',
        borderWidth: 1,
        textStyle: {
          color: '#e8f5f3',
          fontSize: 12,
        },
        formatter: (params: { name?: string; value?: number }) => {
          const count = typeof params.value === 'number' ? params.value : 0;

          return [
            `<div style="font-weight:600;color:#f8fafc;margin-bottom:4px;">${params.name ?? 'Signal word'}</div>`,
            `<div style="color:rgba(226, 232, 240, 0.82);">Appeared <span style="color:${SIGNAL_COLORS.social};font-family:JetBrains Mono, SF Mono, monospace;">${count}</span> times</div>`,
          ].join('');
        },
      },
      series: [
        {
          type: 'wordCloud',
          shape: 'circle',
          gridSize: 10,
          sizeRange: [14, 50],
          rotationRange: [-15, 15],
          drawOutOfBound: false,
          textStyle: {
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
          },
          emphasis: {
            textStyle: {
              shadowBlur: 14,
              shadowColor: 'rgba(0, 229, 255, 0.6)',
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
            <p className={styles.kicker}>Signal Word Cloud</p>
            <h3 className={styles.title}>Cognitive signals</h3>
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
            <p className={styles.kicker}>Signal Word Cloud</p>
            <h3 className={styles.title}>Cognitive signals</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>We couldn’t load the word cloud.</p>
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
            <p className={styles.kicker}>Signal Word Cloud</p>
            <h3 className={styles.title}>Cognitive signals</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>No signal words yet.</p>
          <p className={styles.stateHint}>We’ll start shaping this once reflections are captured.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`${styles.card} glassCard`}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Signal Word Cloud</p>
          <h3 className={styles.title}>Cognitive signals</h3>
        </div>
        <div className={styles.headerNote}>Dominant words from recent days.</div>
      </div>

      <div className={styles.cloud} ref={chartRef} />
    </Card>
  );
};
