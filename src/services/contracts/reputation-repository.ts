import type {
  ConfirmationResult,
  AdminXpLedgerPage,
  CorrectionQueueItem,
  CorrectionReviewAction,
  EvidencePurpose,
  ReputationActionInput,
  ReputationActionPreview,
  NoteCorrectionSubmission,
  VerifiedConfirmationSubmission,
  XpEventReadModel,
  XpHistoryFilter,
  XpHistoryPage,
  XpSummaryReadModel,
  XpSystemStatus,
  XpLaunchResult,
} from "../../types";
import type { RequestOptions } from "./request-context";

export interface ReputationRepository {
  isConfigured(): boolean;
  getMySummary(options?: RequestOptions): Promise<XpSummaryReadModel>;
  listMyEvents(filter: XpHistoryFilter, cursor?: string, options?: RequestOptions): Promise<XpHistoryPage>;
  getMyEvent(eventId: string, options?: RequestOptions): Promise<XpEventReadModel>;
  confirmNote(submission: VerifiedConfirmationSubmission): Promise<ConfirmationResult>;
  submitCorrection(submission: NoteCorrectionSubmission): Promise<void>;
  listCorrections(status?: "pending" | "accepted" | "rejected"): Promise<readonly CorrectionQueueItem[]>;
  reviewCorrection(action: CorrectionReviewAction): Promise<void>;
  listAdminLedger(userId?: string, cursor?: string): Promise<AdminXpLedgerPage>;
  getSystemStatus(): Promise<XpSystemStatus>;
  launchSystem(): Promise<XpLaunchResult>;
  previewReputationAction(input: Omit<ReputationActionInput, "reason" | "idempotencyKey">): Promise<ReputationActionPreview>;
  applyReputationAction(input: ReputationActionInput): Promise<void>;
  uploadEvidence(file: File, purpose: EvidencePurpose): Promise<string>;
  getEvidenceUrl(path: string): Promise<string>;
}
