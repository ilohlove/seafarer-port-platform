import type {
  CommunityRepository,
  ConnectivityRepository,
  OfflinePackStore,
  PlannerService,
  PortRepository,
  PreferencesStore,
} from "./contracts";
import { MockCommunityRepository } from "./mock/mock-community-repository";
import { MockConnectivityRepository } from "./mock/mock-connectivity-repository";
import { MockOfflinePackStore } from "./mock/mock-offline-pack-store";
import { MockPlannerService } from "./mock/mock-planner-service";
import { MockPortRepository } from "./mock/mock-port-repository";
import { LocalStoragePreferencesStore } from "./storage/local-storage-preferences-store";
import { resolveStorage } from "./storage/storage-utils";

export interface AppServices {
  readonly ports: PortRepository;
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
  const ports = new MockPortRepository(latencyMs);

  return {
    ports,
    planner: new MockPlannerService(),
    connectivity: new MockConnectivityRepository(latencyMs),
    community: new MockCommunityRepository(latencyMs),
    offlinePacks: new MockOfflinePackStore(),
    preferences: new LocalStoragePreferencesStore(storage),
  };
}
