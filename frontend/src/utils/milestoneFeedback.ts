export interface MilestoneSnapshot {
  totalKm: number;
  streakDays: number;
  unlockedCityCount: number;
}

export interface CoreMilestone {
  id: string;
  name: string;
  description: string;
  type: 'distance' | 'streak' | 'city';
  threshold: number;
}

const CORE_MILESTONES: CoreMilestone[] = [
  { id: 'dist_first', name: '首次出发', description: '完成第一条真实跑步记录', type: 'distance', threshold: 0.1 },
  { id: 'dist_5', name: '五公里起点', description: '累计实际跑步5公里', type: 'distance', threshold: 5 },
  { id: 'dist_10', name: '十公里跑者', description: '累计实际跑步10公里', type: 'distance', threshold: 10 },
  { id: 'streak_3', name: '连续三天', description: '连续3天留下跑步记录', type: 'streak', threshold: 3 },
  { id: 'city_first', name: '第一站', description: '从深圳抵达路线上的第一座新城市', type: 'city', threshold: 2 },
];

export const MILESTONE_STORAGE_KEY = 'e23_milestone_feedback_v1';

export function getCoreMilestoneDefinitions(): CoreMilestone[] {
  return CORE_MILESTONES.map((item) => ({ ...item }));
}

function valueFor(snapshot: MilestoneSnapshot, type: CoreMilestone['type']): number {
  if (type === 'distance') return snapshot.totalKm;
  if (type === 'streak') return snapshot.streakDays;
  return snapshot.unlockedCityCount;
}

export function findNewMilestones(before: MilestoneSnapshot, after: MilestoneSnapshot): CoreMilestone[] {
  return CORE_MILESTONES.filter((milestone) =>
    valueFor(before, milestone.type) < milestone.threshold &&
    valueFor(after, milestone.type) >= milestone.threshold,
  );
}

export function filterUnseenMilestones(milestones: CoreMilestone[], seenIds: string[]): CoreMilestone[] {
  const seen = new Set(seenIds);
  return milestones.filter((milestone) => !seen.has(milestone.id));
}
