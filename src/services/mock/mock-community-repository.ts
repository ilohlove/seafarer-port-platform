import type { PortHubReadModel, Review } from "../../types";
import type {
  CommunityRepository,
  ContributionReceipt,
  QuickConfirmationSubmission,
  RequestContext,
  RequestOptions,
  ReviewSubmission,
  UpdateSuggestionSubmission,
  WrongInformationReport,
} from "../contracts";
import { delay, throwIfAborted, withAbort } from "../request-utils";
import { MilestoneUnavailableError } from "../service-errors";

let scenariosPromise: Promise<readonly PortHubReadModel[]> | undefined;

function loadScenarios(): Promise<readonly PortHubReadModel[]> {
  scenariosPromise ??= import("../../data/mock/port-scenarios")
    .then(({ mockPortScenarios }) => mockPortScenarios)
    .catch((error: unknown) => {
      scenariosPromise = undefined;
      throw error;
    });
  return scenariosPromise;
}

function deferredWrite(
  payload:
    | ReviewSubmission
    | QuickConfirmationSubmission
    | UpdateSuggestionSubmission
    | WrongInformationReport,
  context: RequestContext,
): Promise<ContributionReceipt> {
  throwIfAborted(context.signal);
  void payload;
  return Promise.reject(
    new MilestoneUnavailableError("Milestone F6", "Community contribution"),
  );
}

export class MockCommunityRepository implements CommunityRepository {
  constructor(private readonly latencyMs = 80) {}

  async listApprovedReviews(
    subjectId: string,
    options: RequestOptions = {},
  ): Promise<readonly Review[]> {
    const scenarios = await withAbort(
      Promise.all([delay(this.latencyMs), loadScenarios()]).then(
        ([, loadedScenarios]) => loadedScenarios,
      ),
      options.signal,
    );
    return scenarios
      .flatMap((port) => port.community.reviews)
      .filter(
        (candidate) =>
          candidate.subjectId === subjectId &&
          candidate.moderationState === "approved",
      );
  }

  submitReview(
    submission: ReviewSubmission,
    context: RequestContext,
  ): Promise<ContributionReceipt> {
    return deferredWrite(submission, context);
  }

  submitConfirmation(
    submission: QuickConfirmationSubmission,
    context: RequestContext,
  ): Promise<ContributionReceipt> {
    return deferredWrite(submission, context);
  }

  suggestUpdate(
    submission: UpdateSuggestionSubmission,
    context: RequestContext,
  ): Promise<ContributionReceipt> {
    return deferredWrite(submission, context);
  }

  reportWrongInformation(
    report: WrongInformationReport,
    context: RequestContext,
  ): Promise<ContributionReceipt> {
    return deferredWrite(report, context);
  }
}
