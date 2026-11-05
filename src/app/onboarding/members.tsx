import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MemberEditorSheet } from '@/components/MemberEditorSheet';
import { ShareEditor } from '@/components/ShareEditor';
import { StepDots } from '@/components/StepDots';
import { AppText, AVATAR_KEYS, Card, MemberAvatar, memberColorKeys, PrimaryButton, Screen, ScreenHeader, SecondaryButton, spacing, TextField, useColors } from '@/design-system';
import { HOUSEHOLD_NAME_MAX, validateName } from '@/domain/chores';
import { useSetupDraft } from '@/features/household/setup-draft';

export default function SetupMembersScreen() {
  const c = useColors();
  const router = useRouter();
  const draft = useSetupDraft();
  const [editingIndex, setEditingIndex] = useState<number | 'new' | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const next = () => {
    const error = validateName(draft.householdName, HOUSEHOLD_NAME_MAX);
    setNameError(error);
    if (!error) router.push('/onboarding/chores');
  };

  const count = draft.members.length;
  const newProfile = {
    displayName: '',
    colorKey: memberColorKeys[count % memberColorKeys.length] as string,
    avatarKey: AVATAR_KEYS[count % AVATAR_KEYS.length] as string,
  };

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <ScreenHeader title="우리집 만들기" />
      <Screen
        contentStyle={styles.content}
        footer={
          <>
            <PrimaryButton label="다음" onPress={next} disabled={count === 0} testID="members-next" accessibilityHint={count === 0 ? '구성원을 한 명 이상 추가해 주세요' : undefined} />
            <StepDots current={1} total={3} />
          </>
        }>
        <TextField label="집 이름" value={draft.householdName} onChangeText={draft.setHouseholdName} maxLength={HOUSEHOLD_NAME_MAX} placeholder="예: 우리집, 신혼집, 자취방" error={nameError} testID="household-name" />

        <View style={styles.group}>
          <AppText variant="sectionTitle">구성원</AppText>
          <AppText variant="caption" tone="secondary">이름은 이 기기에만 저장돼요. 별칭으로도 충분해요.</AppText>
          {draft.members.map((member, index) => (
            <Pressable key={index} onPress={() => setEditingIndex(index)} accessibilityRole="button" accessibilityLabel={`${member.displayName}, 목표 ${draft.shares[index]}%, 수정`}>
              <Card style={styles.member}>
                <MemberAvatar avatarKey={member.avatarKey} colorKey={member.colorKey} size={56} />
                <View style={styles.flex}>
                  <AppText variant="bodyStrong" numberOfLines={1}>{member.displayName}</AppText>
                  <AppText variant="captionStrong" tone="secondary">{draft.shares[index]}%</AppText>
                </View>
              </Card>
            </Pressable>
          ))}
          <SecondaryButton label="구성원 추가하기" onPress={() => setEditingIndex('new')} testID="add-member" />
        </View>

        {count > 0 ? <ShareEditor names={draft.members.map((member) => member.displayName)} shares={draft.shares} preset={draft.preset} onChange={draft.setShares} /> : null}
      </Screen>

      {editingIndex !== null ? (
        <MemberEditorSheet
          key={String(editingIndex)}
          title={editingIndex === 'new' ? '구성원 추가' : '구성원 수정'}
          initial={editingIndex === 'new' ? newProfile : (draft.members[editingIndex] ?? newProfile)}
          onClose={() => setEditingIndex(null)}
          onSave={(profile) => {
            if (editingIndex === 'new') draft.addMember(profile);
            else draft.updateMember(editingIndex, profile);
            setEditingIndex(null);
          }}
          onDeactivate={
            editingIndex === 'new'
              ? undefined
              : () => {
                  draft.removeMember(editingIndex);
                  setEditingIndex(null);
                }
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: spacing.sm },
  group: { gap: spacing.md },
  member: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
});
