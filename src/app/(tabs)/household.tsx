import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MemberEditorSheet } from '@/components/MemberEditorSheet';
import { ShareEditor } from '@/components/ShareEditor';
import { AVATAR_KEYS, AppText, Card, ConfirmDialog, ErrorState, IconButton, InlineMessage, MemberAvatar, memberColorKeys, PrimaryButton, Screen, ScreenHeader, SecondaryButton, spacing, useColors } from '@/design-system';
import type { HouseholdMember, SharePreset } from '@/domain/models';
import { listChores } from '@/features/chores/chore-repository';
import { addMember, deactivateMember, loadHouseholdView, reactivateMember, saveMemberProfile, saveShares, type MemberProfile } from '@/features/household/household-service';
import { useAppState } from '@/hooks/app-state';
import { useLoader } from '@/hooks/use-loader';
import { logError } from '@/utils/log';

/** Marks who uses this phone. It is not a rank: exactly one person can be "me" on each device (D-042). */
function MeToggle({ member, isMe, onPress }: { member: HouseholdMember; isMe: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={`${member.displayName}, 이 기기를 쓰는 사람`}
      accessibilityState={{ selected: isMe, checked: isMe }}
      style={styles.meToggle}>
      {isMe ? <MaterialCommunityIcons name="crown" size={24} color={c.yellow} /> : <Ionicons name="star-outline" size={22} color={c.textTertiary} />}
    </Pressable>
  );
}

type Editing = { kind: 'new' } | { kind: 'edit'; member: HouseholdMember } | null;

