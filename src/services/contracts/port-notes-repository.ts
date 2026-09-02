import type {
  AccuracyAnswer,
  ModerationAction,
  ModerationQueueQuery,
  PortNotePage,
  NoteFeedbackPage,
  NoteFeedbackRecord,
  NoteFeedbackState,
  PortNoteQuery,
  PortNoteRecord,
  PortNoteSubmission,
  PortNoteSummary,
  ProfileReadModel,
} from "../../types";
import type { RequestOptions } from "./request-context";

export interface PortNotesRepository {
  isConfigured(): boolean;
  getSummary(
    portKey: string,
    contextKey?: string,
    options?: RequestOptions,
  ): Promise<PortNoteSummary>;
  listTopicNotes(query: PortNoteQuery): Promise<PortNotePage>;
  listMyNotes(
    portKey: string,
    contextKey?: string,
    options?: RequestOptions,
  ): Promise<readonly PortNoteRecord[]>;
  listAllMyNotes(options?: RequestOptions): Promise<readonly PortNoteRecord[]>;
  submitNote(submission: PortNoteSubmission): Promise<PortNoteRecord>;
  assessAccuracy(noteId: string, answer: AccuracyAnswer): Promise<void>;
  listFeedback(noteId: string, cursor?: string, limit?: number, options?: RequestOptions): Promise<NoteFeedbackPage>;
  getFeedback(feedbackId: string, options?: RequestOptions): Promise<NoteFeedbackRecord>;
  submitFeedback(noteId: string, body: string, idempotencyKey: string): Promise<NoteFeedbackRecord>;
  updateFeedback(feedbackId: string, body: string): Promise<NoteFeedbackRecord>;
  deleteFeedback(feedbackId: string): Promise<void>;
  listFeedbackModerationQueue(state?: NoteFeedbackState): Promise<readonly NoteFeedbackRecord[]>;
  moderateFeedback(feedbackId: string, decision: Exclude<NoteFeedbackState, "pending">, reason?: string): Promise<void>;
  listModerationQueue(
    query: ModerationQueueQuery,
  ): Promise<readonly PortNoteRecord[]>;
  moderateNote(action: ModerationAction): Promise<void>;
  getProfile(options?: RequestOptions): Promise<ProfileReadModel>;
}
