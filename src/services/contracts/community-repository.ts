import type {
  PublishedPortNoteReadModel,
  Review,
} from "../../types";
import type { RequestContext, RequestOptions } from "./request-context";

export interface ReviewSubmission {
  readonly subjectType: Review["subjectType"];
  readonly subjectId: string;
  readonly visitDate?: string;
  readonly tags: readonly string[];
  readonly summary: string;
  readonly publicAlias: string;
}

export interface QuickConfirmationSubmission {
  readonly knowledgeItemId: string;
  readonly answer: "stillCorrect" | "changed" | "notSure";
}

export interface UpdateSuggestionSubmission {
  readonly knowledgeItemId: string;
  readonly proposedValue: string;
  readonly explanation?: string;
}

export interface WrongInformationReport {
  readonly subjectType: "port" | "terminal" | "place" | "knowledgeItem";
  readonly subjectId: string;
  readonly reason: "outdated" | "incorrect" | "unsafe" | "duplicate" | "other";
  readonly details?: string;
}

export interface ContributionReceipt {
  readonly submissionId: string;
  readonly status: "pendingModeration" | "duplicate";
  readonly receivedAt: string;
}

export interface CommunityRepository {
  listPublishedPortNotes(
    options?: RequestOptions,
  ): Promise<readonly PublishedPortNoteReadModel[]>;

  listApprovedReviews(
    subjectId: string,
    options?: RequestOptions,
  ): Promise<readonly Review[]>;

  submitReview(
    submission: ReviewSubmission,
    context: RequestContext,
  ): Promise<ContributionReceipt>;

  submitConfirmation(
    submission: QuickConfirmationSubmission,
    context: RequestContext,
  ): Promise<ContributionReceipt>;

  suggestUpdate(
    submission: UpdateSuggestionSubmission,
    context: RequestContext,
  ): Promise<ContributionReceipt>;

  reportWrongInformation(
    report: WrongInformationReport,
    context: RequestContext,
  ): Promise<ContributionReceipt>;
}
