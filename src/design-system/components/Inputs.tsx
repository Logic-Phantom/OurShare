import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useColors } from '../theme';
import { radius, spacing, touchTarget, typography } from '../tokens';
import { AppText } from './AppText';

export function TextField({ label, error, style, ...rest }: TextInputProps & { label?: string; error?: string | null }) {
  const c = useColors();
  return (
    <View style={styles.field}>
      {label ? <AppText variant="bodyStrong">{label}</AppText> : null}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.textTertiary}
        maxFontSizeMultiplier={2}
        style={[styles.input, typography.body, { backgroundColor: c.surface, borderColor: error ? c.danger : c.border, color: c.textPrimary }, style]}
        {...rest}
      />
      {error ? <AppText variant="caption" tone="danger">{error}</AppText> : null}
    </View>
  );
}

/** Pill row where exactly one option is selected (담당 방식, 분배 방식 …). */
export function SegmentedChoice<T extends string>({ options, value, onChange, label }: { options: readonly { value: T; label: string }[]; value: T; onChange: (value: T) => void; label: string }) {
  const c = useColors();
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            style={[styles.pill, styles.grow, { backgroundColor: selected ? c.greenSoft : c.surfaceMuted }]}>
            <AppText variant={selected ? 'bodyStrong' : 'body'} tone={selected ? 'green' : 'secondary'} align="center">
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, selected, onPress, accessibilityLabel }: { label: string; selected: boolean; onPress: () => void; accessibilityLabel?: string }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ checked: selected }}
      style={[styles.pill, { backgroundColor: selected ? c.greenSoft : c.surfaceMuted }]}>
      <AppText variant={selected ? 'bodyStrong' : 'body'} tone={selected ? 'green' : 'secondary'}>
        {label}
      </AppText>
    </Pressable>
  );
}

const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** Selected days are shown with color and a bold label, and announced to screen readers. */
export function WeekdayChips({ mask, onChange, weekStartsOn }: { mask: number; onChange: (mask: number) => void; weekStartsOn: 0 | 1 }) {
  const c = useColors();
  const order = Array.from({ length: 7 }, (_, index) => (index + weekStartsOn) % 7);
  return (
    <View style={styles.weekdays}>
      {order.map((day) => {
        const selected = (mask & (1 << day)) !== 0;
        return (
          <Pressable
            key={day}
            onPress={() => onChange(mask ^ (1 << day))}
            accessibilityRole="checkbox"
            accessibilityLabel={`${WEEKDAY_NAMES[day]}요일`}
            accessibilityState={{ checked: selected }}
            style={[styles.weekday, { backgroundColor: selected ? c.greenSoft : c.surfaceMuted }]}>
            <AppText variant={selected ? 'bodyStrong' : 'body'} tone={selected ? 'green' : 'secondary'}>
              {WEEKDAY_NAMES[day]}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function StarRating({ value, onChange, label }: { value: number; onChange: (value: number) => void; label: string }) {
  const c = useColors();
  return (
    <View style={styles.stars} accessibilityRole="adjustable" accessibilityLabel={`${label} ${value}점`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable key={star} onPress={() => onChange(star)} accessibilityRole="button" accessibilityLabel={`${star}점`} accessibilityState={{ selected: star === value }} style={styles.star}>
          <Ionicons name={star <= value ? 'star' : 'star-outline'} size={24} color={star <= value ? c.yellow : c.textTertiary} />
        </Pressable>
      ))}
    </View>
  );
}

/** A label on the left and the current value on the right, as in "예상 시간  15분 >". */
export function ValueRow({ label, value, onPress, icon, leading }: { label: string; value: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap; leading?: ReactNode }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}, ${value}`} style={styles.valueRow}>
      <AppText variant="bodyStrong" style={styles.grow}>
        {label}
      </AppText>
      {leading}
      {icon ? <Ionicons name={icon} size={18} color={c.textSecondary} /> : null}
      <AppText variant="body">{value}</AppText>
      <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
    </Pressable>
  );
}

export function CheckCircle({ checked, onPress, label }: { checked: boolean; onPress?: () => void; label: string }) {
  const c = useColors();
  const circle = (
    <View style={[styles.check, { backgroundColor: checked ? c.green : 'transparent', borderColor: checked ? c.green : c.textTertiary }]}>
      {checked ? <Ionicons name="checkmark" size={18} color="#FFFFFF" /> : null}
    </View>
  );
  if (!onPress) return circle;
  return (
    <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked }} style={styles.checkTarget}>
      {circle}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  input: { minHeight: touchTarget, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: spacing.base, paddingVertical: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  grow: { flex: 1 },
  pill: { minHeight: 44, borderRadius: radius.pill, paddingHorizontal: spacing.base, paddingVertical: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  weekdays: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  weekday: { flex: 1, aspectRatio: 1, maxHeight: 48, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  stars: { flexDirection: 'row' },
  star: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  valueRow: { minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkTarget: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
