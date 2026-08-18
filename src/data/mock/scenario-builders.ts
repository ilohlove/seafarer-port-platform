import type {
  KnowledgeBlock,
  KnowledgeSourceRef,
  MoneyObservation,
  Place,
  PlaceCategory,
  Review,
  TerminalPlaceAccess,
  TransportMode,
  TrustEvidence,
} from "../../types";
import {
  communitySource,
  createKnowledgeMeta,
  seedSource,
} from "./fixture-builders";

export function block(
  portId: string,
  id: string,
  label: string,
  summary: string,
  details: readonly string[],
  trust: TrustEvidence,
  source: KnowledgeSourceRef = seedSource,
): KnowledgeBlock {
  return {
    id,
    label,
    summary,
    details,
    meta: createKnowledgeMeta(portId, trust, { source }),
  };
}

export function place(
  portId: string,
  id: string,
  name: string,
  category: PlaceCategory,
  address: string,
  trust: TrustEvidence,
  attributes: readonly string[],
): Place {
  return {
    id,
    portId,
    name,
    category,
    address,
    operationalStatus: "open",
    paymentMethods: ["cash", "international-card"],
    attributes,
    trust,
  };
}

export function money(amount: number, currency: string): MoneyObservation {
  return {
    amount,
    currency,
    observedAt: "2026-07-01T00:00:00Z",
    source: communitySource,
  };
}

interface TerminalAccessOptions {
  readonly gateName?: string;
  readonly walkingDistanceM?: number;
  readonly walkingDurationMin?: number;
  readonly drivingDurationMin?: number;
  readonly taxiFareMin?: MoneyObservation;
  readonly taxiFareMax?: MoneyObservation;
  readonly walkingAllowed?: boolean;
  readonly walkingSafe?: boolean;
  readonly pickupPoint?: string;
  readonly dropoffPoint?: string;
  readonly routeWarning?: string;
  readonly minimumRecommendedShoreLeaveMin?: number;
}

export function terminalAccess(
  id: string,
  terminalId: string,
  placeId: string,
  recommendedTransport: TransportMode,
  trust: TrustEvidence,
  options: TerminalAccessOptions = {},
): TerminalPlaceAccess {
  return {
    id,
    terminalId,
    placeId,
    recommendedTransport,
    walkingAllowed: options.walkingAllowed ?? recommendedTransport === "walk",
    walkingSafe: options.walkingSafe ?? recommendedTransport === "walk",
    trust,
    ...(options.gateName ? { gateName: options.gateName } : {}),
    ...(options.walkingDistanceM === undefined
      ? {}
      : { walkingDistanceM: options.walkingDistanceM }),
    ...(options.walkingDurationMin === undefined
      ? {}
      : { walkingDurationMin: options.walkingDurationMin }),
    ...(options.drivingDurationMin === undefined
      ? {}
      : { drivingDurationMin: options.drivingDurationMin }),
    ...(options.taxiFareMin ? { estimatedTaxiFareMin: options.taxiFareMin } : {}),
    ...(options.taxiFareMax ? { estimatedTaxiFareMax: options.taxiFareMax } : {}),
    ...(options.pickupPoint ? { pickupPoint: options.pickupPoint } : {}),
    ...(options.dropoffPoint ? { dropoffPoint: options.dropoffPoint } : {}),
    ...(options.routeWarning ? { routeWarning: options.routeWarning } : {}),
    ...(options.minimumRecommendedShoreLeaveMin === undefined
      ? {}
      : { minimumRecommendedShoreLeaveMin: options.minimumRecommendedShoreLeaveMin }),
  };
}

export function review(
  id: string,
  subjectId: string,
  publicAlias: string,
  summary: string,
  tags: readonly string[],
  trust: TrustEvidence,
): Review {
  return {
    id,
    subjectType: "port",
    subjectId,
    publicAlias,
    tags,
    summary,
    createdAt: "2026-06-20T08:00:00Z",
    moderationState: "approved",
    trust,
  };
}
