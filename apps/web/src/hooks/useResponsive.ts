import { Grid } from 'antd';

const { useBreakpoint } = Grid;

export function useResponsive() {
  const screens = useBreakpoint();

  const isMobile = !screens.sm;
  const isTablet = !!screens.sm && !screens.lg;
  const isLaptop = !!screens.lg && !screens.xl;
  const isDesktop = !!screens.xl && !screens.xxl;
  const isUltrawide = !!screens.xxl;
  const isMobileOrTablet = !screens.lg;
  const isDesktopOrLarger = !!screens.xl;

  let contentPadding = 24;
  if (isMobile) contentPadding = 12;
  else if (isTablet) contentPadding = 16;
  else if (isLaptop) contentPadding = 20;

  const sectionGap = isMobile ? 12 : 24;
  const cardPadding = isMobile ? 16 : 24;

  let chartHeight = 350;
  if (isMobile) chartHeight = 200;
  else if (isTablet) chartHeight = 250;
  else if (isLaptop) chartHeight = 300;
  else if (isUltrawide) chartHeight = 400;

  const chartHeightSmall = Math.round(chartHeight * 0.7);
  const chartHeightLarge = Math.round(chartHeight * 1.2);

  let kpiMinWidth = 220;
  if (isMobile) kpiMinWidth = 160;
  else if (isTablet) kpiMinWidth = 180;
  else if (isLaptop) kpiMinWidth = 200;
  else if (isUltrawide) kpiMinWidth = 240;

  return {
    isMobile,
    isTablet,
    isLaptop,
    isDesktop,
    isUltrawide,
    isMobileOrTablet,
    isDesktopOrLarger,
    contentPadding,
    sectionGap,
    cardPadding,
    chartHeight,
    chartHeightSmall,
    chartHeightLarge,
    kpiMinWidth,
  };
}
