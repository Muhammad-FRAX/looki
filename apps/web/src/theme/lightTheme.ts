import type { ThemeConfig } from 'antd';
import { theme } from 'antd';
import { lightTokens, fontFamily } from './tokens.js';

export const lightTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: lightTokens.accentPrimary,
    colorBgContainer: lightTokens.bgContainer,
    colorBgElevated: lightTokens.bgElevated,
    colorBgLayout: lightTokens.bgBase,
    colorBorder: lightTokens.border,
    colorText: lightTokens.textPrimary,
    colorTextSecondary: lightTokens.textSecondary,
    fontSize: 14,
    borderRadius: 8,
    borderRadiusLG: 12,
    controlHeight: 36,
    fontFamily,
  },
  components: {
    Layout: {
      siderBg: lightTokens.bgContainer,
      headerBg: lightTokens.bgContainer,
      bodyBg: lightTokens.bgBase,
      headerHeight: 64,
    },
    Menu: {
      itemSelectedBg: lightTokens.accentPrimary,
      itemSelectedColor: '#FFFFFF',
      itemHeight: 44,
    },
    Card: {
      paddingLG: 24,
      borderRadiusLG: 12,
    },
    Table: {
      headerBg: lightTokens.bgHover,
      cellPaddingBlock: 12,
    },
    Button: {
      borderRadius: 8,
      controlHeight: 36,
      fontWeight: 500,
    },
    Input: {
      borderRadius: 8,
      controlHeight: 36,
    },
    Select: {
      borderRadius: 8,
      controlHeight: 36,
    },
    DatePicker: {
      borderRadius: 8,
      controlHeight: 36,
    },
    Modal: {
      borderRadiusLG: 12,
    },
    Tag: {
      borderRadiusSM: 4,
    },
    Statistic: {
      contentFontSize: 28,
      titleFontSize: 14,
    },
  },
};
