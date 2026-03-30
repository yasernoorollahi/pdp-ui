import styles from './MetricChart.module.css';

export type ChartVariant =
  | 'line'
  | 'line-dual'
  | 'line-threshold'
  | 'bar'
  | 'stacked-bar'
  | 'area'
  | 'stacked-area'
  | 'histogram'
  | 'sparkline'
  | 'donut'
  | 'gauge'
  | 'funnel'
  | 'box'
  | 'violin'
  | 'scatter'
  | 'pie';

export type ChartSeries = {
  id: string;
  values: number[];
};

export type ScatterPoint = {
  x: number;
  y: number;
};

export type FunnelStage = {
  label: string;
  value: number;
};

export type PieSlice = {
  label: string;
  value: number;
};

export type BoxPlot = {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
};

type MetricChartProps = {
  variant: ChartVariant;
  series?: ChartSeries[];
  values?: number[];
  donut?: { value: number; total: number };
  gauge?: { value: number; total: number };
  box?: BoxPlot;
  scatter?: ScatterPoint[];
  funnel?: FunnelStage[];
  pie?: PieSlice[];
  threshold?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const WIDTH = 240;
const HEIGHT = 120;
const PADDING = 12;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const buildLinePath = (values: number[], max: number) => {
  if (!values.length) return '';
  const safeMax = max || 1;
  const step = (WIDTH - PADDING * 2) / Math.max(1, values.length - 1);
  return values
    .map((value, index) => {
      const x = PADDING + step * index;
      const y = HEIGHT - PADDING - (value / safeMax) * (HEIGHT - PADDING * 2);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
};

const buildAreaPath = (values: number[], max: number) => {
  if (!values.length) return '';
  const line = buildLinePath(values, max);
  const step = (WIDTH - PADDING * 2) / Math.max(1, values.length - 1);
  const startX = PADDING;
  const endX = PADDING + step * (values.length - 1);
  const baseY = HEIGHT - PADDING;
  return `${line} L ${endX.toFixed(2)} ${baseY.toFixed(2)} L ${startX.toFixed(2)} ${baseY.toFixed(2)} Z`;
};

const buildStacked = (series: ChartSeries[]) => {
  if (!series.length) return { stacked: [] as ChartSeries[], totals: [] as number[] };
  const length = Math.max(...series.map((item) => item.values.length));
  const stacked = series.map((item) => ({
    ...item,
    values: Array.from({ length }, (_, index) => item.values[index] ?? 0),
  }));
  const totals = Array.from({ length }, (_, index) =>
    stacked.reduce((acc, item) => acc + (item.values[index] ?? 0), 0),
  );
  return { stacked, totals };
};

const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
  const angle = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
};

const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M',
    start.x.toFixed(2),
    start.y.toFixed(2),
    'A',
    r.toFixed(2),
    r.toFixed(2),
    0,
    largeArcFlag,
    0,
    end.x.toFixed(2),
    end.y.toFixed(2),
  ].join(' ');
};

const getSizeClass = (size?: 'sm' | 'md' | 'lg') => {
  if (size === 'sm') return styles.sizeSm;
  if (size === 'lg') return styles.sizeLg;
  return styles.sizeMd;
};

