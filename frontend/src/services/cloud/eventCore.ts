export interface EventProgressDto {
  event_id: string;
  route_package_id: string;
  accepted_distance_meters: number;
  route_distance_meters: number;
  route_target_meters: number;
  overflow_distance_meters: number;
  progress_percent: number;
  participant_count: number;
  scale_ratio: 1;
}

export interface EventRankingEntryDto {
  rank: number;
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  accepted_distance_meters: number;
}

export interface EventRankingDto {
  event_id: string;
  ranking: EventRankingEntryDto[];
}

export interface EventProgressView {
  eventId: string;
  routePackageId: string;
  acceptedKm: number;
  routeKm: number;
  targetKm: number;
  overflowKm: number;
  progressPercent: number;
  participantCount: number;
  scaleRatio: 1;
}

export interface EventUnavailableState {
  status: 'unavailable';
  progress: null;
  ranking: [];
  error: string;
}

export function mapEventProgressDto(dto: EventProgressDto): EventProgressView {
  return {
    eventId: dto.event_id,
    routePackageId: dto.route_package_id,
    acceptedKm: dto.accepted_distance_meters / 1000,
    routeKm: dto.route_distance_meters / 1000,
    targetKm: dto.route_target_meters / 1000,
    overflowKm: dto.overflow_distance_meters / 1000,
    progressPercent: dto.progress_percent,
    participantCount: dto.participant_count,
    scaleRatio: 1,
  };
}

export function reduceEventLoadFailure(error: string): EventUnavailableState {
  return { status: 'unavailable', progress: null, ranking: [], error };
}
