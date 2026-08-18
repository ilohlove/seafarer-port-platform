import type { PlannerInput, PlannerResult } from "../../types";
import type { PlannerService, RequestOptions } from "../contracts";
import { throwIfAborted } from "../request-utils";
import { MilestoneUnavailableError } from "../service-errors";

/** F1 exposes the contract only; calculation rules belong to the F4 review gate. */
export class MockPlannerService implements PlannerService {
  async createPlan(
    input: PlannerInput,
    options: RequestOptions = {},
  ): Promise<PlannerResult> {
    throwIfAborted(options.signal);
    void input;
    throw new MilestoneUnavailableError("Milestone F4", "Shore Planner");
  }
}
