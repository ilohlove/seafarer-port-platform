import type { OfflinePortPack, PortHubReadModel } from "../../types";
import type { RequestOptions } from "./request-context";

export interface OfflinePackStore {
  list(options?: RequestOptions): Promise<readonly OfflinePortPack[]>;

  get(
    portId: string,
    options?: RequestOptions,
  ): Promise<OfflinePortPack | undefined>;

  readPort(
    portId: string,
    options?: RequestOptions,
  ): Promise<PortHubReadModel | undefined>;

  save(
    port: PortHubReadModel,
    options?: RequestOptions,
  ): Promise<OfflinePortPack>;

  remove(portId: string, options?: RequestOptions): Promise<void>;
}
