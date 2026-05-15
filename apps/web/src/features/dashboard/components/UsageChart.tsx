import { ResponsiveChart } from '../../../components/ui';
import { useTheme } from '../../../contexts/ThemeContext';
import { getChartColors, getChartTextColor, getChartGridColor, getChartTooltip, getChartGrid } from '../../../theme/echarts';
import { useResponsive } from '../../../hooks';
import type { UsageDay } from '../../../api/types';

interface UsageChartProps {
  data: UsageDay[];
  loading?: boolean;
}

export default function UsageChart({ data, loading }: UsageChartProps) {
  const { theme } = useTheme();
  const { isMobile } = useResponsive();
  const colors = getChartColors(theme);
  const textColor = getChartTextColor(theme);
  const gridColor = getChartGridColor(theme);
  const tooltip = getChartTooltip(theme);

  const option = {
    color: colors,
    tooltip: { trigger: 'axis', ...tooltip },
    grid: getChartGrid(isMobile),
    xAxis: {
      type: 'category',
      data: data.map(d => d.date),
      axisLabel: { color: textColor, fontSize: isMobile ? 10 : 12, rotate: isMobile ? 45 : 0 },
      axisLine: { lineStyle: { color: gridColor } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: textColor, fontSize: isMobile ? 10 : 12 },
      splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
    },
    series: [
      {
        name: 'Lookups',
        type: 'line',
        data: data.map(d => d.count),
        smooth: true,
        lineStyle: { width: 2 },
        areaStyle: { opacity: 0.15 },
        showSymbol: !isMobile,
        symbol: 'circle',
        symbolSize: 6,
      },
    ],
  };

  return <ResponsiveChart title="Daily Lookups (30 days)" option={option} loading={loading} />;
}
