import { Text, type TextProps, type TextStyle } from 'react-native';

import { useColors } from '../theme';
import { typography } from '../tokens';

export type TextTone = 'primary' | 'secondary' | 'tertiary' | 'onPrimary' | 'green' | 'danger';

export interface AppTextProps extends TextProps {
  variant?: keyof typeof typography;
  tone?: TextTone;
  align?: TextStyle['textAlign'];
}

export function AppText({ variant = 'body', tone = 'primary', align, style, ...rest }: AppTextProps) {
  const c = useColors();
  const color = {
    primary: c.textPrimary,
    secondary: c.textSecondary,
    tertiary: c.textTertiary,
    onPrimary: c.onPrimary,
    green: c.greenDark,
    danger: c.danger,
  }[tone];
  const isHeading = variant === 'display' || variant === 'screenTitle' || variant === 'sectionTitle';
  return (
    <Text
      accessibilityRole={isHeading ? 'header' : undefined}
      maxFontSizeMultiplier={2}
      style={[typography[variant], { color, textAlign: align }, style]}
      {...rest}
    />
  );
}
