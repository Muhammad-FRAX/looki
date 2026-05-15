import { echartsColorsDark, echartsColorsLight, darkTokens, lightTokens, fontFamily } from './tokens.js';

export function getEchartsTheme(mode: 'dark' | 'light') {
  const tokens = mode === 'dark' ? darkTokens : lightTokens;
  const colors = mode === 'dark' ? echartsColorsDark : echartsColorsLight;

  return {
    color: [...colors],
    backgroundColor: 'transparent',
    textStyle: { fontFamily, fontSize: 12, color: tokens.textSecondary },
    line: {
      itemStyle: { borderWidth: 2 },
      lineStyle: { width: 2 },
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
    },
    bar: { itemStyle: { borderRadius: [3, 3, 0, 0] } },
    tooltip: {
      backgroundColor: tokens.bgElevated,
      borderColor: tokens.border,
      textStyle: { color: tokens.textPrimary, fontSize: 12 },
      extraCssText: 'border-radius: 8px;',
    },
    grid: { containLabel: true },
    legend: { textStyle: { color: tokens.textSecondary, fontSize: 12 } },
    xAxis: {
      axisLine: { lineStyle: { color: tokens.border } },
      axisTick: { lineStyle: { color: tokens.border } },
      axisLabel: { color: tokens.textSecondary, fontSize: 11 },
      splitLine: { show: false },
    },
    yAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: tokens.textSecondary, fontSize: 11 },
      splitLine: { lineStyle: { color: tokens.border, type: 'dashed' } },
    },
  };
}
