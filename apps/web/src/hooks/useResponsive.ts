import { Grid } from 'antd';

const { useBreakpoint } = Grid;

export interface ResponsiveValues {
  isMobile: boolean;
  isTablet: boolean;
  isLaptop: boolean;
  isDesktop: boolean;
  isUltrawide: boolean;
  isMobileOrTablet: boolean;
  isDesktopOrLarger: boolean;
  contentPadding: number;
  sectionGap: number;
  cardPadding: number;
  chartHeight: number;
  chartHeightSmall: number;
  chartHeightLarge: number;
  kpiMinWidth: number;
  kpiGap: number;
}

export function useResponsive(): ResponsiveValues {
  const screens = useBreakpoint();

  const isMobile = !screens.sm;
  const isTablet = Boolean(screens.md) && !screens.lg;
  const isLaptop = Boolean(screens.lg) && !screens.xl;
  const isDesktop = Boolean(screens.xl) && !screens.xxl;
  const isUltrawide = Boolean(screens.xxl);

  const isMobileOrTablet = !screens.lg;
  const isDesktopOrLarger = Boolean(screens.xl);

  const contentPadding = isMobile ? 12 : isTablet ? 16 : isLaptop ? 20 : 24;
  const sectionGap = isMobile ? 16 : 24;
  const cardPadding = isMobile ? 16 : 24;

  const chartHeight = isMobile ? 200 : isTablet ? 250 : isLaptop ? 300 : isDesktop ? 350 : 400;
  const chartHeightSmall = isMobile ? 160 : isTablet ? 200 : 240;
  const chartHeightLarge = isMobile ? 260 : isTablet ? 320 : isLaptop ? 380 : 440;

  const kpiMinWidth = isMobile ? 160 : isTablet ? 180 : isLaptop ? 200 : isDesktop ? 220 : 240;
  const kpiGap = isMobile ? 12 : 16;

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
    kpiGap,
  };
}
