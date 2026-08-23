import type { PortHubReadModel } from "../../types";
export type {
  PortSearchHit,
  PortSearchMatch,
  PortSearchMatchContext,
  PortSearchMatchKind,
  PortSearchResult,
} from "../../types";
import type { RequestOptions } from "./request-context";

export interface PortSearchRequest {
  readonly query: string;
  readonly limit?: number;
}

import type { PortSearchResult } from "../../types";

export interface PortHubRequest {
  readonly portSlug: string;
  readonly terminalSlug?: string;
}

export interface PortRepository {
  search(
    request: PortSearchRequest,
    options?: RequestOptions,
  ): Promise<PortSearchResult>;

  getPortHub(
    request: PortHubRequest,
    options?: RequestOptions,
  ): Promise<PortHubReadModel | undefined>;

  getPortHubById(
    portId: string,
    terminalId?: string,
    options?: RequestOptions,
  ): Promise<PortHubReadModel | undefined>;
}
