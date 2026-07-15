export const V2_ROUTE_SCHEMA_VERSION = '2.0' as const;
export const V2_DISTANCE_POLICY = 'REAL_1_TO_1' as const;

export type RoutePackageStatus = 'DRAFT' | 'VERIFIED' | 'PUBLISHED' | 'ARCHIVED';
export type RouteScope = 'CHINA' | 'WORLD' | 'CUSTOM';
export type DistancePolicy = typeof V2_DISTANCE_POLICY | 'LEGACY_SCALED';

export interface RoutePlace {
  name: string;
  latitude: number;
  longitude: number;
}

export interface RouteNodeV2 extends RoutePlace {
  id: string;
  order: number;
  cumulativeDistanceMeters: number;
}

export interface RouteSegmentV2 {
  id: string;
  order: number;
  fromNodeId: string;
  toNodeId: string;
  distanceMeters: number;
  kind: 'ROAD' | 'FERRY';
  roadNames: string[];
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  sourceRefs: string[];
}

export interface RoutePackageProvenance {
  measurementMethod: string;
  sources: string[];
  auditedAt: string | null;
}

export interface RoutePackageV2 {
  schemaVersion: typeof V2_ROUTE_SCHEMA_VERSION;
  id: string;
  version: string;
  status: RoutePackageStatus;
  scope: RouteScope;
  distancePolicy: DistancePolicy;
  declaredDistanceMeters: number;
  startPlace: RoutePlace;
  endPlace: RoutePlace;
  nodes: RouteNodeV2[];
  segments: RouteSegmentV2[];
  provenance: RoutePackageProvenance;
}

export interface RouteValidationIssue {
  code: string;
  path: string;
  message: string;
}

export interface RouteValidationResult {
  valid: boolean;
  issues: RouteValidationIssue[];
}
