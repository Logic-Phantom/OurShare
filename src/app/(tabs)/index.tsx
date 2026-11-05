import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HOUSEHOLD_NAME_MAX, validateName } from '@/domain/chores';
import { AppText, BottomSheet, Card, EmptyState, HintCard, PrimaryButton, Screen, spacing, TextField, useColors } from '@/design-system';
import { listChores } from '@/features/chores/chore-repository';
import { loadHouseholdView, saveHouseholdSettings } from '@/features/household/household-service';
import { useAppState } from '@/hooks/app-state';
import { useLoader } from '@/hooks/use-loader';

export default function HomeScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { notifyDataChanged } = useAppState();
  const { data } = useLoader(async () => {
    const view = await loadHouseholdView();
    return view ? { ...view, chores: (await listChores(view.household.id)).filter((chore) => chore.isActive) } : null;
  });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  const openSheet = () => {
    setName(data?.household.name ?? '');
    setNameError(null);
    setEditing(true);
  };
  const saveName = async () => {
    const error = validateName(name, HOUSEHOLD_NAME_MAX);
    setNameError(error);
    if (error || !data) return;
    await saveHouseholdSettings(data.household, { name });
    setEditing(false);
    notifyDataChanged();
  };

  const activeMembers = data?.members.filter((member) => member.isActive).length ?? 0;
  const choreCount = data?.chores.length ?? 0;

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <Pressable
        onPress={openSheet}
        accessibilityRole="button"
        accessibilityLabel={`${data?.household.name ?? '우리집'}, 집 정보 보기`}
        style={[styles.title, { paddingTop: insets.top + spacing.md }]}>
        <AppText variant="screenTitle">{data?.household.name ?? ''}</AppText>
        <Ionicons name="chevron-down" size={18} color={c.textPrimary} />
      </Pressable>
      <Screen contentStyle={styles.content}>
        <Card>
          <EmptyState
            icon="calendar-outline"
            title="아직 이번 주 일정이 없어요"
            description={choreCount === 0 ? '집안일을 먼저 추가하면 일정을 만들 수 있어요.' : `구성원 ${activeMembers}명과 집안일 ${choreCount}개가 준비됐어요.`}
            action={choreCount === 0 ? <PrimaryButton label="집안일 추가하기" onPress={() => router.push('/chores')} /> : undefined}
          />
        </Card>
        {choreCount > 0 ? (
          <HintCard onPress={() => router.push('/chores')} label="집안일 확인하기">
            <AppText variant="body">일정을 만들기 전에 집안일의 요일과 담당 방식을 확인해 보세요.</AppText>
          </HintCard>
        ) : null}
      </Screen>

      <BottomSheet visible={editing} title="집 정보" onClose={() => setEditing(false)}>
        <TextField label="집 이름" value={name} onChangeText={setName} error={nameError} maxLength={HOUSEHOLD_NAME_MAX} placeholder="예: 우리집" />
        <PrimaryButton label="저장하기" onPress={saveName} />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, minHeight: 48 },
  content: { paddingTop: spacing.sm, gap: spacing.base },
});
