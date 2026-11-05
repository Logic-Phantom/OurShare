import type { TextStyle } from 'react-native';

/** Screens take every color, gap and radius from here. See docs/DESIGN_SYSTEM.md. */
export interface ColorTokens {
  background: string;
  surface: string;
  surfaceMuted: string;
  surfaceWarm: string;
  hint: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  green: string;
  greenDark: string;
  greenSoft: string;
  yellow: string;
  yellowSoft: string;
  danger: string;
  dangerSoft: string;
  scrim: string;
}

export const lightColors: ColorTokens = {
  background: '#FBFAF7',
  surface: '#FFFFFF',
  surfaceMuted: '#F2F2EF',
  surfaceWarm: '#FFF6E6',
  hint: '#FFF1CC',
  border: '#ECEBE6',
  textPrimary: '#2B2B33',
  textSecondary: '#6F6F7A',
  textTertiary: '#6F6F7A',
  primary: '#2F3037',
  primaryPressed: '#1E1F24',
  onPrimary: '#FFFFFF',
  green: '#4CAF50',
  greenDark: '#2E7D32',
  greenSoft: '#DFF1D6',
  yellow: '#F6C945',
  yellowSoft: '#FFF4D6',
  danger: '#C2413A',
  dangerSoft: '#FBE7E5',
  scrim: 'rgba(20, 20, 24, 0.45)',
};

export const darkColors: ColorTokens = {
  background: '#17181C',
  surface: '#222329',
  surfaceMuted: '#2C2D34',
  surfaceWarm: '#2F2A20',
  hint: '#3A3220',
  border: '#34353C',
  textPrimary: '#F3F3F1',
  textSecondary: '#B4B4BC',
  textTertiary: '#A5A5AE',
  primary: '#F3F3F1',
  primaryPressed: '#D9D9D6',
  onPrimary: '#1E1F24',
  green: '#66BB6A',
  greenDark: '#9CDB9F',
  greenSoft: '#26382A',
  yellow: '#F6C945',
  yellowSoft: '#3A3220',
  danger: '#F0857E',
  dangerSoft: '#40262A',
  scrim: 'rgba(0, 0, 0, 0.6)',
};

/** Member colors only ever appear next to the member's name. */
export const memberPalette = {
  blue: { main: '#6FA8E8', soft: '#DCEAF9' },
  pink: { main: '#F49A92', soft: '#FDE3E0' },
  green: { main: '#7CC47F', soft: '#DFF1D6' },
  yellow: { main: '#F0BE3C', soft: '#FFF1CC' },
  purple: { main: '#A99AE6', soft: '#E9E5FA' },
  teal: { main: '#5FBFB5', soft: '#D8F1EE' },
} as const;

export type MemberColorKey = keyof typeof memberPalette;
export const memberColorKeys = Object.keys(memberPalette) as MemberColorKey[];

export const spacing = { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, pill: 999 } as const;
export const touchTarget = 48;

export const fonts = {
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  semibold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
} as const;

export const typography = {
  display: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 36 },
  screenTitle: { fontFamily: fonts.bold, fontSize: 19, lineHeight: 26 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 24 },
  body: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  captionStrong: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  stat: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34 },
} satisfies Record<string, TextStyle>;

export const shadow = {
  card: {
    shadowColor: '#3A3A50',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
} as const;
