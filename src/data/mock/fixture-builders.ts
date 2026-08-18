import type {
  KnowledgeMeta,
  KnowledgeSourceRef,
  ModerationStatus,
  TrustEvidence,
} from "../../types";

export const officialSource = {
  id: "source-port-authority",
  name: "Port authority sample feed",
  kind: "official",
} as const satisfies KnowledgeSourceRef;

export const communitySource = {
  id: "source-seafarer-community",
  name: "Seafarer community sample",
  kind: "community",
} as const satisfies KnowledgeSourceRef;

export const seedSource = {
  id: "source-prototype-seed",
  name: "Prototype seed data",
  kind: "seed",
} as const satisfies KnowledgeSourceRef;

export const officialTrust = {
  basis: "official",
  conflictState: "none",
  confirmationCount: 0,
} as const satisfies TrustEvidence;

export const communityConfirmedTrust = {
  basis: "community",
  conflictState: "none",
  confirmationCount: 8,
} as const satisfies TrustEvidence;

export const needsConfirmationTrust = {
  basis: "community",
  conflictState: "none",
  confirmationCount: 1,
} as const satisfies TrustEvidence;

export const conflictingTrust = {
  basis: "community",
  conflictState: "conflicting",
  confirmationCount: 5,
} as const satisfies TrustEvidence;

export const unknownTrust = {
  basis: "unverified",
  conflictState: "none",
  confirmationCount: 0,
} as const satisfies TrustEvidence;

interface MetaOptions {
  readonly source?: KnowledgeSourceRef;
  readonly moderationStatus?: ModerationStatus;
  readonly validFrom?: string;
  readonly validTo?: string;
  readonly version?: string;
  readonly scopeKind?: KnowledgeMeta["scope"]["kind"];
}

export function createKnowledgeMeta(
  referenceId: string,
  trust: TrustEvidence,
  options: MetaOptions = {},
): KnowledgeMeta {
  const inferredSource =
    trust.basis === "official"
      ? officialSource
      : trust.basis === "community"
        ? communitySource
        : seedSource;
  const moderationStatus =
    options.moderationStatus ??
    (trust.conflictState === "conflicting" || trust.basis === "unverified"
      ? "needsReview"
      : "published");

  return {
    source: options.source ?? inferredSource,
    scope: {
      kind: options.scopeKind ?? "port",
      referenceId,
    },
    version: options.version ?? "prototype-1",
    validFrom: options.validFrom ?? "2026-07-01",
    ...(options.validTo ? { validTo: options.validTo } : {}),
    trustBasis: trust.basis,
    moderationStatus,
    confirmationCount: trust.confirmationCount,
    conflictState: trust.conflictState,
    auditHistory: [
      {
        at: "2026-07-01T00:00:00Z",
        action: "prototype-seed-created",
        actorType: "system",
      },
    ],
  };
}
