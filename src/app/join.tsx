import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ShareConsent } from '@/components/ShareConsent';
import { AppText, InlineMessage, PrimaryButton, Screen, ScreenHeader, spacing, TextField, useColors } from '@/design-system';
import { loadHouseholdView } from '@/features/household/household-service';
import { RemoteError } from '@/features/sync/remote';
import { joinWithCode, loadSharing, sharingAvailable } from '@/features/sync/sharing-service';
import { useAppState } from '@/hooks/app-state';
import { useLoader } from '@/hooks/use-loader';
import { useSync } from '@/hooks/sync-state';
import { logError } from '@/utils/log';

/** Also opened by the link in an invite message: ourshare://join?code=… */
export default function JoinScreen() {
  const c = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const { updateSettings, notifyDataChanged } = useAppState();
  const { refresh } = useSync();
  const { data } = useLoader(async () => ({ view: await loadHouseholdView(), sharing: await loadSharing() }));
  const [code, setCode] = useState(params.code ?? '');
  const [adult, setAdult] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const join = async () => {
    setBusy(true);
    setProblem(null);
    try {
      const result = await joinWithCode(code);
      if (!result.ok) {
        setProblem(result.reason === 'format' ? '코드 26자를 모두 입력해 주세요.' : '코드가 맞지 않거나, 기간이 지났거나, 이미 다 쓰였어요. 새 코드를 받아 주세요.');
        return;
      }
      // Who uses this phone is chosen next on the household screen.
      await updateSettings({ onboardingDone: true, meMemberId: null });
      await refresh();
      notifyDataChanged();
      if (router.canDismiss()) router.dismissAll();
      router.replace('/household');
    } catch (error) {
      logError('join', error);
      setProblem(
        error instanceof RemoteError && error.code === 'too_many_attempts'
          ? '코드를 여러 번 잘못 입력했어요. 1시간 뒤에 다시 시도해 주세요.'
          : error instanceof RemoteError && error.code === 'household_full'
            ? '이 집은 구성원이 가득 찼어요.'
            : '서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.',
      );
    } finally {
      setBusy(false);
    }
  };

  const header = <ScreenHeader title="초대 코드로 참여하기" />;
  if (!sharingAvailable()) {
    return (
      <View style={[styles.flex, { backgroundColor: c.background }]}>
        {header}
        <Screen>
          <InlineMessage>이 빌드에서는 공유 기능을 쓸 수 없어요.</InlineMessage>
        </Screen>
      </View>
    );
  }

  const hasLocalData = Boolean(data?.view);
  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      {header}
      <Screen contentStyle={styles.content} footer={<PrimaryButton label="참여하기" onPress={join} disabled={busy || !adult || !agreed || code.trim().length === 0 || Boolean(data?.sharing)} testID="join" />}>
        <TextField label="초대 코드" value={code} onChangeText={setCode} placeholder="XXXX-XXXX-XXXX-…" autoCapitalize="characters" autoCorrect={false} testID="invite-input" />
        {data?.sharing ? <InlineMessage tone="warning">{'이미 다른 집을 공유하고 있어요. 설정 > 함께 쓰기에서 먼저 그만둔 뒤 참여해 주세요.'}</InlineMessage> : null}
        {hasLocalData && !data?.sharing ? (
          <InlineMessage tone="warning">{'참여하면 이 기기에 있던 집, 구성원, 집안일, 일정이 초대한 집의 내용으로 바뀌어요. 필요하면 먼저 설정 > 백업과 복원에서 백업해 두세요.'}</InlineMessage>
        ) : null}
        <AppText tone="secondary">참여한 뒤 우리집 탭에서 왕관을 눌러 이 휴대폰을 쓰는 사람을 골라 주세요. 그래야 내 차례 알림을 받을 수 있어요.</AppText>
        <ShareConsent adult={adult} agreed={agreed} onAdult={setAdult} onAgreed={setAgreed} />
        {problem ? <InlineMessage tone="warning">{problem}</InlineMessage> : null}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: spacing.sm, gap: spacing.lg },
});
