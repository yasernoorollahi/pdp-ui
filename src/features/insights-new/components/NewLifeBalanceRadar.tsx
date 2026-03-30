import { useEffect, useMemo, useRef } from 'react';
import { Card, Button, Skeleton } from '../../../components/ui';
import type { TimelinePoint } from '../../../services/insights.service';
import * as echarts from 'echarts/core';
import { TooltipComponent, RadarComponent } from 'echarts/components';
import { RadarChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { SIGNAL_COLORS, clamp01 } from '../utils/signalUtils';
import styles from './NewLifeBalanceRadar.module.css';

echarts.use([TooltipComponent, RadarComponent, RadarChart, CanvasRenderer]);

const RADAR_AXES = ['Work', 'Health', 'Social', 'Discipline', 'Energy'] as const;

type NewLifeBalanceRadarProps = {
  data: TimelinePoint[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

const average = (values: number[]) => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export const NewLifeBalanceRadar = ({ data, loading, error, onRetry }: NewLifeBalanceRadarProps) => {
  const chartRef = useRef<HTMLDivElement | null>(null);

  const radarValues = useMemo(() => {
    if (!data || data.length === 0) return null;
    const frictionMax = Math.max(...data.map((item) => item.friction), 1);
    const socialMax = Math.max(...data.map((item) => item.social), 1);
    const disciplineMax = Math.max(...data.map((item) => item.discipline), 1);

    const energyAvg = clamp01(average(data.map((item) => item.energy)));
    const motivationAvg = clamp01(average(data.map((item) => item.motivation)));
    const frictionAvg = clamp01(average(data.map((item) => item.friction / frictionMax)));
    const socialAvg = clamp01(average(data.map((item) => item.social / socialMax)));
    const disciplineAvg = clamp01(average(data.map((item) => item.discipline / disciplineMax)));

    const values = [
      clamp01((motivationAvg + disciplineAvg) / 2),
      clamp01((energyAvg + (1 - frictionAvg)) / 2),
      socialAvg,
      disciplineAvg,
      energyAvg,
    ];

    return {
      values,
      balanceScore: Math.round(average(values) * 100),
    };
  }, [data]);

  useEffect(() => {
    if (!chartRef.current || !radarValues) return;

    const chart = echarts.init(chartRef.current);

    chart.setOption({
      tooltip: {
        trigger: 'item',
        confine: true,
        backgroundColor: 'rgba(6, 12, 16, 0.92)',
        borderColor: 'rgba(0, 255, 163, 0.25)',
        borderWidth: 1,
        textStyle: {
          color: '#e8f5f3',
          fontSize: 12,
        },
        formatter: (params: { value?: number | number[] }) => {
          const values = Array.isArray(params.value) ? params.value : [];

          return [
            '<div style="font-weight:600;color:#f8fafc;margin-bottom:6px;">Balance profile</div>',
            ...RADAR_AXES.map(
              (label, index) =>
                `${label}: <span style="color:#00FFA3;font-family:JetBrains Mono, SF Mono, monospace;">${values[index] ?? 0}%</span>`,
            ),
          ].join('<br/>');
        },
      },
      radar: {
        indicator: RADAR_AXES.map((name) => ({ name, max: 100 })),
        center: ['50%', '54%'],
        radius: '70%',
        splitNumber: 4,
        axisName: {
          color: 'rgba(226, 232, 240, 0.8)',
          fontSize: 11,
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(148, 163, 184, 0.25)',
          },
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(148, 163, 184, 0.2)',
          },
        },
        splitArea: {
          areaStyle: {
            color: [
              'rgba(15, 23, 42, 0.65)',
              'rgba(30, 41, 59, 0.55)',
              'rgba(51, 65, 85, 0.45)',
              'rgba(71, 85, 105, 0.35)',
            ],
          },
        },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: radarValues.values.map((value) => Math.round(value * 100)),
              name: 'Balance',
              areaStyle: {
                color: 'rgba(0, 229, 255, 0.2)',
              },
              lineStyle: {
                color: SIGNAL_COLORS.energy,
                width: 2,
              },
              itemStyle: {
                color: SIGNAL_COLORS.energy,
              },
              emphasis: {
                lineStyle: {
                  width: 3,
                },
                itemStyle: {
                  shadowBlur: 10,
                  shadowColor: 'rgba(0, 229, 255, 0.6)',
                },
              },
              label: {
                show: true,
                formatter: ({ value }: { value: number[] }) => `${value}%`,
                color: 'rgba(226, 232, 240, 0.8)',
                fontSize: 10,
              },
            },
          ],
        },
      ],
      animationDuration: 900,
    });

    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });

    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [radarValues]);

  if (loading) {
    return (
      <Card className={`${styles.card} glassCard`}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Life Balance</p>
            <h3 className={styles.title}>Balance rings</h3>
          </div>
        </div>
        <Skeleton count={1} className={styles.skeletonChart} />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`${styles.card} glassCard`}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Life Balance</p>
            <h3 className={styles.title}>Balance rings</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>We couldn’t load balance insights.</p>
          <p className={styles.stateHint}>{error}</p>
          <Button variant="teal" onClick={onRetry}>Try again</Button>
        </div>
      </Card>
    );
  }

  if (!radarValues) {
    return (
      <Card className={`${styles.card} glassCard`}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Life Balance</p>
            <h3 className={styles.title}>Balance rings</h3>
          </div>
        </div>
        <div className={styles.stateBlock}>
          <p className={styles.stateTitle}>No balance signals yet.</p>
          <p className={styles.stateHint}>We need a few days of signals to map your radar.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`${styles.card} glassCard`}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Life Balance</p>
          <h3 className={styles.title}>Balance rings</h3>
        </div>
        <div className={styles.headerNote}>Balance score: {radarValues.balanceScore}%</div>
      </div>

      <div className={styles.chartWrap}>
        <div className={styles.chart} ref={chartRef} />
      </div>
    </Card>
  );
};