export default function HouseholdScreen() {
  const c = useColors();
  const router = useRouter();
  const { settings, updateSettings, notifyDataChanged } = useAppState();
  const { data, error, reload } = useLoader(async () => {
    const view = await loadHouseholdView();
    return view ? { ...view, chores: await listChores(view.household.id) } : null;
  });

  const [editing, setEditing] = useState<Editing>(null);
  const [leaving, setLeaving] = useState<HouseholdMember | null>(null);
  const [draft, setDraft] = useState<{ preset: SharePreset; shares: number[] } | null>(null);
  const [failed, setFailed] = useState(false);

  const active = data?.members.filter((member) => member.isActive) ?? [];
  const inactive = data?.members.filter((member) => !member.isActive) ?? [];
  const preset = draft?.preset ?? data?.household.sharePreset ?? 'EQUAL';
  const shares = draft?.shares ?? active.map((member) => member.targetSharePercent);

  const run = async (task: () => Promise<void>) => {
    try {
      setFailed(false);
      await task();
      setDraft(null);
      notifyDataChanged();
    } catch (cause) {
      logError('household.save', cause);
      setFailed(true);
    }
  };

  const onSaveMember = async (profile: MemberProfile) => {
    if (!data || !editing) return;
    const target = editing;
    setEditing(null);
    await run(() => (target.kind === 'new' ? addMember(data, profile) : saveMemberProfile(target.member.id, profile)));
  };

  const fixedChoresOf = (member: HouseholdMember) => data?.chores.filter((chore) => chore.assignmentMode === 'FIXED' && chore.fixedMemberId === member.id).length ?? 0;

  const onConfirmLeave = async () => {
    if (!data || !leaving) return;
    const member = leaving;
    setLeaving(null);
    await run(async () => {
      await deactivateMember(data, member.id);
      if (settings.meMemberId === member.id) await updateSettings({ meMemberId: null });
    });
  };

  const onSaveShares = async () => {
    if (!data || !draft) return;
    const sharesById = new Map(active.map((member, index) => [member.id, draft.shares[index] as number]));
    await run(() => saveShares(data, draft.preset, sharesById));
  };

  const nextIndex = data?.members.length ?? 0;
  const newProfile: MemberProfile = {
    displayName: '',
    colorKey: memberColorKeys[nextIndex % memberColorKeys.length] as string,
    avatarKey: AVATAR_KEYS[nextIndex % AVATAR_KEYS.length] as string,
  };

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <ScreenHeader title="우리집 구성원" showBack={false} right={<IconButton icon="settings-outline" label="설정" onPress={() => router.push('/settings')} testID="open-settings" />} />
      <Screen contentStyle={styles.content} footer={draft ? <PrimaryButton label="완료" onPress={onSaveShares} testID="save-shares" /> : undefined}>
        {error ? <ErrorState message="구성원을 불러오지 못했어요." onRetry={reload} /> : null}

        <View style={styles.members}>
          {active.map((member, index) => (
            <Card key={member.id} style={styles.memberCard}>
              <Pressable
                onPress={() => setEditing({ kind: 'edit', member })}
                accessibilityRole="button"
                accessibilityLabel={`${member.displayName}, 목표 ${shares[index]}%, 수정`}
                style={styles.memberMain}>
                <MemberAvatar avatarKey={member.avatarKey} colorKey={member.colorKey} size={56} />
                <View style={styles.memberText}>
                  <AppText variant="bodyStrong" numberOfLines={1}>{member.displayName}</AppText>
                  <AppText variant="captionStrong" tone="secondary">{shares[index]}%</AppText>
                </View>
              </Pressable>
              <MeToggle member={member} isMe={settings.meMemberId === member.id} onPress={() => updateSettings({ meMemberId: member.id })} />
            </Card>
          ))}
        </View>

        <SecondaryButton label="구성원 추가하기" onPress={() => setEditing({ kind: 'new' })} testID="add-member" />

        {data && active.length > 0 ? (
          <ShareEditor names={active.map((member) => member.displayName)} shares={shares} preset={preset} onChange={(nextPreset, nextShares) => setDraft({ preset: nextPreset, shares: nextShares })} />
        ) : null}

        {active
          .filter((member, index) => shares[index] === 0 && fixedChoresOf(member) > 0)
          .map((member) => (
            <InlineMessage key={member.id} tone="warning">
              {`${member.displayName}님은 0%라 자동 배정에서 빠지지만, 고정으로 맡은 집안일 ${fixedChoresOf(member)}개는 그대로 맡아요. 바꾸려면 집안일 탭에서 고정 담당자를 바꿔 주세요.`}
            </InlineMessage>
          ))}
        {active.length === 0 && data ?<InlineMessage tone="warning">구성원이 없어요. 자동 배정을 하려면 한 명 이상 있어야 해요.</InlineMessage> : null}
        {failed ? <InlineMessage tone="warning">저장하지 못했어요. 다시 시도해 주세요.</InlineMessage> : null}

        {inactive.length > 0 ? (
          <View style={styles.members}>
            <AppText variant="sectionTitle">이전 구성원</AppText>
            <AppText variant="caption" tone="secondary">지난 기록은 그대로 남고, 새 일을 배정하지 않아요.</AppText>
            {inactive.map((member) => (
              <Card key={member.id} style={styles.memberCard}>
                <View style={styles.memberMain}>
                  <MemberAvatar avatarKey={member.avatarKey} colorKey={member.colorKey} size={44} />
                  <AppText variant="body" numberOfLines={1} style={styles.memberText}>{member.displayName}</AppText>
                </View>
                <SecondaryButton label="다시 추가" onPress={() => data && run(() => reactivateMember(data, member.id))} />
              </Card>
            ))}
          </View>
        ) : null}
      </Screen>

      {editing ? (
        <MemberEditorSheet
          key={editing.kind === 'edit' ? editing.member.id : 'new'}
          title={editing.kind === 'new' ? '구성원 추가' : '구성원 수정'}
          initial={editing.kind === 'edit' ? editing.member : newProfile}
          onSave={onSaveMember}
          onClose={() => setEditing(null)}
          onDeactivate={
            editing.kind === 'edit'
              ? () => {
                  setLeaving(editing.member);
                  setEditing(null);
                }
              : undefined
          }
        />
      ) : null}

      <ConfirmDialog
        visible={leaving !== null}
        title={`${leaving?.displayName ?? ''}님을 구성원에서 뺄까요?`}
        message={
          leaving && fixedChoresOf(leaving) > 0
            ? `고정으로 맡은 집안일이 ${fixedChoresOf(leaving)}개 있어요. 새 일정에서는 담당자를 직접 정하게 돼요. 지난 기록은 그대로 남아요.`
            : '나머지 구성원의 비율이 다시 맞춰져요. 지난 기록은 그대로 남아요.'
        }
        confirmLabel="빼기"
        danger
        onConfirm={onConfirmLeave}
        onCancel={() => setLeaving(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: spacing.sm, gap: spacing.lg },
  members: { gap: spacing.md },
  memberCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  memberMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  memberText: { flex: 1, gap: 2 },
  meToggle: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
