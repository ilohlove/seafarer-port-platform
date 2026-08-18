import type { OfflinePortPack, PortHubReadModel } from "../../types";
import type { OfflinePackStore, RequestOptions } from "../contracts";
import { throwIfAborted } from "../request-utils";
import { MilestoneUnavailableError } from "../service-errors";

/** F1 supplies an empty state adapter; persistence behavior is deferred to F6. */
export class MockOfflinePackStore implements OfflinePackStore {
  async list(
    options: RequestOptions = {},
  ): Promise<readonly OfflinePortPack[]> {
    throwIfAborted(options.signal);
    return [];
  }

  async get(
    portId: string,
    options: RequestOptions = {},
  ): Promise<OfflinePortPack | undefined> {
    throwIfAborted(options.signal);
    void portId;
    return undefined;
  }

  async readPort(
    portId: string,
    options: RequestOptions = {},
  ): Promise<PortHubReadModel | undefined> {
    throwIfAborted(options.signal);
    void portId;
    return undefined;
  }

  save(
    port: PortHubReadModel,
    options: RequestOptions = {},
  ): Promise<OfflinePortPack> {
    throwIfAborted(options.signal);
    void port;
    return Promise.reject(
      new MilestoneUnavailableError("Milestone F6", "Offline Port Pack"),
    );
  }

  remove(portId: string, options: RequestOptions = {}): Promise<void> {
    throwIfAborted(options.signal);
    void portId;
    return Promise.reject(
      new MilestoneUnavailableError("Milestone F6", "Offline Port Pack"),
    );
  }
}
