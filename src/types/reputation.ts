import type { UserRankReadModel } from "./user-rank";

export type XpEventType =
  | "approved_note" | "backfill_approved_note"
  | "community_confirmed" | "backfill_community_confirmed"
  | "accepted_correction" | "verified_confirmation"
  | "highly_useful" | "highly_useful_reversed"
  | "invalid_reward_reversed" | "spam_penalty"
  | "false_information_penalty" | "confirmation_farming_penalty"
  | "coordinated_farming_penalty" | "serious_fraud_penalty"
  | "administrative_correction";

export type XpHistoryFilter = "all" | "earned" | "adjusted";

export interface XpRuleReadModel {
  readonly eventType: "approved_note" | "community_confirmed" | "accepted_correction" | "verified_confirmation" | "highly_useful";
  readonly amount: number;
  readonly rewardedLimit?: number;
  readonly windowHours?: number;
}

export interface XpEventReadModel {
  readonly id: string;
  readonly eventType: XpEventType;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly amount: number;
  readonly reasonCode?: string;
  readonly reasonText?: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
}

export interface XpSummaryReadModel {
  readonly rank: UserRankReadModel;
  readonly recent: readonly XpEventReadModel[];
  readonly rules: readonly XpRuleReadModel[];
}

export interface XpHistoryPage {
  readonly items: readonly XpEventReadModel[];
  readonly nextCursor?: string;
}

export type ConfirmationSource = "direct" | "companion" | "reference";
export type VerificationPeriod = "today" | "last7Days" | "last30Days" | "oneToThreeMonths" | "older";

export interface VerifiedConfirmationSubmission {
  readonly noteId: string;
  readonly source: ConfirmationSource;
  readonly verificationPeriod: VerificationPeriod;
  readonly comment?: string;
  readonly evidencePath?: string;
  readonly idempotencyKey: string;
}

export interface ConfirmationResult {
  readonly rewardedXp: number;
  readonly communityConfirmationCount: number;
}

export type CorrectionAction = "UPDATE" | "ADD" | "INVALIDATE";
export type CorrectionFieldType = "price" | "location" | "hours" | "contact" | "service" | "operatingStatus" | "other";

export interface NoteCorrectionSubmission {
  readonly noteId: string;
  readonly action: CorrectionAction;
  readonly fieldType: CorrectionFieldType;
  readonly currentInformation: string;
  readonly proposedInformation: string;
  readonly verificationPeriod: VerificationPeriod;
  readonly note?: string;
  readonly evidencePath?: string;
  readonly idempotencyKey: string;
}

export type EvidencePurpose = "confirmation" | "correction";

export interface UserAchievementReadModel {
  readonly key: "FOUNDING_CONTRIBUTOR";
  readonly earnedAt: string;
}

export interface CorrectionQueueItem {
  readonly id: string;
  readonly noteId: string;
  readonly action: CorrectionAction;
  readonly fieldType: CorrectionFieldType;
  readonly currentInformation: string;
  readonly proposedInformation: string;
  readonly verificationPeriod: VerificationPeriod;
  readonly note?: string;
  readonly evidencePath?: string;
  readonly status: "pending" | "accepted" | "rejected";
  readonly impact?: "minor" | "material";
  readonly createdAt: string;
  readonly noteSummary: string;
  readonly portKey: string;
  readonly submitterAlias: string;
}

export interface CorrectionReviewAction {
  readonly correctionId: string;
  readonly decision: "accepted" | "rejected";
  readonly impact?: "minor" | "material";
  readonly reason?: string;
  readonly idempotencyKey: string;
}

export type HighlyUsefulReason = "detailed" | "missingData" | "practicalValue" | "actionable" | "other";

export interface AdminXpLedgerEntry extends XpEventReadModel {
  readonly userId: string;
  readonly userLabel: string;
  readonly currentXp: number;
}

export interface AdminXpLedgerPage {
  readonly items: readonly AdminXpLedgerEntry[];
  readonly nextCursor?: string;
}

export type ReputationActionType = "invalid_contribution" | "spam" | "false_information" | "confirmation_farming" | "coordinated_farming" | "serious_fraud";

export interface ReputationActionInput {
  readonly userId: string;
  readonly action: ReputationActionType;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly reason: string;
  readonly idempotencyKey: string;
}

export interface ReputationActionPreview {
  readonly currentXp: number;
  readonly reversalXp: number;
  readonly penaltyXp: number;
  readonly afterXp: number;
}
