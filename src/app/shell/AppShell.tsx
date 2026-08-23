import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router";

import { CrewPortBrand, OfflineBanner } from "../../components";
import { SiteNavigation } from "../../features/navigation";
import { useI18n } from "../../i18n";
import type { AppearanceMode, BandwidthMode } from "../../types";
import {
  useAppearanceMode,
  useBandwidthMode,
  useNetworkState,
  usePersistedLocale,
} from "../providers";
import styles from "./app-shell.module.css";

const bandwidthModes: readonly BandwidthMode[] = [
  "standard",
  "dataSaver",
  "ultraLite",
];

const bandwidthKeys = {
  standard: "bandwidth.standard",
  dataSaver: "bandwidth.dataSaver",
  ultraLite: "bandwidth.ultraLite",
} as const;

const appearanceModes: readonly AppearanceMode[] = ["light", "dark", "system"];

const appearanceKeys = {
  light: "appearance.light",
  dark: "appearance.dark",
  system: "appearance.system",
} as const;

function AppearanceIcon({ mode }: { readonly mode: AppearanceMode }) {
  if (mode === "light") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.2 2.4 3.2 5.2 3.2 8.5s-1 6.1-3.2 8.5c-2.2-2.4-3.2-5.2-3.2-8.5s1-6.1 3.2-8.5Z" />
    </svg>
  );
}

function DataModeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 20v-5M10 20V10M15 20V6M20 20V3" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c.8-3.2 3.5-5 7.5-5s6.7 1.8 7.5 5" />
    </svg>
  );
}

interface PreferenceSelectProps<Value extends string> {
  readonly label: string;
  readonly value: Value;
  readonly displayValue?: string;
  readonly options: readonly { readonly value: Value; readonly label: string }[];
  readonly icon: ReactNode;
  readonly className: string;
  readonly disabled: boolean;
  readonly onChange: (value: Value) => void;
}

function PreferenceSelect<Value extends string>({
  label,
  value,
  displayValue,
  options,
  icon,
  className,
  disabled,
  onChange,
}: PreferenceSelectProps<Value>) {
  return (
    <label className={`${styles.preferenceControl} ${className}`}>
      <span className="visually-hidden">{label}</span>
      <span className={styles.preferenceVisual} aria-hidden="true">
        <span className={styles.preferenceIcon}>{icon}</span>
        {displayValue ? (
          <span className={styles.preferenceValue}>{displayValue}</span>
        ) : null}
      </span>
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.value as Value)}
      >
        {options.map((option) => (
          <option value={option.value} key={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

type ShellNotice =
  | { readonly kind: "login" }
  | { readonly kind: "placeholder"; readonly feature: string };

export function AppShell({ children }: { readonly children: ReactNode }) {
  const location = useLocation();
  const { status: i18nStatus, t } = useI18n();
  const { locale, setLocale } = usePersistedLocale();
  const { mode: appearanceMode, setMode: setAppearanceMode } =
    useAppearanceMode();
  const { mode, setMode } = useBandwidthMode();
  const { isOnline } = useNetworkState();
  const [isSavingPreference, setIsSavingPreference] = useState(false);
  const [preferenceError, setPreferenceError] = useState(false);
  const [shellNotice, setShellNotice] = useState<ShellNotice>();
  const isPreferenceBusy = isSavingPreference || i18nStatus === "loading";
  const isPortNotesRoute = location.pathname.startsWith("/ports/");
  const isHomeRoute = location.pathname === "/";
  const isSearchRoute = location.pathname.startsWith("/search");
  const currentNavigation = isPortNotesRoute
    ? "port"
    : isSearchRoute
      ? "search"
      : "home";
  const currentPortSlug = location.pathname.match(/^\/ports\/([^/]+)/)?.[1] ?? "busan";
  const containerClass = "content-container";

  useEffect(() => {
    setShellNotice(undefined);
  }, [location.pathname]);

  async function applyPreference(update: () => Promise<void>) {
    setPreferenceError(false);
    setIsSavingPreference(true);
    try {
      await update();
    } catch {
      setPreferenceError(true);
    } finally {
      setIsSavingPreference(false);
    }
  }

  return (
    <div
      className={`app-shell ${styles.shell} ${
        isPortNotesRoute ? styles.portNotesShell : ""
      } ${isHomeRoute ? styles.homeShell : ""} ${
        isSearchRoute ? styles.searchShell : ""
      }`}
    >
      <a className="skip-link" href="#main-content">
        {t("a11y.skipToContent")}
      </a>

      <header className={styles.header}>
        <div className={`${containerClass} ${styles.headerInner}`}>
          <CrewPortBrand showVersion={false} />

          <SiteNavigation
            current={currentNavigation}
            portSlug={currentPortSlug}
            onPlaceholder={(feature) =>
              setShellNotice({ kind: "placeholder", feature })
            }
          />

          <div className={styles.preferences}>
            <PreferenceSelect
              className={styles.appearanceControl}
              label={t("settings.appearanceLabel")}
              value={appearanceMode}
              icon={<AppearanceIcon mode={appearanceMode} />}
              disabled={isPreferenceBusy}
              options={appearanceModes.map((candidate) => ({
                value: candidate,
                label: t(appearanceKeys[candidate]),
              }))}
              onChange={(nextMode) =>
                void applyPreference(() => setAppearanceMode(nextMode))
              }
            />
            <PreferenceSelect
              className={styles.localeControl}
              label={t("settings.languageLabel")}
              value={locale}
              displayValue={locale.toUpperCase()}
              icon={<GlobeIcon />}
              disabled={isPreferenceBusy}
              options={[
                { value: "vi" as const, label: "VI" },
                { value: "en" as const, label: "EN" },
              ]}
              onChange={(nextLocale) =>
                void applyPreference(() => setLocale(nextLocale))
              }
            />
            <PreferenceSelect
              className={styles.bandwidthControl}
              label={t("settings.bandwidthLabel")}
              value={mode}
              displayValue={t(bandwidthKeys[mode])}
              icon={<DataModeIcon />}
              disabled={isPreferenceBusy}
              options={bandwidthModes.map((candidate) => ({
                value: candidate,
                label: t(bandwidthKeys[candidate]),
              }))}
              onChange={(nextMode) =>
                void applyPreference(() => setMode(nextMode))
              }
            />
            <button
              className={styles.loginButton}
              type="button"
              aria-label={t("settings.loginLabel")}
              onClick={() => setShellNotice({ kind: "login" })}
            >
              <UserIcon />
            </button>

            {isPreferenceBusy ? (
              <output className={styles.preferenceStatus} aria-live="polite">
                {t("settings.loading")}
              </output>
            ) : null}
            {i18nStatus === "error" || preferenceError ? (
              <p className={styles.preferenceError} role="alert">
                {t("settings.error")}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      {shellNotice ? (
        <div className={`${containerClass} ${styles.shellNotice}`}>
          <output aria-live="polite">
            {shellNotice.kind === "login"
              ? t("settings.loginPlaceholder")
              : t("portNotes.placeholder", { feature: shellNotice.feature })}
          </output>
        </div>
      ) : null}

      {!isOnline ? (
        <div className={`${containerClass} ${styles.networkBanner}`}>
          <OfflineBanner
            mode="offline"
            title={t("offline.title")}
            message={t("offline.message")}
          />
        </div>
      ) : null}

      <main className={`${containerClass} ${styles.main}`} id="main-content">
        {children}
      </main>
    </div>
  );
}
