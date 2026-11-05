import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { CHORE_TITLE_MAX, DEFAULT_WORKLOAD_POINTS, validateChoreDraft, type ChoreDraftErrors } from '@/domain/chores';
import type { AssignmentMode, ChoreDefinition, HouseholdMember } from '@/domain/models';
import {
  AppText,
  BottomSheet,
  Chip,
  ConfirmDialog,
  InlineMessage,
  MemberAvatar,
  PrimaryButton,
  radius,
  Screen,
  ScreenHeader,
  SecondaryButton,
  SegmentedChoice,
  spacing,
  StarRating,
  TextField,
  useColors,
  ValueRow,
  WeekdayChips,
} from '@/design-system';
import { CHORE_CATEGORIES, DURATION_CHOICES, DUE_TIME_CHOICES, formatDueTime } from '@/features/chores/catalog';
import { createChore, deleteChore, saveChore } from '@/features/chores/chore-service';
import type { HouseholdView } from '@/features/household/household-service';
import { useAppState } from '@/hooks/app-state';
import { logError } from '@/utils/log';

import { ChoreIcon } from './ChoreIcon';

const MODE_OPTIONS: readonly { value: AssignmentMode; label: string }[] = [
  { value: 'FIXED', label: '고정' },
  { value: 'AUTO_BALANCED_RANDOM', label: '자동' },
  { value: 'MANUAL', label: '수동' },
];

const MODE_HELP: Record<AssignmentMode, string> = {
  FIXED: '이 사람이 매번 맡아요. 자동 배정이 바꾸지 않아요.',
  AUTO_BALANCED_RANDOM: '목표 비율과 부담 점수를 보고 나눠요.',
  MANUAL: '일정을 만들 때마다 직접 정해요.',
};

const POINTS_HELP = ['', '아주 가벼워요', '가벼워요', '보통이에요', '조금 힘들어요', '많이 힘들어요'];

function PickerRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      style={[styles.pickerRow, { backgroundColor: selected ? c.greenSoft : c.surfaceMuted }]}>
      <AppText variant={selected ? 'bodyStrong' : 'body'} tone={selected ? 'green' : 'primary'}>{label}</AppText>
    </Pressable>
  );
}

