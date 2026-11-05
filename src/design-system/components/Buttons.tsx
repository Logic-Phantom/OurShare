import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useColors } from '../theme';
import { radius, spacing, touchTarget } from '../tokens';
import { AppText } from './AppText';

export type IconName = ComponentProps<typeof Ionicons>['name'];

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  testID?: string;
}

export function PrimaryButton({ label, onPress, disabled, style, accessibilityHint, testID }: ButtonProps) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityHint={accessibilityHint}
      testID={testID}
      style={({ pressed }) => [
        styles.primary,
        { backgroundColor: disabled ? c.surfaceMuted : pressed ? c.primaryPressed : c.primary },
        style,
      ]}>
      <AppText variant="bodyStrong" tone={disabled ? 'tertiary' : 'onPrimary'}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, disabled, style, icon, tone = 'primary', testID }: ButtonProps & { icon?: IconName; tone?: 'primary' | 'danger' }) {
  const c = useColors();
  const color = tone === 'danger' ? c.danger : c.textPrimary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      testID={testID}
      style={({ pressed }) => [
        styles.secondary,
        { backgroundColor: pressed ? c.border : c.surfaceMuted, opacity: disabled ? 0.5 : 1 },
        style,
      ]}>
      {icon ? <Ionicons name={icon} size={18} color={color} /> : null}
      <AppText variant="bodyStrong" tone={tone === 'danger' ? 'danger' : 'primary'}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function TextButton({ label, onPress, testID }: { label: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" testID={testID} style={styles.textButton} hitSlop={spacing.xs}>
      <AppText variant="bodyStrong" tone="secondary">
        {label}
      </AppText>
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress, color, size = 24, testID }: { icon: IconName; label: string; onPress: () => void; color?: string; size?: number; testID?: string }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} testID={testID} style={({ pressed }) => [styles.icon, pressed && { opacity: 0.6 }]}>
      <View>
        <Ionicons name={icon} size={size} color={color ?? c.textPrimary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    minHeight: 54,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  secondary: {
    minHeight: touchTarget,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  textButton: { minHeight: touchTarget, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.base },
  icon: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
});
