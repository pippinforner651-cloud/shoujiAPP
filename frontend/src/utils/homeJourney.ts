export interface HomeRunRecord {
  date: string;
  distanceKm: number;
  durationMin: number;
}

export interface HomeJourneyModel {
  hasRecords: boolean;
  todayKm: number;
  weekKm: number;
  streakDays: number;
  goalKm: number;
  goalPercent: number;
  goalCompleted: boolean;
  primaryPrompt: string;
  nextMilestone: { label: string; targetKm: number; remainingKm: number };
}

const DAILY_GOAL_KM = 3;
const MILESTONES = [5, 10, 21.1, 50, 100, 200, 500];

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function rounded(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildHomeJourney(records: HomeRunRecord[], now = new Date()): HomeJourneyModel {
  const todayKey = localDateKey(now);
  const todayKm = rounded(records.filter((record) => record.date === todayKey)
    .reduce((sum, record) => sum + record.distanceKm, 0));
  const rollingStart = new Date(now);
  rollingStart.setHours(0, 0, 0, 0);
  rollingStart.setDate(rollingStart.getDate() - 6);
  const weekKm = rounded(records.filter((record) => {
    const recordDate = new Date(`${record.date}T00:00:00`);
    return recordDate >= rollingStart && recordDate <= now;
  }).reduce((sum, record) => sum + record.distanceKm, 0));

  const activeDates = new Set(records.map((record) => record.date));
  let streakDays = 0;
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  while (activeDates.has(localDateKey(cursor))) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const totalKm = rounded(records.reduce((sum, record) => sum + record.distanceKm, 0));
  const targetKm = MILESTONES.find((milestone) => totalKm < milestone) ?? 1000;
  const hasRecords = records.length > 0;
  const goalCompleted = todayKm >= DAILY_GOAL_KM;

  return {
    hasRecords,
    todayKm,
    weekKm,
    streakDays,
    goalKm: DAILY_GOAL_KM,
    goalPercent: Math.min(100, Math.round((todayKm / DAILY_GOAL_KM) * 100)),
    goalCompleted,
    primaryPrompt: !hasRecords
      ? '完成第一条跑步记录'
      : goalCompleted ? '今天已经向前一步' : '今天跑一点，下一站近一点',
    nextMilestone: hasRecords
      ? { label: `累计${targetKm}公里`, targetKm, remainingKm: rounded(targetKm - totalKm) }
      : { label: '完成第一次跑步', targetKm: 0, remainingKm: 0 },
  };
}