function MemberPicker({ members, selectedId, onPick }: { members: readonly HouseholdMember[]; selectedId: string | null; onPick: (id: string) => void }) {
  const c = useColors();
  return (
    <>
      {members.map((member) => {
        const selected = member.id === selectedId;
        return (
          <Pressable
            key={member.id}
            onPress={() => onPick(member.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            accessibilityLabel={member.displayName}
            style={[styles.memberRow, { backgroundColor: selected ? c.greenSoft : c.surfaceMuted }]}>
            <MemberAvatar avatarKey={member.avatarKey} colorKey={member.colorKey} size={40} />
            <AppText variant={selected ? 'bodyStrong' : 'body'} tone={selected ? 'green' : 'primary'}>{member.displayName}</AppText>
          </Pressable>
        );
      })}
    </>
  );
}

/** Shared by new and edit: `chore` is absent when creating. Remount with a key to load different values. */
export function ChoreForm({ view, chore }: { view: HouseholdView; chore?: ChoreDefinition }) {
  const router = useRouter();
  const { notifyDataChanged } = useAppState();
  const { household, members } = view;
  const activeMembers = members.filter((member) => member.isActive);

  const [title, setTitle] = useState(chore?.title ?? '');
  const [category, setCategory] = useState(chore?.category ?? 'CLEANING');
  const [weekdaysMask, setWeekdaysMask] = useState(chore?.weekdaysMask ?? 0);
  const [estimatedMinutes, setEstimatedMinutes] = useState(chore?.estimatedMinutes ?? null);
  const [dueTime, setDueTime] = useState(chore?.dueTime ?? null);
  const [workloadPoints, setWorkloadPoints] = useState(chore?.workloadPoints ?? DEFAULT_WORKLOAD_POINTS);
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>(chore?.assignmentMode ?? 'AUTO_BALANCED_RANDOM');
  const [fixedMemberId, setFixedMemberId] = useState(chore?.fixedMemberId ?? null);
  const [notes, setNotes] = useState(chore?.notes ?? '');
  const [isActive, setIsActive] = useState(chore?.isActive ?? true);
  const [errors, setErrors] = useState<ChoreDraftErrors>({});
  const [saveFailed, setSaveFailed] = useState(false);
  const [sheet, setSheet] = useState<'minutes' | 'time' | 'member' | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const fixedMember = members.find((member) => member.id === fixedMemberId && member.isActive);

  const onSave = async () => {
    const draft = { title, weekdaysMask, workloadPoints, assignmentMode, fixedMemberId };
    const found = validateChoreDraft(draft, members);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const fields = { ...draft, category, estimatedMinutes, dueTime, notes, isActive, reminderMode: chore?.reminderMode ?? ('NONE' as const) };
    try {
      if (chore) await saveChore({ ...chore, ...fields });
      else await createChore(household.id, fields);
      notifyDataChanged();
      router.back();
    } catch (error) {
      logError('chore.save', error);
      setSaveFailed(true);
    }
  };

  const onDelete = async () => {
    if (!chore) return;
    setConfirmingDelete(false);
    try {
      await deleteChore(chore.id);
      notifyDataChanged();
      router.back();
    } catch (error) {
      logError('chore.delete', error);
      setSaveFailed(true);
    }
  };

  return (
    <View style={styles.flex}>
      <ScreenHeader title="집안일 설정" />
      <Screen footer={<PrimaryButton label="저장하기" onPress={onSave} testID="save-chore" />} contentStyle={styles.form}>
        <View style={styles.hero}>
          <ChoreIcon category={category} size={104} />
        </View>

        <TextField label="집안일 이름" value={title} onChangeText={setTitle} placeholder="예: 청소기 돌리기" maxLength={CHORE_TITLE_MAX} error={errors.title} testID="chore-title" />

        <View style={styles.group}>
          <AppText variant="bodyStrong">반복 요일</AppText>
          <WeekdayChips mask={weekdaysMask} onChange={setWeekdaysMask} weekStartsOn={household.weekStartsOn} />
          {errors.weekdays ? <AppText variant="caption" tone="danger">{errors.weekdays}</AppText> : null}
        </View>

        <ValueRow label="예상 시간" icon="time-outline" value={estimatedMinutes ? `${estimatedMinutes}분` : '정하지 않음'} onPress={() => setSheet('minutes')} />

        <View style={styles.group}>
          <View style={styles.between}>
            <AppText variant="bodyStrong">부담 점수</AppText>
            <StarRating label="부담 점수" value={workloadPoints} onChange={setWorkloadPoints} />
          </View>
          <AppText variant="caption" tone="secondary" align="right">{workloadPoints}점: {POINTS_HELP[workloadPoints]}</AppText>
        </View>

        <View style={styles.group}>
          <AppText variant="bodyStrong">담당 방식</AppText>
          <SegmentedChoice label="담당 방식" options={MODE_OPTIONS} value={assignmentMode} onChange={setAssignmentMode} />
          <AppText variant="caption" tone="secondary">{MODE_HELP[assignmentMode]}</AppText>
        </View>

        {assignmentMode === 'FIXED' ? (
          <View style={styles.group}>
            <ValueRow
              label="고정 담당자"
              value={fixedMember?.displayName ?? '선택해 주세요'}
              onPress={() => setSheet('member')}
              leading={fixedMember ? <MemberAvatar avatarKey={fixedMember.avatarKey} colorKey={fixedMember.colorKey} size={32} /> : undefined}
            />
            {errors.fixedMember ? <AppText variant="caption" tone="danger">{errors.fixedMember}</AppText> : null}
          </View>
        ) : null}

        <View style={styles.group}>
          <AppText variant="bodyStrong">종류</AppText>
          <View style={styles.wrap}>
            {CHORE_CATEGORIES.map((item) => (
              <Chip key={item.key} label={item.label} selected={category === item.key} onPress={() => setCategory(item.key)} />
            ))}
          </View>
        </View>

        <ValueRow label="시간" icon="alarm-outline" value={dueTime ? formatDueTime(dueTime) : '정하지 않음'} onPress={() => setSheet('time')} />

        <TextField label="메모 (선택)" value={notes} onChangeText={setNotes} placeholder="완료 기준 등을 적어 두세요" multiline maxLength={200} style={styles.notes} />

        {chore ? (
          <View style={styles.between}>
            <View style={styles.flex}>
              <AppText variant="bodyStrong">사용하기</AppText>
              <AppText variant="caption" tone="secondary">끄면 새 일정에 넣지 않아요.</AppText>
            </View>
            <Switch value={isActive} onValueChange={setIsActive} accessibilityLabel="이 집안일 사용하기" />
          </View>
        ) : null}

        {saveFailed ? <InlineMessage tone="warning">저장하지 못했어요. 다시 시도해 주세요.</InlineMessage> : null}

        {chore ? <SecondaryButton label="집안일 삭제" tone="danger" onPress={() => setConfirmingDelete(true)} testID="delete-chore" /> : null}
      </Screen>

      <BottomSheet visible={sheet === 'minutes'} title="예상 시간" onClose={() => setSheet(null)}>
        <PickerRow label="정하지 않음" selected={estimatedMinutes === null} onPress={() => { setEstimatedMinutes(null); setSheet(null); }} />
        {DURATION_CHOICES.map((minutes) => (
          <PickerRow key={minutes} label={`${minutes}분`} selected={estimatedMinutes === minutes} onPress={() => { setEstimatedMinutes(minutes); setSheet(null); }} />
        ))}
      </BottomSheet>

      <BottomSheet visible={sheet === 'time'} title="시간" onClose={() => setSheet(null)}>
        <PickerRow label="정하지 않음" selected={dueTime === null} onPress={() => { setDueTime(null); setSheet(null); }} />
        {DUE_TIME_CHOICES.map((time) => (
          <PickerRow key={time} label={formatDueTime(time)} selected={dueTime === time} onPress={() => { setDueTime(time); setSheet(null); }} />
        ))}
      </BottomSheet>

      <BottomSheet visible={sheet === 'member'} title="고정 담당자" onClose={() => setSheet(null)}>
        <MemberPicker members={activeMembers} selectedId={fixedMemberId} onPick={(id) => { setFixedMemberId(id); setSheet(null); }} />
      </BottomSheet>

      <ConfirmDialog
        visible={confirmingDelete}
        title="이 집안일을 삭제할까요?"
        message="앞으로의 일정에 넣지 않아요. 이미 만든 일정과 완료 기록은 그대로 남아요."
        confirmLabel="삭제"
        danger
        onConfirm={onDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { gap: spacing.lg, paddingTop: spacing.xs },
  hero: { alignItems: 'center' },
  group: { gap: spacing.sm },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  notes: { minHeight: 80, textAlignVertical: 'top' },
  pickerRow: { minHeight: 48, borderRadius: radius.lg, paddingHorizontal: spacing.base, justifyContent: 'center' },
  memberRow: { minHeight: 56, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
