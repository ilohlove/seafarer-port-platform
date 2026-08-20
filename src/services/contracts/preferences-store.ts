import type { AppearanceMode, BandwidthMode, Locale } from "../../types";
import type { RequestOptions } from "./request-context";

export interface Preferences {
  readonly locale: Locale;
  readonly appearanceMode: AppearanceMode;
  readonly bandwidthMode: BandwidthMode;
  readonly bandwidthModeWasUserSelected: boolean;
}

export type PreferencesPatch = Partial<Preferences>;

export interface PreferencesStore {
  get(options?: RequestOptions): Promise<Preferences>;

  update(
    patch: PreferencesPatch,
    options?: RequestOptions,
  ): Promise<Preferences>;

  clear(options?: RequestOptions): Promise<void>;
}