export const MetricChart = ({
  variant,
  series = [],
  values = [],
  donut,
  gauge,
  box,
  scatter = [],
  funnel = [],
  pie = [],
  threshold,
  size,
  className,
}: MetricChartProps) => {
  if (variant === 'donut' && donut) {
    const radius = 34;
    const circumference = 2 * Math.PI * radius;
    const pct = donut.total > 0 ? clamp(donut.value / donut.total, 0, 1) : 0;
    const dash = pct * circumference;
    return (
      <div className={`${styles.chart} ${styles.donut} ${getSizeClass(size)} ${className ?? ''}`}>
        <svg className={styles.chartSvg} viewBox="0 0 120 120" aria-hidden>
          <circle className={styles.donutTrack} cx="60" cy="60" r={radius} />
          <circle
            className={styles.donutValue}
            cx="60"
            cy="60"
            r={radius}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={circumference * 0.25}
          />
        </svg>
        <div className={styles.donutValueLabel}>{Math.round(pct * 100)}%</div>
      </div>
    );
  }

  if (variant === 'gauge' && gauge) {
    const pct = gauge.total > 0 ? clamp(gauge.value / gauge.total, 0, 1) : 0;
    const angle = 180 * pct;
    return (
      <div className={`${styles.chart} ${styles.gauge} ${getSizeClass(size)} ${className ?? ''}`}>
        <svg className={styles.chartSvg} viewBox="0 0 240 120" aria-hidden>
          <path className={styles.gaugeTrack} d={describeArc(120, 120, 90, 180, 0)} />
          <path className={styles.gaugeValue} d={describeArc(120, 120, 90, 180, 180 - angle)} />
          <circle className={styles.gaugeDot} cx="120" cy="120" r="6" />
        </svg>
        <div className={styles.gaugeValueLabel}>{Math.round(pct * 100)}%</div>
      </div>
    );
  }

  if (variant === 'funnel' && funnel.length) {
    const max = Math.max(...funnel.map((stage) => stage.value), 1);
    return (
      <div className={`${styles.chart} ${styles.funnel} ${getSizeClass(size)} ${className ?? ''}`}>
        <svg className={styles.chartSvg} viewBox="0 0 240 120" aria-hidden>
          {funnel.map((stage, index) => {
            const height = 100 / funnel.length;
            const topWidth = ((stage.value ?? 0) / max) * 200;
            const nextValue = funnel[index + 1]?.value ?? stage.value;
            const bottomWidth = ((nextValue ?? 0) / max) * 200;
            const xTop = (240 - topWidth) / 2;
            const xBottom = (240 - bottomWidth) / 2;
            const y = 10 + index * height;
            const yBottom = y + height;
            return (
              <path
                key={stage.label}
                className={styles[`series${index}`] ?? styles.series0}
                d={`M ${xTop} ${y} L ${xTop + topWidth} ${y} L ${xBottom + bottomWidth} ${yBottom} L ${xBottom} ${yBottom} Z`}
              />
            );
          })}
        </svg>
      </div>
    );
  }

  if (variant === 'box' && box) {
    const max = Math.max(box.max, box.q3, box.q1, box.min, 1);
    const toY = (value: number) => HEIGHT - PADDING - (value / max) * (HEIGHT - PADDING * 2);
    return (
      <div className={`${styles.chart} ${styles.box} ${getSizeClass(size)} ${className ?? ''}`}>
        <svg className={styles.chartSvg} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden>
          <line className={styles.boxWhisker} x1="120" x2="120" y1={toY(box.min)} y2={toY(box.max)} />
          <rect
            className={styles.boxRect}
            x="90"
            width="60"
            y={toY(box.q3)}
            height={Math.max(6, toY(box.q1) - toY(box.q3))}
          />
          <line className={styles.boxMedian} x1="85" x2="155" y1={toY(box.median)} y2={toY(box.median)} />
          <line className={styles.boxCap} x1="95" x2="145" y1={toY(box.min)} y2={toY(box.min)} />
          <line className={styles.boxCap} x1="95" x2="145" y1={toY(box.max)} y2={toY(box.max)} />
        </svg>
      </div>
    );
  }

  if (variant === 'violin' && values.length) {
    const max = Math.max(...values, 1);
    const height = HEIGHT - PADDING * 2;
    const step = height / Math.max(1, values.length - 1);
    const points = values.map((value, index) => {
      const y = PADDING + index * step;
      const x = (value / max) * 70;
      return { x, y };
    });

    const left = points.map((point, index) => `${120 - point.x} ${point.y}${index === 0 ? '' : ''}`).join(' ');
    const right = points.slice().reverse().map((point) => `${120 + point.x} ${point.y}`).join(' ');
    const path = `M ${left} L ${right} Z`;

    return (
      <div className={`${styles.chart} ${styles.violin} ${getSizeClass(size)} ${className ?? ''}`}>
        <svg className={styles.chartSvg} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden>
          <path className={styles.violinShape} d={path} />
          <line className={styles.violinAxis} x1="120" x2="120" y1={PADDING} y2={HEIGHT - PADDING} />
        </svg>
      </div>
    );
  }

  if (variant === 'scatter' && scatter.length) {
    return (
      <div className={`${styles.chart} ${styles.scatter} ${getSizeClass(size)} ${className ?? ''}`}>
        <svg className={styles.chartSvg} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden>
          {scatter.map((point, index) => (
            <circle
              key={index}
              className={styles.scatterPoint}
              cx={PADDING + point.x * (WIDTH - PADDING * 2)}
              cy={HEIGHT - PADDING - point.y * (HEIGHT - PADDING * 2)}
              r="3"
            />
          ))}
        </svg>
      </div>
    );
  }

  if (variant === 'pie' && pie.length) {
    const total = pie.reduce((acc, item) => acc + item.value, 0) || 1;
    const slices = pie.reduce<Array<{ slice: (typeof pie)[number]; index: number; startAngle: number; endAngle: number }>>(
      (acc, slice, index) => {
        const startAngle = acc[index - 1]?.endAngle ?? 0;
        const endAngle = startAngle + (slice.value / total) * 360;
        acc.push({ slice, index, startAngle, endAngle });
        return acc;
      },
      [],
    );
    return (
      <div className={`${styles.chart} ${styles.pie} ${getSizeClass(size)} ${className ?? ''}`}>
        <svg className={styles.chartSvg} viewBox="0 0 120 120" aria-hidden>
          {slices.map(({ slice, index, startAngle, endAngle }) => {
            const angle = endAngle - startAngle;
            const path = describeArc(60, 60, 46, startAngle, endAngle);
            const largeArc = angle > 180 ? 1 : 0;
            const start = polarToCartesian(60, 60, 46, endAngle);
            const end = polarToCartesian(60, 60, 46, startAngle);
            return (
              <path
                key={slice.label}
                className={styles[`series${index}`] ?? styles.series0}
                d={`${path} L 60 60 Z`}
                data-large={largeArc}
                data-start={`${start.x}-${start.y}`}
                data-end={`${end.x}-${end.y}`}
              />
            );
          })}
        </svg>
      </div>
    );
  }

  const allValues = series.flatMap((item) => item.values);
  const max = Math.max(...allValues, ...values, threshold ?? 0, 1);

  if (variant === 'bar' || variant === 'histogram') {
    const bars = values.length ? values : series[0]?.values ?? [];
    const barWidth = (WIDTH - PADDING * 2) / Math.max(1, bars.length);
    return (
      <div className={`${styles.chart} ${styles.bar} ${getSizeClass(size)} ${className ?? ''}`}>
        <svg className={styles.chartSvg} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden>
          {bars.map((value, index) => {
            const height = (value / max) * (HEIGHT - PADDING * 2);
            return (
              <rect
                key={index}
                className={styles.series0}
                x={PADDING + index * barWidth + 2}
                y={HEIGHT - PADDING - height}
                width={Math.max(2, barWidth - 4)}
                height={height}
                rx="2"
              />
            );
          })}
        </svg>
      </div>
    );
  }

  if (variant === 'stacked-bar') {
    const { stacked, totals } = buildStacked(series);
    const barWidth = (WIDTH - PADDING * 2) / Math.max(1, totals.length);
    return (
      <div className={`${styles.chart} ${styles.bar} ${getSizeClass(size)} ${className ?? ''}`}>
        <svg className={styles.chartSvg} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden>
          {totals.map((_, index) => {
            let offset = 0;
            return stacked.map((item, seriesIndex) => {
              const value = item.values[index] ?? 0;
              const height = (value / max) * (HEIGHT - PADDING * 2);
              const y = HEIGHT - PADDING - height - offset;
              offset += height;
              return (
                <rect
                  key={`${item.id}-${index}`}
                  className={styles[`series${seriesIndex}`] ?? styles.series0}
                  x={PADDING + index * barWidth + 2}
                  y={y}
                  width={Math.max(2, barWidth - 4)}
                  height={height}
                  rx="2"
                />
              );
            });
          })}
        </svg>
      </div>
    );
  }

  if (variant === 'area' || variant === 'stacked-area') {
    const { stacked, totals } = buildStacked(series);
    const maxValue = variant === 'stacked-area' ? Math.max(...totals, 1) : max;
    return (
      <div className={`${styles.chart} ${styles.area} ${getSizeClass(size)} ${className ?? ''}`}>
        <svg className={styles.chartSvg} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden>
          {(variant === 'stacked-area' ? stacked : series).map((item, index) => {
            const valuesToPlot =
              variant === 'stacked-area'
                ? item.values.map((_, i) =>
                    stacked
                      .slice(0, index + 1)
                      .reduce((acc, seriesItem) => acc + (seriesItem.values[i] ?? 0), 0),
                  )
                : item.values;
            return (
              <path
                key={item.id}
                className={styles[`series${index}`] ?? styles.series0}
                d={buildAreaPath(valuesToPlot, maxValue)}
              />
            );
          })}
        </svg>
      </div>
    );
  }

  if (variant === 'sparkline') {
    const lineValues = values.length ? values : series[0]?.values ?? [];
    return (
      <div className={`${styles.chart} ${styles.sparkline} ${getSizeClass(size)} ${className ?? ''}`}>
        <svg className={styles.chartSvg} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden>
          <path className={styles.series0} d={buildLinePath(lineValues, max)} />
        </svg>
      </div>
    );
  }

  const lines = series.length ? series : [{ id: 'series', values }];

  return (
    <div className={`${styles.chart} ${styles.line} ${getSizeClass(size)} ${className ?? ''}`}>
      <svg className={styles.chartSvg} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden>
        {threshold !== undefined && variant === 'line-threshold' && (
          <rect
            className={styles.thresholdBand}
            x={PADDING}
            y={HEIGHT - PADDING - (threshold / max) * (HEIGHT - PADDING * 2)}
            width={WIDTH - PADDING * 2}
            height={(threshold / max) * (HEIGHT - PADDING * 2)}
          />
        )}
        {lines.map((item, index) => (
          <path
            key={item.id}
            className={styles[`series${index}`] ?? styles.series0}
            d={buildLinePath(item.values, max)}
          />
        ))}
      </svg>
    </div>
  );
};
