import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ChoreIcon } from '@/components/ChoreIcon';
import type { ChoreDefinition } from '@/domain/models';
import { AppText, Card, EmptyState, ErrorState, PrimaryButton, Screen, ScreenHeader, spacing, useColors } from '@/design-system';
import { describeAssignment, describeWeekdays } from '@/features/chores/catalog';
import { listChores } from '@/features/chores/chore-repository';
import { loadHouseholdView } from '@/features/household/household-service';
import { useLoader } from '@/hooks/use-loader';

function ChoreRow({ chore, subtitle, onPress }: { chore: ChoreDefinition; subtitle: string; onPress: () => void }) {
  const c = useColors();
  const status = chore.isActive ? '' : ' · 쉬는 중';
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${chore.title}, ${subtitle}${status}, 수정`}>
      <Card style={[styles.row, !chore.isActive && styles.resting]}>
        <ChoreIcon category={chore.category} />
        <View style={styles.rowText}>
          <AppText variant="bodyStrong" numberOfLines={1}>{chore.title}</AppText>
          <AppText variant="caption" tone="secondary" numberOfLines={2}>{subtitle}{status}</AppText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.textTertiary} />
      </Card>
    </Pressable>
  );
}

export default function ChoresScreen() {
  const c = useColors();
  const router = useRouter();
  const { data, error, reload } = useLoader(async () => {
    const view = await loadHouseholdView();
    return view ? { ...view, chores: await listChores(view.household.id) } : null;
  });

  const nameOf = (id: string) => data?.members.find((member) => member.id === id && member.isActive)?.displayName;
  const addButton = <PrimaryButton label="집안일 추가하기" onPress={() => router.push('/chore/new')} testID="add-chore" />;

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <ScreenHeader title="집안일" showBack={false} />
      <Screen contentStyle={styles.list} footer={data && data.chores.length > 0 ? addButton : undefined}>
        {error ? <ErrorState message="집안일을 불러오지 못했어요." onRetry={reload} /> : null}
        {data && data.chores.length === 0 ? (
          <EmptyState icon="sparkles-outline" title="아직 집안일이 없어요" description="반복되는 일을 추가하면 요일별로 나눠 드려요." action={addButton} />
        ) : null}
        {data?.chores.map((chore) => {
          const details = [
            describeWeekdays(chore.weekdaysMask, data.household.weekStartsOn),
            describeAssignment(chore, nameOf),
            `부담 ${chore.workloadPoints}점`,
            ...(chore.estimatedMinutes ? [`${chore.estimatedMinutes}분`] : []),
          ];
          return (
            <ChoreRow
              key={chore.id}
              chore={chore}
              subtitle={details.join(' · ')}
              onPress={() => router.push({ pathname: '/chore/[id]', params: { id: chore.id } })}
            />
          );
        })}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: spacing.md, paddingTop: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  resting: { opacity: 0.6 },
  rowText: { flex: 1, gap: 2 },
});
