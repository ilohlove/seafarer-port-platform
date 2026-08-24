import type {
  CommunityRepository,
  ConnectivityRepository,
  OfflinePackStore,
  PlannerService,
  PortMediaRepository,
  PortRepository,
  PreferencesStore,
} from "./contracts";
import { MockCommunityRepository } from "./mock/mock-community-repository";
import { MockConnectivityRepository } from "./mock/mock-connectivity-repository";
import { MockOfflinePackStore } from "./mock/mock-offline-pack-store";
import { MockPlannerService } from "./mock/mock-planner-service";
import { MockPortMediaRepository } from "./mock/mock-port-media-repository";
import { MockPortRepository } from "./mock/mock-port-repository";
import { StaticPortDirectoryRepository } from "./static/static-port-directory-repository";
import { StaticPortMediaRepository } from "./static/static-port-media-repository";
import { LocalStoragePreferencesStore } from "./storage/local-storage-preferences-store";
import { resolveStorage } from "./storage/storage-utils";

export interface AppServices {
  readonly ports: PortRepository;
  readonly portMedia: PortMediaRepository;
  readonly planner: PlannerService;
  readonly connectivity: ConnectivityRepository;
  readonly community: CommunityRepository;
  readonly offlinePacks: OfflinePackStore;
  readonly preferences: PreferencesStore;
}

export interface CreateServicesOptions {
  readonly storage?: Storage;
  readonly mockLatencyMs?: number;
}

export function createServices(
  options: CreateServicesOptions = {},
): AppServices {
  const storage = resolveStorage(options.storage);
  const latencyMs = options.mockLatencyMs ?? 80;
  const mockPorts = new MockPortRepository(latencyMs);
  const ports =
    import.meta.env.MODE === "test"
      ? mockPorts
      : new StaticPortDirectoryRepository(mockPorts);
  const portMedia =
    import.meta.env.MODE === "test"
      ? new MockPortMediaRepository()
      : new StaticPortMediaRepository();

  return {
    ports,
    portMedia,
    planner: new MockPlannerService(),
    connectivity: new MockConnectivityRepository(latencyMs),
    community: new MockCommunityRepository(latencyMs),
    offlinePacks: new MockOfflinePackStore(),
    preferences: new LocalStoragePreferencesStore(storage),
  };
}
