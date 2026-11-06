import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, ConfirmDialog, InlineMessage, PrimaryButton, Screen, ScreenHeader, SecondaryButton, spacing, useColors } from '@/design-system';
import { BACKUP_PROBLEM_TEXT, backupFileName, backupSummary, MAX_BACKUP_BYTES, type Backup } from '@/features/backup/backup-format';
import { readBackup, restoreBackup, validateBackupText } from '@/features/backup/backup-service';
import { useAppState } from '@/hooks/app-state';
import { backupFilesSupported, pickTextFile, shareTextFile } from '@/infrastructure/files/backup-files';
import { localToday } from '@/utils/dates';
import { logError } from '@/utils/log';

export default function BackupScreen() {
  const c = useColors();
  const router = useRouter();
  const { settings, updateSettings, notifyDataChanged } = useAppState();
  const [message, setMessage] = useState<{ tone: 'info' | 'warning'; text: string } | null>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const [busy, setBusy] = useState(false);

  const exportNow = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const backup = await readBackup(new Date().toISOString());
      await shareTextFile(backupFileName(localToday()), JSON.stringify(backup));
    } catch (error) {
      logError('backup.export', error);
      setMessage({ tone: 'warning', text: '백업 파일을 만들지 못했어요. 다시 시도해 주세요.' });
    } finally {
      setBusy(false);
    }
  };

  const pick = async () => {
    setMessage(null);
    try {
      const picked = await pickTextFile(MAX_BACKUP_BYTES);
      if (!picked) return;
      if ('tooLarge' in picked) return setMessage({ tone: 'warning', text: '파일이 너무 커요. 우리몫 백업 파일이 맞는지 확인해 주세요.' });
      const parsed = validateBackupText(picked.text);
      if (!parsed.ok) return setMessage({ tone: 'warning', text: BACKUP_PROBLEM_TEXT[parsed.problem] });
      setPending(parsed.backup);
    } catch (error) {
      logError('backup.pick', error);
      setMessage({ tone: 'warning', text: '파일을 열지 못했어요.' });
    }
  };

  const restore = async () => {
    if (!pending) return;
    const backup = pending;
    setPending(null);
    setBusy(true);
    try {
      const { memberIds } = await restoreBackup(backup);
      await updateSettings({ onboardingDone: true, meMemberId: settings.meMemberId && memberIds.includes(settings.meMemberId) ? settings.meMemberId : null });
      notifyDataChanged();
      if (router.canDismiss()) router.dismissAll();
      router.replace('/');
    } catch (error) {
      logError('backup.restore', error);
      setMessage({ tone: 'warning', text: '복원하지 못했어요. 지금 데이터는 그대로예요.' });
      setBusy(false);
    }
  };

  const summary = pending ? backupSummary(pending) : null;

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <ScreenHeader title="백업과 복원" />
      <Screen contentStyle={styles.content}>
        <AppText tone="secondary">우리몫의 데이터는 이 기기에만 있어요. 휴대폰을 바꾸거나 앱을 지우기 전에 백업 파일을 만들어 두세요.</AppText>
        <InlineMessage>백업 파일에는 구성원 이름과 집안일 기록이 들어 있어요. 믿을 수 있는 곳에만 보관하거나 보내 주세요.</InlineMessage>
        {!backupFilesSupported ? <InlineMessage tone="warning">웹 미리보기에서는 백업 파일을 다룰 수 없어요. 설치한 앱에서 사용해 주세요.</InlineMessage> : null}

        <View style={styles.group}>
          <AppText variant="sectionTitle">백업 만들기</AppText>
          <AppText variant="caption" tone="secondary">파일을 만든 뒤 저장할 곳이나 보낼 앱을 고를 수 있어요. 알림 설정과 이 기기 사용자 표시는 포함되지 않아요.</AppText>
          <PrimaryButton label="백업 파일 만들기" onPress={exportNow} disabled={busy || !backupFilesSupported} testID="export-backup" />
        </View>

        <View style={styles.group}>
          <AppText variant="sectionTitle">백업에서 복원</AppText>
          <AppText variant="caption" tone="secondary">지금 기기의 데이터를 모두 지우고 백업 파일의 내용으로 바꿔요.</AppText>
          <SecondaryButton label="백업 파일 고르기" onPress={pick} disabled={busy || !backupFilesSupported} testID="import-backup" />
        </View>

        {message ? <InlineMessage tone={message.tone}>{message.text}</InlineMessage> : null}
      </Screen>

      <ConfirmDialog
        visible={pending !== null}
        title="이 백업으로 바꿀까요?"
        message={summary ? `${summary.householdName} · 구성원 ${summary.members}명 · 집안일 ${summary.chores}개 · 일정 ${summary.weeks}주\n지금 기기의 데이터는 모두 지워지고 되돌릴 수 없어요.` : ''}
        confirmLabel="복원하기"
        danger
        onConfirm={restore}
        onCancel={() => setPending(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: spacing.sm, gap: spacing.lg },
  group: { gap: spacing.sm },
});
