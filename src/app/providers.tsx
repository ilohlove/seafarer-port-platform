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
import type { BandwidthMode, Locale } from "../types";

const ServicesContext = createContext<AppServices | undefined>(undefined);

interface BandwidthContextValue {
  readonly mode: BandwidthMode;
  readonly saveDataSuggested: boolean;
  readonly setMode: (mode: BandwidthMode) => Promise<void>;
}

const BandwidthContext = createContext<BandwidthContextValue | undefined>(
  undefined,
);

interface NetworkContextValue {
  readonly isOnline: boolean;
}

const NetworkContext = createContext<NetworkContextValue | undefined>(undefined);

export interface MockSession {
  readonly status: "anonymous" | "member";
  readonly displayName?: string;
}

const SessionContext = createContext<MockSession>({ status: "anonymous" });

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
        <BandwidthProvider services={services}>
          <NetworkProvider>
            <SessionContext.Provider value={{ status: "anonymous" }}>
              {children}
            </SessionContext.Provider>
          </NetworkProvider>
        </BandwidthProvider>
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

export function useNetworkState(): NetworkContextValue {
  const value = useContext(NetworkContext);
  if (!value) {
    throw new Error("useNetworkState must be used inside AppProviders");
  }
  return value;
}

export function useSession(): MockSession {
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
