import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { equalShares, redistributeShares } from '@/domain/allocation/shares';
import type { SharePreset } from '@/domain/models';
import { AppText, HintCard, radius, spacing, useColors } from '@/design-system';

const STEP = 5;

function PresetPill({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      style={[styles.pill, { backgroundColor: selected ? c.greenSoft : c.surfaceMuted }]}>
      <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={selected ? c.greenDark : c.textTertiary} />
      <AppText variant={selected ? 'bodyStrong' : 'body'} tone={selected ? 'green' : 'secondary'}>{label}</AppText>
    </Pressable>
  );
}

function StepButton({ icon, label, disabled, onPress }: { icon: 'add' | 'remove'; label: string; disabled: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[styles.step, { backgroundColor: c.surfaceMuted, opacity: disabled ? 0.4 : 1 }]}>
      <Ionicons name={icon} size={20} color={c.textPrimary} />
    </Pressable>
  );
}

/**
 * Changing one share scales the others so the total stays at 100, and the screen says so.
 * Controlled: `names` and `shares` are parallel arrays of active members.
 */
export function ShareEditor({ names, shares, preset, onChange }: { names: readonly string[]; shares: readonly number[]; preset: SharePreset; onChange: (preset: SharePreset, shares: number[]) => void }) {
  const setPreset = (next: SharePreset) => onChange(next, next === 'EQUAL' ? equalShares(names.length) : [...shares]);
  const change = (index: number, delta: number) => onChange('CUSTOM', redistributeShares(shares, index, (shares[index] as number) + delta));

  return (
    <View style={styles.wrap}>
      <AppText variant="sectionTitle">분배 방식</AppText>
      <View style={styles.pills} accessibilityRole="radiogroup" accessibilityLabel="분배 방식">
        <PresetPill label="공평하게" selected={preset === 'EQUAL'} onPress={() => setPreset('EQUAL')} />
        <PresetPill label="내가 비율 지정" selected={preset === 'CUSTOM'} onPress={() => setPreset('CUSTOM')} />
      </View>

      {preset === 'CUSTOM' && names.length > 1
        ? names.map((name, index) => {
            const share = shares[index] as number;
            return (
              <View key={`${name}-${index}`} style={styles.row}>
                <AppText variant="bodyStrong" numberOfLines={1} style={styles.name}>{name}</AppText>
                <StepButton icon="remove" label={`${name} 비율 줄이기`} disabled={share <= 0} onPress={() => change(index, -STEP)} />
                <AppText variant="bodyStrong" align="center" style={styles.percent} accessibilityLiveRegion="polite">{share}%</AppText>
                <StepButton icon="add" label={`${name} 비율 늘리기`} disabled={share >= 100} onPress={() => change(index, STEP)} />
              </View>
            );
          })
        : null}

      <HintCard icon="megaphone">
        <AppText variant="body">
          {preset === 'CUSTOM' && names.length > 1
            ? '한 사람을 바꾸면 나머지 비율이 맞춰져 합계는 항상 100%예요. 0%면 자동 배정에서 빠져요.'
            : '목표 비율에 맞춰 자동으로 배정돼요!'}
        </AppText>
      </HintCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  pills: { flexDirection: 'row', gap: spacing.sm },
  pill: { flex: 1, minHeight: 48, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1 },
  percent: { width: 56 },
  step: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
