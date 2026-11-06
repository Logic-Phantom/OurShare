import type { HouseholdMember } from '@/domain/models';
import { DEFAULT_REMINDER_SETTINGS, MAX_SCHEDULED_REMINDERS, planReminders, type ReminderSettings } from '@/features/reminders/reminder-policy';
import { chore } from '../../helpers/fixtures';

const members: HouseholdMember[] = [
  { id: 'a', displayName: '지민', targetSharePercent: 60, isActive: true, colorKey: 'blue', avatarKey: 'short', sortOrder: 0 },
  { id: 'b', displayName: '지은', targetSharePercent: 40, isActive: true, colorKey: 'pink', avatarKey: 'bun', sortOrder: 1 },
];
const on: ReminderSettings = { ...DEFAULT_REMINDER_SETTINGS, enabled: true, scope: 'ALL' };
const base = { members, settings: on, meMemberId: 'a', today: '2026-11-06', nowTime: '10:00' };

describe('planReminders', () => {
  it('schedules nothing while reminders are off', () => {
    expect(planReminders({ ...base, settings: DEFAULT_REMINDER_SETTINGS, chores: [chore({ localDate: '2026-11-07', reminderMode: 'SAME_DAY' })] })).toEqual([]);
  });

  it('uses the default time, the chore time minus 30 minutes, or the evening before', () => {
    const plan = planReminders({
      ...base,
      chores: [
        chore({ id: 'p', localDate: '2026-11-07', reminderMode: 'SAME_DAY', assigneeMemberId: 'a' }),
        chore({ id: 'q', localDate: '2026-11-07', reminderMode: 'SAME_DAY', dueTime: '20:00', assigneeMemberId: 'b' }),
        chore({ id: 'r', localDate: '2026-11-08', reminderMode: 'DAY_BEFORE', assigneeMemberId: 'b' }),
        chore({ id: 's', localDate: '2026-11-08', reminderMode: 'SAME_DAY', dueTime: '00:10' }),
      ],
    });
    expect(plan.map((p) => [p.choreId, p.date, p.time])).toEqual([
      ['p', '2026-11-07', '09:00'],
      ['q', '2026-11-07', '19:30'],
      ['r', '2026-11-07', '20:00'],
      ['s', '2026-11-07', '23:40'],
    ]);
    expect(plan[0]!.body).toBe('오늘 할 일이에요. 지민님 차례예요.');
    expect(plan[1]!.body).toBe('곧 시작돼요. 지은님 차례예요.');
    expect(plan[2]!.body).toBe('내일 할 일이에요. 지은님 차례예요.');
    expect(plan[3]!.body).toBe('곧 시작돼요. 담당자를 아직 정하지 않았어요.');
  });

  it('skips finished, switched-off, past and far-off chores', () => {
    const plan = planReminders({
      ...base,
      chores: [
        chore({ localDate: '2026-11-07', reminderMode: 'SAME_DAY', status: 'DONE' }),
        chore({ localDate: '2026-11-07', reminderMode: 'SAME_DAY', status: 'SKIPPED' }),
        chore({ localDate: '2026-11-07', reminderMode: 'NONE' }),
        chore({ localDate: '2026-11-06', reminderMode: 'SAME_DAY' }),
        chore({ localDate: '2026-11-06', reminderMode: 'DAY_BEFORE' }),
        chore({ localDate: '2026-11-25', reminderMode: 'SAME_DAY' }),
      ],
    });
    expect(plan).toEqual([]);
  });

  it('keeps a later time today', () => {
    const plan = planReminders({ ...base, chores: [chore({ localDate: '2026-11-06', reminderMode: 'SAME_DAY', dueTime: '18:00' })] });
    expect(plan.map((p) => p.time)).toEqual(['17:30']);
  });

  it('shows only my chores on my phone, and says so in the text', () => {
    const plan = planReminders({
      ...base,
      settings: { ...on, scope: 'MINE' },
      chores: [
        chore({ localDate: '2026-11-07', reminderMode: 'SAME_DAY', assigneeMemberId: 'a' }),
        chore({ localDate: '2026-11-07', reminderMode: 'SAME_DAY', assigneeMemberId: 'b' }),
      ],
    });
    expect(plan).toHaveLength(1);
    expect(plan[0]!.body).toBe('오늘 할 일이에요. 내 차례예요.');
  });

  it('falls back to everyone when nobody is marked as this phone\'s user', () => {
    const plan = planReminders({
      ...base,
      meMemberId: null,
      settings: { ...on, scope: 'MINE' },
      chores: [chore({ localDate: '2026-11-07', reminderMode: 'SAME_DAY', assigneeMemberId: 'b' })],
    });
    expect(plan).toHaveLength(1);
  });

  it('never exceeds the OS budget, keeping the soonest', () => {
    const chores = Array.from({ length: 80 }, (_, index) => chore({ localDate: index < 40 ? '2026-11-07' : '2026-11-08', reminderMode: 'SAME_DAY' }));
    const plan = planReminders({ ...base, chores });
    expect(plan).toHaveLength(MAX_SCHEDULED_REMINDERS);
    expect(plan.filter((p) => p.date === '2026-11-07')).toHaveLength(40);
  });
});
