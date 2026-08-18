import type { PlannerInput, PlannerResult } from "../../types";
import type { RequestOptions } from "./request-context";

export interface PlannerService {
  createPlan(
    input: PlannerInput,
    options?: RequestOptions,
  ): Promise<PlannerResult>;
}
