import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createContributionWriteService,
  type ContributionWriteRepository,
} from './contributionWriteService.js';

function createFixture() {
  let memberStatus = 'APPROVED';
  let verificationStatus = 'verified_device';
  let activityStart = new Date('2026-07-15T08:00:00.000Z');
  let existing: Awaited<ReturnType<ContributionWriteRepository['findExistingContribution']>> = null;
  const creates: Parameters<ContributionWriteRepository['createContribution']>[0][] = [];

  const repository: ContributionWriteRepository = {
    async findEvent(eventId) {
      if (eventId === 'missing') return null;
      return {
        id: eventId,
        communityId: 'e23',
        status: 'ACTIVE',
        startsAt: new Date('2026-07-15T00:00:00.000Z'),
        endsAt: new Date('2026-07-16T00:00:00.000Z'),
      };
    },
    async findActivity(activityId) {
      if (activityId === 'missing') return null;
      return {
        id: activityId,
        userId: 'activity-owner',
        distanceMeters: 5_000,
        verificationStatus,
        startTime: activityStart,
      };
    },
    async findMembership() {
      return memberStatus === 'NONE' ? null : { status: memberStatus };
    },
    async findExistingContribution() {
      return existing;
    },
    async createContribution(input) {
      creates.push(input);
      return { id: 'contribution-1', ...input };
    },
  };

  return {
    repository,
    creates,
    setMemberStatus: (value: string) => { memberStatus = value; },
    setVerificationStatus: (value: string) => { verificationStatus = value; },
    setActivityStart: (value: Date) => { activityStart = value; },
    setExisting: (value: typeof existing) => { existing = value; },
  };
}

test('derives contribution owner from Activity and ignores a forged client userId', async () => {
  const fixture = createFixture();
  const service = createContributionWriteService(fixture.repository);
  const result = await service.createContribution({
    eventId: 'event-1',
    activityId: 'activity-1',
    userId: 'attacker',
  } as { eventId: string; activityId: string });

  assert.equal(result.userId, 'activity-owner');
  assert.equal(fixture.creates[0].userId, 'activity-owner');
});

test('rejects an activity whose owner is not an approved E23 member', async () => {
  const fixture = createFixture();
  fixture.setMemberStatus('PENDING');
  const service = createContributionWriteService(fixture.repository);
  await assert.rejects(() => service.createContribution({ eventId: 'event-1', activityId: 'activity-1' }), /MEMBER_NOT_APPROVED/);
  assert.equal(fixture.creates.length, 0);
});

test('does not create a contribution for a rejected activity', async () => {
  const fixture = createFixture();
  fixture.setVerificationStatus('invalid');
  const service = createContributionWriteService(fixture.repository);
  await assert.rejects(() => service.createContribution({ eventId: 'event-1', activityId: 'activity-1' }), /ACTIVITY_NOT_ELIGIBLE/);
  assert.equal(fixture.creates.length, 0);
});

test('returns the existing row without double-counting the same event activity', async () => {
  const fixture = createFixture();
  fixture.setExisting({
    id: 'existing',
    eventId: 'event-1',
    activityId: 'activity-1',
    userId: 'activity-owner',
    status: 'ACCEPTED',
    acceptedDistanceMeters: 5_000,
    decisionReason: 'AUTO_VERIFIED',
  });
  const service = createContributionWriteService(fixture.repository);
  const result = await service.createContribution({ eventId: 'event-1', activityId: 'activity-1' });
  assert.equal(result.id, 'existing');
  assert.equal(fixture.creates.length, 0);
});

test('rejects cross-event attribution when the activity is outside the event window', async () => {
  const fixture = createFixture();
  fixture.setActivityStart(new Date('2026-07-14T23:59:59.000Z'));
  const service = createContributionWriteService(fixture.repository);
  await assert.rejects(() => service.createContribution({ eventId: 'event-1', activityId: 'activity-1' }), /ACTIVITY_OUTSIDE_EVENT/);
  assert.equal(fixture.creates.length, 0);
});
