export type MemberStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISABLED';
export type ContributionStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REVOKED';

export interface ContributionDecisionInput {
  memberStatus: MemberStatus;
  verificationStatus: string;
  distanceMeters: number;
}

export interface ContributionDecision {
  status: ContributionStatus;
  acceptedDistanceMeters: number;
  decisionReason: string;
}

export interface ContributionRow {
  status: ContributionStatus;
  acceptedDistanceMeters: number;
}

function validDistanceMeters(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

export function decideContribution(input: ContributionDecisionInput): ContributionDecision {
  const distanceMeters = validDistanceMeters(input.distanceMeters);
  if (distanceMeters === null) {
    return { status: 'REJECTED', acceptedDistanceMeters: 0, decisionReason: 'INVALID_DISTANCE' };
  }
  if (input.memberStatus !== 'APPROVED') {
    return { status: 'REJECTED', acceptedDistanceMeters: 0, decisionReason: 'MEMBER_NOT_APPROVED' };
  }
  if (input.verificationStatus === 'suspected_duplicate') {
    return { status: 'REJECTED', acceptedDistanceMeters: 0, decisionReason: 'SUSPECTED_DUPLICATE' };
  }
  if (input.verificationStatus === 'invalid') {
    return { status: 'REJECTED', acceptedDistanceMeters: 0, decisionReason: 'INVALID_ACTIVITY' };
  }
  if (input.verificationStatus === 'manual_unverified') {
    return { status: 'PENDING', acceptedDistanceMeters: 0, decisionReason: 'MANUAL_REVIEW_REQUIRED' };
  }
  if (input.verificationStatus === 'verified_device' || input.verificationStatus === 'verified_platform') {
    return { status: 'ACCEPTED', acceptedDistanceMeters: distanceMeters, decisionReason: 'AUTO_VERIFIED' };
  }
  return { status: 'PENDING', acceptedDistanceMeters: 0, decisionReason: 'UNRECOGNIZED_SOURCE_REVIEW_REQUIRED' };
}

export function sumAcceptedContributions(rows: ContributionRow[]): number {
  return rows.reduce((sum, row) => {
    if (row.status !== 'ACCEPTED') return sum;
    const distanceMeters = validDistanceMeters(row.acceptedDistanceMeters);
    return sum + (distanceMeters ?? 0);
  }, 0);
}
