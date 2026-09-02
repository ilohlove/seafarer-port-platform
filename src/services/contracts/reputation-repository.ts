import type {
  ConfirmationResult,
  AdminXpLedgerPage,
  CorrectionQueueItem,
  CorrectionReviewAction,
  HighlyUsefulReason,
  EvidencePurpose,
  ReputationActionInput,
  ReputationActionPreview,
  NoteCorrectionSubmission,
  VerifiedConfirmationSubmission,
  XpEventReadModel,
  XpHistoryFilter,
  XpHistoryPage,
  XpSummaryReadModel,
} from "../../types";
import type { RequestOptions } from "./request-context";

export interface ReputationRepository {
  isConfigured(): boolean;
  getMySummary(options?: RequestOptions): Promise<XpSummaryReadModel>;
  listMyEvents(filter: XpHistoryFilter, cursor?: string, options?: RequestOptions): Promise<XpHistoryPage>;
  getMyEvent(eventId: string, options?: RequestOptions): Promise<XpEventReadModel>;
  confirmNote(submission: VerifiedConfirmationSubmission): Promise<ConfirmationResult>;
  submitCorrection(submission: NoteCorrectionSubmission): Promise<void>;
  setHelpful(noteId: string, helpful: boolean): Promise<number>;
  listCorrections(status?: "pending" | "accepted" | "rejected"): Promise<readonly CorrectionQueueItem[]>;
  reviewCorrection(action: CorrectionReviewAction): Promise<void>;
  setHighlyUseful(noteId: string, enabled: boolean, reason: HighlyUsefulReason, note?: string): Promise<void>;
  listAdminLedger(userId?: string, cursor?: string): Promise<AdminXpLedgerPage>;
  previewReputationAction(input: Omit<ReputationActionInput, "reason" | "idempotencyKey">): Promise<ReputationActionPreview>;
  applyReputationAction(input: ReputationActionInput): Promise<void>;
  uploadEvidence(file: File, purpose: EvidencePurpose): Promise<string>;
  getEvidenceUrl(path: string): Promise<string>;
}
