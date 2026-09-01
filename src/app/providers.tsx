import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { I18nProvider, useI18n } from "../i18n";
import { createServices, type AppServices } from "../services";
import type {
  AppearanceMode,
  BandwidthMode,
  Locale,
  ProfileReadModel,
  ResolvedAppearance,
  SessionStatus,
} from "../types";

const ServicesContext = createContext<AppServices | undefined>(undefined);

interface BandwidthContextValue {
  readonly mode: BandwidthMode;
  readonly saveDataSuggested: boolean;
  readonly setMode: (mode: BandwidthMode) => Promise<void>;
}

const BandwidthContext = createContext<BandwidthContextValue | undefined>(
  undefined,
);

interface AppearanceContextValue {
  readonly mode: AppearanceMode;
  readonly resolvedAppearance: ResolvedAppearance;
  readonly setMode: (mode: AppearanceMode) => Promise<void>;
}

const AppearanceContext = createContext<AppearanceContextValue | undefined>(
  undefined,
);

interface NetworkContextValue {
  readonly isOnline: boolean;
}

const NetworkContext = createContext<NetworkContextValue | undefined>(undefined);

export interface AppSession {
  readonly status: SessionStatus;
  readonly profile?: ProfileReadModel;
  readonly isConfigured: boolean;
}

const SessionContext = createContext<AppSession>({
  status: "anonymous",
  isConfigured: false,
});

interface NavigatorWithConnection extends Navigator {
  readonly connection?: {
    readonly saveData?: boolean;
  };
}

function detectSaveDataPreference(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  return Boolean((navigator as NavigatorWithConnection).connection?.saveData);
}

function detectSystemAppearance(): ResolvedAppearance {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function ServicesProvider({
  services,
  children,
}: {
  readonly services: AppServices;
  readonly children: ReactNode;
}) {
  return (
    <ServicesContext.Provider value={services}>
      {children}
    </ServicesContext.Provider>
  );
}

function BandwidthProvider({
  services,
  children,
}: {
  readonly services: AppServices;
  readonly children: ReactNode;
}) {
  const saveDataSuggested = useMemo(detectSaveDataPreference, []);
  const [mode, setModeState] = useState<BandwidthMode>(() =>
    saveDataSuggested ? "dataSaver" : "standard",
  );
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    void services.preferences
      .get()
      .then((preferences) => {
        if (!active) {
          return;
        }

        if (preferences.bandwidthModeWasUserSelected) {
          setModeState(preferences.bandwidthMode);
        } else if (saveDataSuggested) {
          setModeState("dataSaver");
        }
      })
      .catch(() => {
        if (active) {
          setModeState(saveDataSuggested ? "dataSaver" : "standard");
        }
      })
      .finally(() => {
        if (active) {
          setIsHydrated(true);
        }
      });

    return () => {
      active = false;
    };
  }, [saveDataSuggested, services]);

  useEffect(() => {
    document.documentElement.dataset.bandwidthMode = mode;
    return () => {
      delete document.documentElement.dataset.bandwidthMode;
    };
  }, [mode]);

  const value = useMemo<BandwidthContextValue>(
    () => ({
      mode,
      saveDataSuggested,
      setMode: async (nextMode) => {
        const previousMode = mode;
        setModeState(nextMode);
        try {
          await services.preferences.update({
            bandwidthMode: nextMode,
            bandwidthModeWasUserSelected: true,
          });
        } catch (error: unknown) {
          setModeState((currentMode) =>
            currentMode === nextMode ? previousMode : currentMode,
          );
          throw error;
        }
      },
    }),
    [mode, saveDataSuggested, services],
  );

  return (
    <BandwidthContext.Provider value={value}>
      {isHydrated ? (
        children
      ) : (
        <output className="visually-hidden" aria-live="polite">
          Loading bandwidth preference
        </output>
      )}
    </BandwidthContext.Provider>
  );
}

