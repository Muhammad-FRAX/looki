import type { ThemeConfig } from 'antd';
import { theme } from 'antd';
import { darkTokens, fontFamily } from './tokens.js';

export const darkTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: darkTokens.accentPrimary,
    colorBgContainer: darkTokens.bgContainer,
    colorBgElevated: darkTokens.bgElevated,
    colorBgLayout: darkTokens.bgBase,
    colorBorder: darkTokens.border,
    colorText: darkTokens.textPrimary,
    colorTextSecondary: darkTokens.textSecondary,
    fontSize: 14,
    borderRadius: 8,
    borderRadiusLG: 12,
    controlHeight: 36,
    fontFamily,
  },
  components: {
    Layout: {
      siderBg: darkTokens.bgContainer,
      headerBg: darkTokens.bgContainer,
      bodyBg: darkTokens.bgBase,
      headerHeight: 64,
    },
    Menu: {
      darkItemBg: 'transparent',
      darkItemSelectedBg: darkTokens.accentPrimary,
      darkItemSelectedColor: '#FFFFFF',
      itemHeight: 44,
    },
    Card: {
      paddingLG: 24,
      borderRadiusLG: 12,
    },
    Table: {
      headerBg: darkTokens.bgHover,
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
