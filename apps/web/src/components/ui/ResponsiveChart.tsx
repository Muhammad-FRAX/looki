import { Card } from 'antd';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { ReactNode } from 'react';
import { useResponsive } from '../../hooks';

interface ResponsiveChartProps {
  title: string;
  option: EChartsOption;
  extra?: ReactNode;
  loading?: boolean;
  height?: number;
}

export default function ResponsiveChart({ title, option, extra, loading, height }: ResponsiveChartProps) {
  const { chartHeight } = useResponsive();

  return (
    <Card
      title={<span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>}
      extra={extra}
      loading={loading}
      style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
    >
      <ReactECharts
        option={option}
        style={{ height: height ?? chartHeight }}
        opts={{ renderer: 'canvas' }}
        notMerge
      />
    </Card>
  );
}
