export interface EventContributionRow {
  activityOwnerUserId: string;
  contributionUserId?: string;
  nickname: string;
  avatarUrl: string | null;
  memberStatus: string;
  contributionStatus: string;
  acceptedDistanceMeters: number;
}

export interface EventProgressSummary {
  acceptedDistanceMeters: number;
  routeDistanceMeters: number;
  overflowDistanceMeters: number;
  progressPercent: number;
  participantCount: number;
  scaleRatio: 1;
}

export interface EventRankingRow {
  rank: number;
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  acceptedDistanceMeters: number;
}

function isCounted(row: EventContributionRow): boolean {
  return row.memberStatus === 'APPROVED'
    && row.contributionStatus === 'ACCEPTED'
    && Number.isFinite(row.acceptedDistanceMeters)
    && row.acceptedDistanceMeters > 0;
}

export function buildEventRanking(rows: readonly EventContributionRow[]): EventRankingRow[] {
  const totals = new Map<string, Omit<EventRankingRow, 'rank'>>();
  rows.filter(isCounted).forEach((row) => {
    const existing = totals.get(row.activityOwnerUserId);
    totals.set(row.activityOwnerUserId, {
      userId: row.activityOwnerUserId,
      nickname: row.nickname,
      avatarUrl: row.avatarUrl,
      acceptedDistanceMeters: (existing?.acceptedDistanceMeters ?? 0) + Math.round(row.acceptedDistanceMeters),
    });
  });

  return [...totals.values()]
    .sort((left, right) => right.acceptedDistanceMeters - left.acceptedDistanceMeters
      || left.nickname.localeCompare(right.nickname, 'zh-CN'))
    .map((row, index) => ({ rank: index + 1, ...row }));
}

export function buildEventProgress(
  targetDistanceMeters: number,
  rows: readonly EventContributionRow[],
): EventProgressSummary {
  const target = Number.isFinite(targetDistanceMeters) ? Math.max(0, Math.round(targetDistanceMeters)) : 0;
  const ranking = buildEventRanking(rows);
  const accepted = ranking.reduce((sum, row) => sum + row.acceptedDistanceMeters, 0);
  const routeDistance = Math.min(accepted, target);
  return {
    acceptedDistanceMeters: accepted,
    routeDistanceMeters: routeDistance,
    overflowDistanceMeters: Math.max(0, accepted - target),
    progressPercent: target === 0 ? 0 : routeDistance / target * 100,
    participantCount: ranking.length,
    scaleRatio: 1,
  };
}
