export type Locale = "vi" | "en";
export type BandwidthMode = "standard" | "dataSaver" | "ultraLite";
export type AppearanceMode = "light" | "dark" | "system";
export type ResolvedAppearance = Exclude<AppearanceMode, "system">;
export type NetworkStatus = "online" | "offline" | "unstable";

export interface AppError {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
}

export type AsyncState<T> =
  | { readonly status: "loading" }
  | { readonly status: "success"; readonly data: T }
  | { readonly status: "empty"; readonly reason?: string }
  | { readonly status: "error"; readonly error: AppError }
  | { readonly status: "offline"; readonly cachedData?: T }
  | { readonly status: "loginRequired"; readonly returnTo?: string };

export type OfflinePackStatus =
  | "notDownloaded"
  | "downloading"
  | "available"
  | "stale"
  | "failed";

export interface OfflinePortPack {
  readonly portId: string;
  readonly portName: string;
  readonly status: OfflinePackStatus;
  readonly version?: string;
  readonly downloadedAt?: string;
  readonly sizeBytes?: number;
}
