import { Card } from 'antd';
import ReactECharts from 'echarts-for-react';
import type { ReactNode } from 'react';
import { useResponsive } from '../../hooks/index.js';
import { useTheme } from '../../contexts/ThemeContext.js';
import { getEchartsTheme } from '../../theme/index.js';

interface ResponsiveChartProps {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  option: Record<string, any>;
  extra?: ReactNode;
  loading?: boolean;
  height?: number;
}

export default function ResponsiveChart({
  title,
  option,
  extra,
  loading = false,
  height,
}: ResponsiveChartProps) {
  const { chartHeight } = useResponsive();
  const { theme } = useTheme();
  const echartsTheme = getEchartsTheme(theme);

  const mergedOption = {
    ...echartsTheme,
    ...option,
    color: option['color'] ?? echartsTheme.color,
  };

  return (
    <Card
      title={<span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>}
      extra={extra}
      loading={loading}
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 12,
      }}
    >
      <ReactECharts
        option={mergedOption}
        style={{ height: height ?? chartHeight }}
        notMerge
        lazyUpdate
      />
    </Card>
  );
}
