import { useMemo } from 'react';
import dayjs from 'dayjs';
import { Empty } from 'antd';
import { ResponsiveChart } from '../../../components/ui/index.js';
import type { UsageEntry } from '../../../api/types.js';
import { useTheme } from '../../../contexts/ThemeContext.js';
import { echartsColorsDark, echartsColorsLight } from '../../../theme/tokens.js';

interface UsageChartProps {
  data?: UsageEntry[];
  loading: boolean;
}

export default function UsageChart({ data = [], loading }: UsageChartProps) {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? echartsColorsDark : echartsColorsLight;
  const primaryColor = colors[0];

  const option = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis' as const,
        backgroundColor: 'var(--bg-elevated)',
        borderColor: 'var(--border)',
        textStyle: { color: 'var(--text-primary)', fontSize: 13 },
        axisPointer: { lineStyle: { color: 'var(--border)' } },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '8%',
        containLabel: true,
      },
      xAxis: {
        type: 'category' as const,
        data: data.map((d) => d.date),
        axisLine: { lineStyle: { color: 'var(--border)' } },
        axisTick: { show: false },
        axisLabel: {
          color: 'var(--text-secondary)',
          fontSize: 12,
          formatter: (v: string) => dayjs(v).format('MMM D'),
          interval: Math.max(0, Math.floor(data.length / 7) - 1),
        },
      },
      yAxis: {
        type: 'value' as const,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          lineStyle: { color: 'var(--border)', type: 'dashed' as const },
        },
        axisLabel: { color: 'var(--text-secondary)', fontSize: 12 },
        minInterval: 1,
      },
      series: [
        {
          type: 'line',
          data: data.map((d) => d.count),
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          lineStyle: { width: 2, color: primaryColor },
          itemStyle: { color: primaryColor },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: primaryColor + '40' },
                { offset: 1, color: primaryColor + '00' },
              ],
            },
          },
        },
      ],
    }),
    [data, primaryColor],
  );

  if (!loading && data.length === 0) {
    return (
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 40,
          textAlign: 'center',
        }}
      >
        <Empty description="No usage data for the past 30 days" />
      </div>
    );
  }

  return (
    <ResponsiveChart
      title="Daily Lookups — Last 30 Days"
      option={option}
      loading={loading}
    />
  );
}
