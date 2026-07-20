import { get } from './apiClient.ts';
import { mapEventProgressDto, type EventProgressDto, type EventProgressView, type EventRankingDto } from './eventCore.ts';

export async function loadEventProgress(eventId: string): Promise<EventProgressView> {
  const response = await get<EventProgressDto>(`/v2/events/${encodeURIComponent(eventId)}/progress`);
  if (!response.success || !response.data) throw new Error(response.error || 'E23班级进度暂不可用');
  return mapEventProgressDto(response.data);
}

export async function loadEventRanking(eventId: string): Promise<EventRankingDto> {
  const response = await get<EventRankingDto>(`/v2/events/${encodeURIComponent(eventId)}/ranking`);
  if (!response.success || !response.data) throw new Error(response.error || 'E23排行榜暂不可用');
  return response.data;
}

export type { EventProgressDto, EventProgressView, EventRankingDto } from './eventCore.ts';
