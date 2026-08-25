import type {
  AccuracyAnswer,
  ModerationAction,
  ModerationQueueQuery,
  PortNotePage,
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
  listModerationQueue(
    query: ModerationQueueQuery,
  ): Promise<readonly PortNoteRecord[]>;
  moderateNote(action: ModerationAction): Promise<void>;
  getProfile(options?: RequestOptions): Promise<ProfileReadModel>;
}
