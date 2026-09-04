import type { StaffRoleTitle, UserRankReadModel } from "./user-rank";
import type { UserAchievementReadModel } from "./reputation";

export type SessionStatus =
  | "loading"
  | "anonymous"
  | "authenticated"
  | "unavailable";

export type UserRole = "member" | "moderator" | "admin";

export type PortNoteTopic =
  | "esim"
  | "physicalSim"
  | "shoreLeave"
  | "food"
  | "shopping"
  | "welfare"
  | "general";

export type PortNoteVisibility = "public" | "private";

export type PortNoteModerationState =
  | "notRequired"
  | "pending"
  | "approved"
  | "rejected"
  | "quarantined";

export type PortNoteAccuracyState =
  | "needsConfirmation"
  | "communityConfirmed"
  | "needsReview";

export type AccuracyAnswer = "stillCorrect" | "changed" | "notSure";

export interface ProfileReadModel {
  readonly userId: string;
  readonly email: string;
  readonly fullName: string;
  readonly nickname?: string;
  readonly avatarUrl?: string;
  readonly role: UserRole;
  readonly rank?: UserRankReadModel;
  readonly achievements?: readonly UserAchievementReadModel[];
}

export interface PortNoteRecord {
  readonly id: string;
  readonly portKey: string;
  readonly contextKey?: string;
  readonly topic: PortNoteTopic;
  readonly visibility: PortNoteVisibility;
  readonly moderationState: PortNoteModerationState;
  readonly summary: string;
  readonly details: Readonly<Record<string, string>>;
  readonly contact?: string;
  readonly contactIsPublicBusiness: boolean;
  readonly publicAlias: string;
  readonly authorRank?: UserRankReadModel;
  readonly authorStaffTitle?: StaffRoleTitle;
  readonly feedbackCount: number;
  readonly feedbackChangeAlert?: {
    readonly feedbackId: string;
  };
  readonly highlyUseful?: boolean;
  readonly updatedAt?: string;
  readonly lastVerifiedAt?: string;
  readonly createdAt: string;
  readonly authorId?: string;
  readonly accuracy: {
    readonly state: PortNoteAccuracyState;
    readonly stillCorrect: number;
    readonly changed: number;
    readonly notSure: number;
    readonly viewerAnswer?: AccuracyAnswer;
  };
}

export type NoteFeedbackState = "pending" | "approved" | "rejected";

export interface NoteFeedbackRecord {
  readonly id: string;
  readonly noteId: string;
  readonly body: string;
  readonly status: NoteFeedbackState;
  readonly publicAlias: string;
  readonly authorRank?: UserRankReadModel;
  readonly authorStaffTitle?: StaffRoleTitle;
  readonly authorId?: string;
  readonly usedForCorrection: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly noteSummary?: string;
  readonly portKey?: string;
  readonly moderationReason?: string;
}

export interface NoteFeedbackPage {
  readonly items: readonly NoteFeedbackRecord[];
  readonly nextCursor?: string;
}

export type FeedbackModerationPriority = "P0" | "P1" | "P2";
export type FeedbackModerationSort = "oldest" | "newest";
export type FeedbackModerationRiskSignal = "veryShort";

export interface FeedbackModerationQueueQuery {
  readonly state?: NoteFeedbackState;
  readonly portKey?: string;
  readonly topic?: PortNoteTopic;
  readonly priority?: FeedbackModerationPriority;
  readonly sort?: FeedbackModerationSort;
  readonly cursor?: string;
  readonly limit?: number;
  readonly signal?: AbortSignal;
}

export interface FeedbackModerationItem extends NoteFeedbackRecord {
  readonly noteSummary: string;
  readonly portKey: string;
  readonly noteContextKey?: string;
  readonly noteTopic: PortNoteTopic;
  readonly noteTrustState: PortNoteAccuracyState;
  readonly priority: FeedbackModerationPriority;
  readonly riskSignals: readonly FeedbackModerationRiskSignal[];
}

export interface FeedbackModerationPage {
  readonly items: readonly FeedbackModerationItem[];
  readonly nextCursor?: string;
}

export interface FeedbackModerationContext {
  readonly note: PortNoteRecord;
  readonly feedback: readonly NoteFeedbackRecord[];
}

export interface PortNotePage {
  readonly items: readonly PortNoteRecord[];
  readonly nextCursor?: string;
}

export interface PortNoteTopicSummary {
  readonly topic: PortNoteTopic;
  readonly approvedCount: number;
  readonly pendingForViewerCount: number;
}

export interface PortNoteSummary {
  readonly communityCount: number;
  readonly topics: readonly PortNoteTopicSummary[];
}

export interface PortNoteQuery {
  readonly portKey: string;
  readonly contextKey?: string;
  readonly topic: PortNoteTopic;
  readonly cursor?: string;
  readonly limit?: number;
  readonly signal?: AbortSignal;
}

export interface PortNoteSubmission {
  readonly portKey: string;
  readonly contextKey?: string;
  readonly topic: PortNoteTopic;
  readonly visibility: PortNoteVisibility;
  readonly takeaway: string;
  readonly details: Readonly<Record<string, string>>;
  readonly contact?: string;
  readonly contactIsPublicBusiness: boolean;
  readonly idempotencyKey: string;
}

export interface ModerationQueueQuery {
  readonly state?: PortNoteModerationState;
  readonly portKey?: string;
  readonly topic?: PortNoteTopic;
  readonly signal?: AbortSignal;
}

export interface ModerationAction {
  readonly noteId: string;
  readonly nextState: Exclude<PortNoteModerationState, "notRequired" | "pending">;
  readonly reason?: string;
  readonly idempotencyKey: string;
}
