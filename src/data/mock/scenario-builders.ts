import type {
  KnowledgeBlock,
  KnowledgeSourceRef,
  MoneyObservation,
  Place,
  PlaceCategory,
  Review,
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
  walkingMinutes?: number,
  totalVisitMinutes?: number,
): Place {
  return {
    id,
    portId,
    terminalIds: [],
    name,
    category,
    address,
    ...(walkingMinutes === undefined ? {} : { walkingMinutes }),
    ...(totalVisitMinutes === undefined ? {} : { totalVisitMinutes }),
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
