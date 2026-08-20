import type { AppearanceMode, BandwidthMode, Locale } from "../../types";
import type {
  Preferences,
  PreferencesPatch,
  PreferencesStore,
  RequestOptions,
} from "../contracts";
import { throwIfAborted } from "../request-utils";

const STORAGE_KEY = "seafarer.preferences.v1";

export const DEFAULT_PREFERENCES: Preferences = {
  locale: "vi",
  appearanceMode: "light",
  bandwidthMode: "standard",
  bandwidthModeWasUserSelected: false,
};

const validLocales = new Set<Locale>(["vi", "en"]);
const validAppearanceModes = new Set<AppearanceMode>([
  "light",
  "dark",
  "system",
]);
const validBandwidthModes = new Set<BandwidthMode>([
  "standard",
  "dataSaver",
  "ultraLite",
]);

function parsePreferences(serialized: string | null): Preferences {
  if (!serialized) {
    return DEFAULT_PREFERENCES;
  }

  try {
    const candidate = JSON.parse(serialized) as Partial<Preferences>;
    return {
      locale:
        candidate.locale && validLocales.has(candidate.locale)
          ? candidate.locale
          : DEFAULT_PREFERENCES.locale,
      appearanceMode:
        candidate.appearanceMode &&
        validAppearanceModes.has(candidate.appearanceMode)
          ? candidate.appearanceMode
          : DEFAULT_PREFERENCES.appearanceMode,
      bandwidthMode:
        candidate.bandwidthMode &&
        validBandwidthModes.has(candidate.bandwidthMode)
          ? candidate.bandwidthMode
          : DEFAULT_PREFERENCES.bandwidthMode,
      bandwidthModeWasUserSelected:
        typeof candidate.bandwidthModeWasUserSelected === "boolean"
          ? candidate.bandwidthModeWasUserSelected
          : DEFAULT_PREFERENCES.bandwidthModeWasUserSelected,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export class LocalStoragePreferencesStore implements PreferencesStore {
  constructor(private readonly storage: Storage) {}

  async get(options: RequestOptions = {}): Promise<Preferences> {
    throwIfAborted(options.signal);
    return parsePreferences(this.storage.getItem(STORAGE_KEY));
  }

  async update(
    patch: PreferencesPatch,
    options: RequestOptions = {},
  ): Promise<Preferences> {
    throwIfAborted(options.signal);
    const current = await this.get(options);
    const next = parsePreferences(JSON.stringify({ ...current, ...patch }));
    this.storage.setItem(STORAGE_KEY, JSON.stringify(next));
    throwIfAborted(options.signal);
    return next;
  }

  async clear(options: RequestOptions = {}): Promise<void> {
    throwIfAborted(options.signal);
    this.storage.removeItem(STORAGE_KEY);
  }
}
