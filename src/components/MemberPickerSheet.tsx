import { Pressable, StyleSheet } from 'react-native';

import type { HouseholdMember } from '@/domain/models';
import { AppText, BottomSheet, MemberAvatar, radius, spacing, useColors } from '@/design-system';

export function MemberPickerSheet({ title, members, selectedId, allowNone, onPick, onClose }: { title: string; members: readonly HouseholdMember[]; selectedId: string | null; allowNone?: boolean; onPick: (id: string | null) => void; onClose: () => void }) {
  const c = useColors();
  const option = (id: string | null, label: string, avatar?: HouseholdMember) => {
    const selected = id === selectedId;
    return (
      <Pressable
        key={id ?? 'none'}
        onPress={() => onPick(id)}
        accessibilityRole="radio"
        accessibilityLabel={label}
        accessibilityState={{ selected, checked: selected }}
        style={[styles.row, { backgroundColor: selected ? c.greenSoft : c.surfaceMuted }]}>
        {avatar ? <MemberAvatar avatarKey={avatar.avatarKey} colorKey={avatar.colorKey} size={40} /> : null}
        <AppText variant={selected ? 'bodyStrong' : 'body'} tone={selected ? 'green' : 'primary'}>{label}</AppText>
      </Pressable>
    );
  };
  return (
    <BottomSheet visible title={title} onClose={onClose}>
      {members.map((member) => option(member.id, member.displayName, member))}
      {allowNone ? option(null, '나중에 정하기') : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 56, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
