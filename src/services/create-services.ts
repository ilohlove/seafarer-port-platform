import type {
  AuthRepository,
  CommunityRepository,
  ConnectivityRepository,
  OfflinePackStore,
  PlannerService,
  PortMediaRepository,
  PortRepository,
  PortNotesRepository,
  PreferencesStore,
  ReputationRepository,
} from "./contracts";
import { hasSupabaseConfig } from "./supabase/supabase-client";
import {
  SupabaseAuthRepository,
  UnavailableAuthRepository,
} from "./supabase/supabase-auth-repository";
import {
  SupabasePortNotesRepository,
  UnavailablePortNotesRepository,
} from "./supabase/supabase-port-notes-repository";
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
import { SupabaseReputationRepository, UnavailableReputationRepository } from "./supabase/supabase-reputation-repository";

export interface AppServices {
  readonly ports: PortRepository;
  readonly portMedia: PortMediaRepository;
  readonly planner: PlannerService;
  readonly connectivity: ConnectivityRepository;
  readonly community: CommunityRepository;
  readonly auth: AuthRepository;
  readonly portNotes: PortNotesRepository;
  readonly reputation: ReputationRepository;
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
  const auth: AuthRepository = hasSupabaseConfig()
    ? new SupabaseAuthRepository()
    : new UnavailableAuthRepository();
  const portNotes: PortNotesRepository = hasSupabaseConfig()
    ? new SupabasePortNotesRepository()
    : new UnavailablePortNotesRepository();
  const reputation: ReputationRepository = hasSupabaseConfig()
    ? new SupabaseReputationRepository()
    : new UnavailableReputationRepository();

  return {
    ports,
    portMedia,
    planner: new MockPlannerService(),
    connectivity: new MockConnectivityRepository(latencyMs),
    community: new MockCommunityRepository(latencyMs),
    auth,
    portNotes,
    reputation,
    offlinePacks: new MockOfflinePackStore(),
    preferences: new LocalStoragePreferencesStore(storage),
  };
}
