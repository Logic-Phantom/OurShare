import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MEMBER_NAME_MAX, validateName } from '@/domain/chores';
import { AppText, AVATAR_KEYS, BottomSheet, MemberAvatar, memberColorKeys, memberPalette, PrimaryButton, SecondaryButton, spacing, TextField, useColors } from '@/design-system';
import type { MemberProfile } from '@/features/household/household-service';

/** Mount with a key per person so it always opens with that person's values. */
export function MemberEditorSheet({
  title,
  initial,
  onSave,
  onClose,
  onDeactivate,
}: {
  title: string;
  initial: MemberProfile;
  onSave: (profile: MemberProfile) => void;
  onClose: () => void;
  onDeactivate?: () => void;
}) {
  const c = useColors();
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [colorKey, setColorKey] = useState(initial.colorKey);
  const [avatarKey, setAvatarKey] = useState(initial.avatarKey);
  const [nameError, setNameError] = useState<string | null>(null);

  const save = () => {
    const error = validateName(displayName, MEMBER_NAME_MAX);
    setNameError(error);
    if (!error) onSave({ displayName, colorKey, avatarKey });
  };

  return (
    <BottomSheet visible title={title} onClose={onClose}>
      <TextField label="이름 또는 별칭" value={displayName} onChangeText={setDisplayName} maxLength={MEMBER_NAME_MAX} placeholder="별칭으로도 충분해요" error={nameError} autoFocus={!initial.displayName} testID="member-name" />

      <View style={styles.group}>
        <AppText variant="bodyStrong">그림</AppText>
        <View style={styles.wrap}>
          {AVATAR_KEYS.map((key, index) => {
            const selected = key === avatarKey;
            return (
              <Pressable
                key={key}
                onPress={() => setAvatarKey(key)}
                accessibilityRole="radio"
                accessibilityLabel={`그림 ${index + 1}`}
                accessibilityState={{ selected, checked: selected }}
                style={[styles.avatarOption, { borderColor: selected ? c.green : 'transparent' }]}>
                <MemberAvatar avatarKey={key} colorKey={colorKey} size={48} />
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.group}>
        <AppText variant="bodyStrong">색상</AppText>
        <View style={styles.wrap}>
          {memberColorKeys.map((key, index) => {
            const selected = key === colorKey;
            return (
              <Pressable
                key={key}
                onPress={() => setColorKey(key)}
                accessibilityRole="radio"
                accessibilityLabel={`색상 ${index + 1}`}
                accessibilityState={{ selected, checked: selected }}
                style={[styles.colorOption, { borderColor: selected ? c.textPrimary : 'transparent' }]}>
                <View style={[styles.colorDot, { backgroundColor: memberPalette[key].main }]} />
              </Pressable>
            );
          })}
        </View>
      </View>

      <PrimaryButton label="저장하기" onPress={save} testID="save-member" />
      {onDeactivate ? <SecondaryButton label="구성원에서 빼기" tone="danger" onPress={onDeactivate} testID="deactivate-member" /> : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  avatarOption: { borderWidth: 2, borderRadius: 30, padding: 2 },
  colorOption: { width: 48, height: 48, borderWidth: 2, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
});
