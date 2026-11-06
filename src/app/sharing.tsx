import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { ShareConsent } from '@/components/ShareConsent';
import { AppText, Card, ConfirmDialog, InlineMessage, PrimaryButton, Screen, ScreenHeader, SecondaryButton, spacing, useColors } from '@/design-system';
import { loadHouseholdView } from '@/features/household/household-service';
import { formatInviteCode, inviteMessage } from '@/features/sync/invite-code';
import { RemoteError } from '@/features/sync/remote';
import { createInviteCode, deleteSharingAccount, leaveSharing, sharingAvailable, startSharing } from '@/features/sync/sharing-service';
import { useAppState } from '@/hooks/app-state';
import { useLoader } from '@/hooks/use-loader';
import { useSync } from '@/hooks/sync-state';
import { activityTimeLabel, monthDay, localToday } from '@/utils/dates';
import { logError } from '@/utils/log';

function problemText(error: unknown): string {
  if (error instanceof RemoteError) {
    if (error.code === 'too_many_households') return '한 기기는 집을 3개까지만 공유할 수 있어요.';
    if (error.code === 'too_many_invites') return '초대 코드를 너무 많이 만들었어요. 잠시 뒤 다시 시도해 주세요.';
    if (error.code === 'not_configured') return '이 빌드에서는 공유 기능을 쓸 수 없어요.';
  }
  return '서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요. 이 기기에서는 계속 쓸 수 있어요.';
}

const STATUS_TEXT = { off: '', syncing: '맞추는 중…', ok: '연결됨', offline: '지금은 서버에 연결할 수 없어요. 이 기기에서는 계속 쓸 수 있고, 연결되면 자동으로 맞춰요.', removed: '이 집에서 나가게 되어 공유가 꺼졌어요. 지금 데이터는 이 기기에 남아 있어요.' } as const;

