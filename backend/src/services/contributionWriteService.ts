import { decideContribution, type ContributionStatus } from '../domain/contribution.js';

export interface ContributionEvent {
  id: string;
  communityId: string;
  status: string;
  startsAt: Date | null;
  endsAt: Date | null;
}

export interface ContributionActivity {
  id: string;
  userId: string;
  distanceMeters: number;
  verificationStatus: string;
  startTime: Date;
}

export interface ContributionRecord {
  id: string;
  eventId: string;
  activityId: string;
  userId: string;
  status: ContributionStatus;
  acceptedDistanceMeters: number;
  decisionReason: string;
}

export type NewContributionRecord = Omit<ContributionRecord, 'id'>;

export interface ContributionWriteRepository {
  findEvent(eventId: string): Promise<ContributionEvent | null>;
  findActivity(activityId: string): Promise<ContributionActivity | null>;
  findMembership(communityId: string, userId: string): Promise<{ status: string } | null>;
  findExistingContribution(eventId: string, activityId: string): Promise<ContributionRecord | null>;
  createContribution(input: NewContributionRecord): Promise<ContributionRecord>;
}

export interface CreateContributionInput {
  eventId: string;
  activityId: string;
}

function assertActivityWithinEvent(activity: ContributionActivity, event: ContributionEvent): void {
  if (event.startsAt && activity.startTime < event.startsAt) throw new Error('ACTIVITY_OUTSIDE_EVENT');
  if (event.endsAt && activity.startTime > event.endsAt) throw new Error('ACTIVITY_OUTSIDE_EVENT');
}

export function createContributionWriteService(repository: ContributionWriteRepository) {
  return {
    async createContribution(input: CreateContributionInput): Promise<ContributionRecord> {
      const event = await repository.findEvent(input.eventId);
      if (!event) throw new Error('EVENT_NOT_FOUND');
      if (event.status !== 'ACTIVE') throw new Error('EVENT_NOT_ACTIVE');

      const activity = await repository.findActivity(input.activityId);
      if (!activity) throw new Error('ACTIVITY_NOT_FOUND');
      assertActivityWithinEvent(activity, event);

      const membership = await repository.findMembership(event.communityId, activity.userId);
      if (membership?.status !== 'APPROVED') throw new Error('MEMBER_NOT_APPROVED');

      const existing = await repository.findExistingContribution(event.id, activity.id);
      if (existing) {
        if (existing.userId !== activity.userId) throw new Error('CONTRIBUTION_OWNERSHIP_MISMATCH');
        return existing;
      }

      const decision = decideContribution({
        memberStatus: 'APPROVED',
        verificationStatus: activity.verificationStatus,
        distanceMeters: activity.distanceMeters,
      });
      if (decision.status === 'REJECTED') {
        throw new Error(`ACTIVITY_NOT_ELIGIBLE:${decision.decisionReason}`);
      }

      return repository.createContribution({
        eventId: event.id,
        activityId: activity.id,
        userId: activity.userId,
        status: decision.status,
        acceptedDistanceMeters: decision.acceptedDistanceMeters,
        decisionReason: decision.decisionReason,
      });
    },
  };
}
