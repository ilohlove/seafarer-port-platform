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
