import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router";

import { CrewPortBrand, OfflineBanner } from "../../components";
import { SiteNavigation } from "../../features/navigation";
import { useI18n } from "../../i18n";
import type { BandwidthMode } from "../../types";
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

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
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

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="9" cy="6" r="2" />
      <circle cx="15" cy="12" r="2" />
      <circle cx="10" cy="18" r="2" />
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
  readonly showLabel?: boolean;
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
  showLabel = false,
}: PreferenceSelectProps<Value>) {
  return (
    <label className={`${styles.preferenceControl} ${className}`}>
      <span className={showLabel ? styles.preferenceLabel : "visually-hidden"}>
        {label}
      </span>
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

interface AppearanceControlProps {
  readonly resolvedAppearance: "light" | "dark";
  readonly label: string;
  readonly lightLabel: string;
  readonly darkLabel: string;
  readonly disabled: boolean;
  readonly className?: string;
  readonly onToggle: () => void;
}

function AppearanceControl({
  resolvedAppearance,
  label,
  lightLabel,
  darkLabel,
  disabled,
  className,
  onToggle,
}: AppearanceControlProps) {
  const isDark = resolvedAppearance === "dark";
  const currentLabel = isDark ? darkLabel : lightLabel;

  return (
    <div className={`${styles.appearanceControl} ${className ?? ""}`}>
      <button
        className={styles.appearanceToggle}
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={`${label}: ${currentLabel}`}
        disabled={disabled}
        onClick={onToggle}
      >
        <span className={styles.appearanceToggleTrack} aria-hidden="true">
          <span className={styles.appearanceToggleIcon}>
            <SunIcon />
          </span>
          <span className={styles.appearanceToggleIcon}>
            <MoonIcon />
          </span>
          <span
            className={`${styles.appearanceToggleThumb} ${
              isDark ? styles.appearanceToggleThumbDark : ""
            }`}
          />
        </span>
      </button>
    </div>
  );
}

type ShellNotice =
  | { readonly kind: "login" }
  | { readonly kind: "placeholder"; readonly feature: string };

export function AppShell({ children }: { readonly children: ReactNode }) {
  const location = useLocation();
  const { status: i18nStatus, t } = useI18n();
  const { locale, setLocale } = usePersistedLocale();
  const {
    resolvedAppearance,
    setMode: setAppearanceMode,
  } =
    useAppearanceMode();
  const { mode, setMode } = useBandwidthMode();
  const { isOnline } = useNetworkState();
  const [isSavingPreference, setIsSavingPreference] = useState(false);
  const [preferenceError, setPreferenceError] = useState(false);
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);
  const [shellNotice, setShellNotice] = useState<ShellNotice>();
  const mobileSettingsButtonRef = useRef<HTMLButtonElement>(null);
  const mobileSettingsPanelRef = useRef<HTMLDivElement>(null);
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
    setIsMobileSettingsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileSettingsOpen) {
      return;
    }

    const firstControl = mobileSettingsPanelRef.current?.querySelector<HTMLElement>(
      "select, button",
    );
    firstControl?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileSettingsOpen(false);
        mobileSettingsButtonRef.current?.focus();
      }
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        !mobileSettingsPanelRef.current?.contains(target) &&
        !mobileSettingsButtonRef.current?.contains(target)
      ) {
        setIsMobileSettingsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isMobileSettingsOpen]);

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

  function toggleAppearance() {
    const nextMode = resolvedAppearance === "dark" ? "light" : "dark";
    void applyPreference(() => setAppearanceMode(nextMode));
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
            <div className={styles.desktopPreferences}>
              <AppearanceControl
                resolvedAppearance={resolvedAppearance}
                label={t("settings.appearanceLabel")}
                lightLabel={t("appearance.light")}
                darkLabel={t("appearance.dark")}
                disabled={isPreferenceBusy}
                onToggle={toggleAppearance}
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
            </div>
            <button
              ref={mobileSettingsButtonRef}
              className={styles.mobileSettingsButton}
              type="button"
              aria-label={t("settings.openDisplaySettings")}
              aria-expanded={isMobileSettingsOpen}
              aria-controls="mobile-display-settings"
              onClick={() => setIsMobileSettingsOpen((open) => !open)}
            >
              <SettingsIcon />
            </button>
            <button
              className={styles.loginButton}
              type="button"
              aria-label={t("settings.loginLabel")}
              onClick={() => setShellNotice({ kind: "login" })}
            >
              <UserIcon />
            </button>

            {isMobileSettingsOpen ? (
              <section
                ref={mobileSettingsPanelRef}
                className={styles.mobileSettingsPanel}
                id="mobile-display-settings"
                aria-labelledby="mobile-display-settings-heading"
              >
                <h2
                  className="visually-hidden"
                  id="mobile-display-settings-heading"
                >
                  {t("settings.displayPanelLabel")}
                </h2>
                <PreferenceSelect
                  className={styles.mobilePreferenceControl}
                  label={t("settings.languageLabel")}
                  value={locale}
                  displayValue={locale.toUpperCase()}
                  icon={<GlobeIcon />}
                  disabled={isPreferenceBusy}
                  showLabel
                  options={[
                    { value: "vi" as const, label: "VI" },
                    { value: "en" as const, label: "EN" },
                  ]}
                  onChange={(nextLocale) =>
                    void applyPreference(() => setLocale(nextLocale))
                  }
                />
                <div className={styles.mobileAppearancePreference}>
                  <span>{t("settings.appearanceLabel")}</span>
                  <AppearanceControl
                    className={styles.mobileAppearanceControl}
                    resolvedAppearance={resolvedAppearance}
                    label={t("settings.appearanceLabel")}
                    lightLabel={t("appearance.light")}
                    darkLabel={t("appearance.dark")}
                    disabled={isPreferenceBusy}
                    onToggle={toggleAppearance}
                  />
                </div>
                <PreferenceSelect
                  className={styles.mobilePreferenceControl}
                  label={t("settings.bandwidthLabel")}
                  value={mode}
                  displayValue={t(bandwidthKeys[mode])}
                  icon={<DataModeIcon />}
                  disabled={isPreferenceBusy}
                  showLabel
                  options={bandwidthModes.map((candidate) => ({
                    value: candidate,
                    label: t(bandwidthKeys[candidate]),
                  }))}
                  onChange={(nextMode) =>
                    void applyPreference(() => setMode(nextMode))
                  }
                />
              </section>
            ) : null}

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
