import assert from 'node:assert/strict';
import test from 'node:test';

import { decideContribution, sumAcceptedContributions } from './contribution.js';

test('accepts every verified device metre for an approved E23 member', () => {
  assert.deepEqual(
    decideContribution({ memberStatus: 'APPROVED', verificationStatus: 'verified_device', distanceMeters: 5_000 }),
    { status: 'ACCEPTED', acceptedDistanceMeters: 5_000, decisionReason: 'AUTO_VERIFIED' },
  );
});

test('does not count an unapproved member', () => {
  assert.deepEqual(
    decideContribution({ memberStatus: 'PENDING', verificationStatus: 'verified_device', distanceMeters: 5_000 }),
    { status: 'REJECTED', acceptedDistanceMeters: 0, decisionReason: 'MEMBER_NOT_APPROVED' },
  );
});

test('holds manual entries for review without counting them', () => {
  assert.deepEqual(
    decideContribution({ memberStatus: 'APPROVED', verificationStatus: 'manual_unverified', distanceMeters: 5_000 }),
    { status: 'PENDING', acceptedDistanceMeters: 0, decisionReason: 'MANUAL_REVIEW_REQUIRED' },
  );
});

test('rejects suspected duplicates and invalid distances', () => {
  assert.equal(decideContribution({ memberStatus: 'APPROVED', verificationStatus: 'suspected_duplicate', distanceMeters: 5_000 }).status, 'REJECTED');
  assert.equal(decideContribution({ memberStatus: 'APPROVED', verificationStatus: 'verified_platform', distanceMeters: -1 }).status, 'REJECTED');
  assert.equal(decideContribution({ memberStatus: 'APPROVED', verificationStatus: 'verified_platform', distanceMeters: Number.NaN }).status, 'REJECTED');
});

test('sums only accepted contribution metres with exact one-to-one arithmetic', () => {
  const total = sumAcceptedContributions([
    { status: 'ACCEPTED', acceptedDistanceMeters: 5_000 },
    { status: 'ACCEPTED', acceptedDistanceMeters: 3_200 },
    { status: 'PENDING', acceptedDistanceMeters: 9_000 },
    { status: 'REVOKED', acceptedDistanceMeters: 4_000 },
  ]);
  assert.equal(total, 8_200);
});
