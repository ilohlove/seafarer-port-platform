import type { PortHeroMediaReadModel } from "../../types";
import type { RequestOptions } from "./request-context";

export interface PortHeroMediaRequest {
  readonly portId: string;
  readonly portSlug: string;
  readonly portUnLocode?: string;
  readonly contextSlug?: string;
}

export interface PortMediaRepository {
  getHero(
    request: PortHeroMediaRequest,
    options?: RequestOptions,
  ): Promise<PortHeroMediaReadModel | undefined>;
}
