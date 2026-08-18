export type IsoDate = string;
export type IsoDateTime = string;

export type KnowledgeScopeKind =
  | "global"
  | "country"
  | "port"
  | "terminal"
  | "gate"
  | "place";

export interface KnowledgeScope {
  readonly kind: KnowledgeScopeKind;
  readonly referenceId?: string;
  readonly label?: string;
}

export type KnowledgeSourceKind =
  | "official"
  | "community"
  | "moderator"
  | "partner"
  | "seed";

export interface KnowledgeSourceRef {
  readonly id: string;
  readonly name: string;
  readonly kind: KnowledgeSourceKind;
  readonly url?: string;
}

export type TrustBasis = "official" | "community" | "unverified";
export type ConflictState = "none" | "conflicting" | "resolved";

/**
 * Raw evidence is intentionally separate from the display label. This keeps
 * presentation wording out of stored knowledge and makes the mapping auditable.
 */
export interface TrustEvidence {
  readonly basis: TrustBasis;
  readonly conflictState: ConflictState;
  readonly confirmationCount: number;
}

export type TrustDisplayStatus =
  | "officialSource"
  | "communityConfirmed"
  | "needsConfirmation"
  | "conflictingReports"
  | "unknown";

export type TrustReasonCode =
  | "conflicting-reports-take-priority"
  | "official-source"
  | "community-confirmation-threshold-met"
  | "community-confirmation-threshold-not-met"
  | "unverified-evidence-present"
  | "no-verifiable-evidence";

export interface TrustAssessment {
  readonly status: TrustDisplayStatus;
  readonly reasonCode: TrustReasonCode;
}

export const MIN_COMMUNITY_CONFIRMATIONS = 2;

export function assessTrustEvidence(evidence: TrustEvidence): TrustAssessment {
  if (evidence.conflictState === "conflicting") {
    return {
      status: "conflictingReports",
      reasonCode: "conflicting-reports-take-priority",
    };
  }

  if (evidence.basis === "official") {
    return { status: "officialSource", reasonCode: "official-source" };
  }

  if (evidence.basis === "community") {
    return evidence.confirmationCount >= MIN_COMMUNITY_CONFIRMATIONS
      ? {
          status: "communityConfirmed",
          reasonCode: "community-confirmation-threshold-met",
        }
      : {
          status: "needsConfirmation",
          reasonCode: "community-confirmation-threshold-not-met",
        };
  }

  if (evidence.confirmationCount > 0) {
    return {
      status: "needsConfirmation",
      reasonCode: "unverified-evidence-present",
    };
  }

  return { status: "unknown", reasonCode: "no-verifiable-evidence" };
}

export function deriveTrustDisplayStatus(
  evidence: TrustEvidence,
): TrustDisplayStatus {
  return assessTrustEvidence(evidence).status;
}

export type ModerationStatus =
  | "draft"
  | "submitted"
  | "automatedCheck"
  | "aiNormalized"
  | "pendingModeration"
  | "verified"
  | "published"
  | "needsReview"
  | "archived";

export interface KnowledgeAuditEntry {
  readonly at: IsoDateTime;
  readonly action: string;
  readonly actorType: "system" | "moderator" | "contributor";
}

export interface KnowledgeMeta {
  readonly source: KnowledgeSourceRef;
  readonly scope: KnowledgeScope;
  readonly version: string;
  readonly validFrom: IsoDate;
  readonly validTo?: IsoDate;
  readonly trustBasis: TrustBasis;
  readonly moderationStatus: ModerationStatus;
  readonly confirmationCount: number;
  readonly conflictState: ConflictState;
  readonly auditHistory: readonly KnowledgeAuditEntry[];
}

export interface MoneyObservation {
  readonly amount: number;
  readonly currency: string;
  readonly observedAt: IsoDateTime;
  readonly source: KnowledgeSourceRef;
}
