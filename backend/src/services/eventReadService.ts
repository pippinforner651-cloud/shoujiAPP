import {
  buildEventProgress,
  buildEventRanking,
  type EventContributionRow,
} from '../domain/eventProgress.js';

export interface EventDescriptor {
  id: string;
  communityId: string;
  routePackageId: string;
  targetDistanceMeters: number;
}

export interface EventReadRepository {
  findEvent(eventId: string): Promise<EventDescriptor | null>;
  listContributionRows(eventId: string, communityId: string): Promise<EventContributionRow[]>;
}

async function requireEvent(repository: EventReadRepository, eventId: string): Promise<EventDescriptor> {
  const event = await repository.findEvent(eventId);
  if (!event) throw new Error('EVENT_NOT_FOUND');
  return event;
}

export function createEventReadService(repository: EventReadRepository) {
  return {
    async getProgress(eventId: string) {
      const event = await requireEvent(repository, eventId);
      const rows = await repository.listContributionRows(event.id, event.communityId);
      const progress = buildEventProgress(event.targetDistanceMeters, rows);
      return {
        event_id: event.id,
        route_package_id: event.routePackageId,
        route_target_meters: event.targetDistanceMeters,
        accepted_distance_meters: progress.acceptedDistanceMeters,
        route_distance_meters: progress.routeDistanceMeters,
        overflow_distance_meters: progress.overflowDistanceMeters,
        progress_percent: progress.progressPercent,
        participant_count: progress.participantCount,
        scale_ratio: 1 as const,
      };
    },

    async getRanking(eventId: string) {
      const event = await requireEvent(repository, eventId);
      const rows = await repository.listContributionRows(event.id, event.communityId);
      return {
        event_id: event.id,
        ranking: buildEventRanking(rows).map((row) => ({
          rank: row.rank,
          user_id: row.userId,
          nickname: row.nickname,
          avatar_url: row.avatarUrl,
          accepted_distance_meters: row.acceptedDistanceMeters,
        })),
      };
    },
  };
}