function AppearanceProvider({
  services,
  children,
}: {
  readonly services: AppServices;
  readonly children: ReactNode;
}) {
  const [mode, setModeState] = useState<AppearanceMode>("dark");
  const [systemAppearance, setSystemAppearance] =
    useState<ResolvedAppearance>(detectSystemAppearance);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    void services.preferences
      .get()
      .then((preferences) => {
        if (active) {
          setModeState(preferences.appearanceMode);
        }
      })
      .catch(() => {
        if (active) {
          setModeState("dark");
        }
      })
      .finally(() => {
        if (active) {
          setIsHydrated(true);
        }
      });

    return () => {
      active = false;
    };
  }, [services]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const update = (event: MediaQueryListEvent | MediaQueryList) => {
      setSystemAppearance(event.matches ? "dark" : "light");
    };
    update(query);
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  const resolvedAppearance = mode === "system" ? systemAppearance : mode;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.appearanceMode = mode;
    root.dataset.theme = resolvedAppearance;
    root.style.colorScheme = resolvedAppearance;
    return () => {
      delete root.dataset.appearanceMode;
      delete root.dataset.theme;
      root.style.removeProperty("color-scheme");
    };
  }, [mode, resolvedAppearance]);

  const value = useMemo<AppearanceContextValue>(
    () => ({
      mode,
      resolvedAppearance,
      setMode: async (nextMode) => {
        const previousMode = mode;
        setModeState(nextMode);
        try {
          await services.preferences.update({ appearanceMode: nextMode });
        } catch (error: unknown) {
          setModeState((currentMode) =>
            currentMode === nextMode ? previousMode : currentMode,
          );
          throw error;
        }
      },
    }),
    [mode, resolvedAppearance, services],
  );

  return (
    <AppearanceContext.Provider value={value}>
      {isHydrated ? (
        children
      ) : (
        <output className="visually-hidden" aria-live="polite">
          Loading appearance preference
        </output>
      )}
    </AppearanceContext.Provider>
  );
}

function NetworkProvider({ children }: { readonly children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const value = useMemo(() => ({ isOnline }), [isOnline]);

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}

function SessionProvider({
  services,
  children,
}: {
  readonly services: AppServices;
  readonly children: ReactNode;
}) {
  const isConfigured = services.auth.isConfigured();
  const [session, setSession] = useState<AppSession>({
    status: isConfigured ? "loading" : "anonymous",
    isConfigured,
  });

  useEffect(() => {
    let active = true;
    if (!isConfigured) {
      return () => {
        active = false;
      };
    }

    void services.auth
      .getState()
      .then((state) => {
        if (active) {
          setSession({ ...state, isConfigured });
        }
      })
      .catch(() => {
        if (active) {
          setSession({ status: "unavailable", isConfigured });
        }
      });

    const unsubscribe = services.auth.subscribe((state) => {
      if (active) {
        setSession({ ...state, isConfigured });
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [isConfigured, services]);

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}

function LocalePreferenceBridge({ services }: { readonly services: AppServices }) {
  const { setLocale } = useI18n();

  useEffect(() => {
    let active = true;

    void services.preferences
      .get()
      .then((preferences) =>
        active ? setLocale(preferences.locale) : undefined,
      )
      .catch(() => {
        // The VI in-memory default remains usable when storage or EN loading fails.
      });

    return () => {
      active = false;
    };
  }, [services, setLocale]);

  return null;
}

export function AppProviders({ children }: { readonly children: ReactNode }) {
  const services = useMemo(() => createServices(), []);

  return (
    <ServicesProvider services={services}>
      <I18nProvider initialLocale="vi">
        <LocalePreferenceBridge services={services} />
        <AppearanceProvider services={services}>
          <BandwidthProvider services={services}>
            <NetworkProvider>
              <SessionProvider services={services}>
                {children}
              </SessionProvider>
            </NetworkProvider>
          </BandwidthProvider>
        </AppearanceProvider>
      </I18nProvider>
    </ServicesProvider>
  );
}

export function useServices(): AppServices {
  const value = useContext(ServicesContext);
  if (!value) {
    throw new Error("useServices must be used inside AppProviders");
  }
  return value;
}

export function useBandwidthMode(): BandwidthContextValue {
  const value = useContext(BandwidthContext);
  if (!value) {
    throw new Error("useBandwidthMode must be used inside AppProviders");
  }
  return value;
}

/** Standard is a safe default for reusable visual primitives rendered in isolation. */
export function useBandwidthModeValue(): BandwidthMode {
  return useContext(BandwidthContext)?.mode ?? "standard";
}

export function useAppearanceMode(): AppearanceContextValue {
  const value = useContext(AppearanceContext);
  if (!value) {
    throw new Error("useAppearanceMode must be used inside AppProviders");
  }
  return value;
}

export function useNetworkState(): NetworkContextValue {
  const value = useContext(NetworkContext);
  if (!value) {
    throw new Error("useNetworkState must be used inside AppProviders");
  }
  return value;
}

export function useSession(): AppSession {
  return useContext(SessionContext);
}

export function usePersistedLocale(): {
  readonly locale: Locale;
  readonly setLocale: (locale: Locale) => Promise<void>;
} {
  const services = useServices();
  const { locale, setLocale } = useI18n();

  return {
    locale,
    setLocale: async (nextLocale) => {
      await setLocale(nextLocale);
      await services.preferences.update({ locale: nextLocale });
    },
  };
}