export default function SharingScreen() {
  const c = useColors();
  const router = useRouter();
  const { notifyDataChanged } = useAppState();
  const { sharing, status, conflicts, clearConflicts, syncNow, refresh } = useSync();
  const { data: view } = useLoader(loadHouseholdView);
  const [adult, setAdult] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ code: string; expiresAt: string } | null>(null);
  const [confirm, setConfirm] = useState<'leave' | 'delete' | null>(null);

  const act = async (task: () => Promise<void>) => {
    setBusy(true);
    setProblem(null);
    try {
      await task();
      await refresh();
      notifyDataChanged();
    } catch (error) {
      logError('sharing', error);
      setProblem(problemText(error));
    } finally {
      setBusy(false);
    }
  };

  const shareInvite = async () => {
    if (!invite || !view) return;
    await Share.share({ message: inviteMessage(view.household.name, invite.code) }).catch(() => {});
  };

  const header = <ScreenHeader title="함께 쓰기" />;

  if (!sharingAvailable()) {
    return (
      <View style={[styles.flex, { backgroundColor: c.background }]}>
        {header}
        <Screen>
          <InlineMessage>이 빌드에서는 공유 기능을 쓸 수 없어요. 이 기기 안에서는 모든 기능을 그대로 쓸 수 있어요.</InlineMessage>
        </Screen>
      </View>
    );
  }

  if (!sharing) {
    return (
      <View style={[styles.flex, { backgroundColor: c.background }]}>
        {header}
        <Screen
          contentStyle={styles.content}
          footer={
            <>
              <PrimaryButton label="이 집을 공유하기" onPress={() => act(startSharing)} disabled={busy || !adult || !agreed} testID="start-sharing" />
              <SecondaryButton label="초대 코드로 다른 집에 참여하기" onPress={() => router.push('/join')} />
            </>
          }>
          <AppText tone="secondary">각자 휴대폰에서 같은 집의 일정을 보고 체크할 수 있어요. Android와 iPhone끼리도 돼요. 공유를 켜면 초대 코드를 만들어 다른 구성원에게 보낼 수 있어요.</AppText>
          <InlineMessage>로그인 없이 이 기기에 공유 계정이 만들어져요. 앱을 지우거나 휴대폰을 바꾸면 이 계정으로 다시 들어갈 수 없으니, 다른 구성원에게 초대 코드를 다시 받아 주세요.</InlineMessage>
          <ShareConsent adult={adult} agreed={agreed} onAdult={setAdult} onAgreed={setAgreed} />
          {problem ? <InlineMessage tone="warning">{problem}</InlineMessage> : null}
          {status === 'removed' ? <InlineMessage tone="warning">{STATUS_TEXT.removed}</InlineMessage> : null}
        </Screen>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      {header}
      <Screen contentStyle={styles.content}>
        <Card style={styles.card}>
          <AppText variant="sectionTitle">{view?.household.name ?? ''} 공유 중</AppText>
          <AppText tone="secondary">연결된 기기 {sharing.memberCount}대 · {sharing.lastSyncedAt ? `마지막으로 맞춘 시각 ${activityTimeLabel(sharing.lastSyncedAt)}` : '아직 맞추지 않았어요'}</AppText>
          {status === 'syncing' ? <AppText variant="caption" tone="secondary">{STATUS_TEXT.syncing}</AppText> : null}
          {status === 'offline' ? <InlineMessage tone="warning">{STATUS_TEXT.offline}</InlineMessage> : null}
          <SecondaryButton label="지금 맞추기" icon="sync" onPress={() => syncNow()} disabled={status === 'syncing'} testID="sync-now" />
        </Card>

        {conflicts > 0 ? (
          <View style={styles.group}>
            <InlineMessage tone="warning">{`다른 기기에서 먼저 바뀐 항목 ${conflicts}개는 그쪽 내용으로 맞췄어요. 필요하면 다시 고쳐 주세요.`}</InlineMessage>
            <SecondaryButton label="확인" onPress={clearConflicts} />
          </View>
        ) : null}

        <View style={styles.group}>
          <AppText variant="sectionTitle">구성원 초대</AppText>
          {invite ? (
            <Card style={styles.card}>
              <AppText variant="screenTitle" align="center" selectable testID="invite-code">{formatInviteCode(invite.code)}</AppText>
              <AppText variant="caption" tone="secondary" align="center">{monthDay(localToday(new Date(invite.expiresAt)))}까지 5명이 쓸 수 있어요</AppText>
              <PrimaryButton label="초대 메시지 보내기" onPress={shareInvite} />
            </Card>
          ) : (
            <SecondaryButton label="초대 코드 만들기" onPress={() => act(async () => setInvite(await createInviteCode()))} disabled={busy} testID="create-invite" />
          )}
          <AppText variant="caption" tone="secondary">{'받는 사람은 앱 첫 화면이나 설정의 "초대 코드로 참여하기"에서 코드를 입력하면 돼요. 그 휴대폰에 있던 데이터는 이 집의 데이터로 바뀌어요.'}</AppText>
        </View>

        {problem ? <InlineMessage tone="warning">{problem}</InlineMessage> : null}

        <View style={styles.group}>
          <AppText variant="sectionTitle">공유 그만두기</AppText>
          <SecondaryButton label="이 기기만 공유 그만두기" onPress={() => setConfirm('leave')} disabled={busy} />
          <SecondaryButton label="공유 계정과 서버 데이터 삭제" tone="danger" onPress={() => setConfirm('delete')} disabled={busy} testID="delete-sharing-account" />
          <AppText variant="caption" tone="secondary">어느 쪽이든 지금 데이터는 이 기기에 남아요. 마지막 구성원이 나가면 서버의 집 데이터도 모두 지워져요. 문의할 때는 집 번호 {sharing.householdId.slice(0, 8)}를 알려 주세요.</AppText>
        </View>
      </Screen>

      <ConfirmDialog
        visible={confirm !== null}
        title={confirm === 'delete' ? '공유 계정을 삭제할까요?' : '이 기기의 공유를 그만둘까요?'}
        message={
          confirm === 'delete'
            ? '이 기기의 공유 계정을 서버에서 지워요. 다른 구성원이 없으면 집 데이터도 서버에서 모두 지워져요. 다시 공유하려면 초대를 새로 받아야 해요.'
            : '다른 구성원의 기기와 더 이상 맞추지 않아요. 다시 함께 쓰려면 초대를 새로 받아야 해요.'
        }
        confirmLabel={confirm === 'delete' ? '삭제' : '그만두기'}
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const which = confirm;
          setConfirm(null);
          act(which === 'delete' ? deleteSharingAccount : leaveSharing);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: spacing.sm, gap: spacing.lg },
  card: { gap: spacing.sm },
  group: { gap: spacing.sm },
});
