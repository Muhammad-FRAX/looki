export const darkChartColors = [
  '#4096FF', '#FB923C', '#34D399', '#A78BFA',
  '#F87171', '#22D3EE', '#F472B6', '#FBBF24',
];

export const lightChartColors = [
  '#1677FF', '#F97316', '#10B981', '#8B5CF6',
  '#EF4444', '#06B6D4', '#EC4899', '#D97706',
];

export function getChartColors(mode: 'dark' | 'light') {
  return mode === 'dark' ? darkChartColors : lightChartColors;
}

export function getChartTextColor(mode: 'dark' | 'light') {
  return mode === 'dark' ? '#CCCCCC' : '#1C1C1C';
}

export function getChartGridColor(mode: 'dark' | 'light') {
  return mode === 'dark' ? '#4A4A4A' : '#CBD5E1';
}

export function getChartTooltip(mode: 'dark' | 'light') {
  return {
    backgroundColor: mode === 'dark' ? 'rgba(42,42,42,0.95)' : 'rgba(255,255,255,0.95)',
    borderColor: mode === 'dark' ? '#4A4A4A' : '#CBD5E1',
    textStyle: { color: mode === 'dark' ? '#F5F5F5' : '#0A0046', fontSize: 13 },
  };
}

export function getChartGrid(isMobile: boolean) {
  return {
    left: isMobile ? 40 : 60,
    right: isMobile ? 8 : 20,
    top: isMobile ? 40 : 50,
    bottom: isMobile ? 60 : 40,
  };
}
