import { theme } from 'antd';
import type { ThemeConfig } from 'antd';
import { darkTokens, fontFamily } from './tokens';

const darkTheme: ThemeConfig = {
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
    motionDurationMid: '0.2s',
  },
  components: {
    Layout: {
      siderBg: darkTokens.bgContainer,
      headerBg: darkTokens.bgContainer,
      bodyBg: darkTokens.bgBase,
      headerHeight: 64,
    },
    Menu: {
      darkItemSelectedBg: darkTokens.accentPrimary,
      itemHeight: 44,
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
    },
    Card: {
      paddingLG: 24,
      borderRadiusLG: 12,
    },
    Table: {
      headerBg: darkTokens.bgHover,
      cellPaddingBlock: 12,
      rowHoverBg: darkTokens.bgHover,
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

export default darkTheme;
