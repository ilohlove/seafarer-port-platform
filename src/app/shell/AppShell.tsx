import { useState, type ReactNode } from "react";
import { useLocation } from "react-router";

import { OfflineBanner } from "../../components";
import { useI18n } from "../../i18n";
import type { AppearanceMode, BandwidthMode, Locale } from "../../types";
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

const appVersion = __APP_VERSION__;

export function AppShell({ children }: { readonly children: ReactNode }) {
  const location = useLocation();
  const { status: i18nStatus, t } = useI18n();
  const { locale, setLocale } = usePersistedLocale();
  const { mode: appearanceMode, setMode: setAppearanceMode } =
    useAppearanceMode();
  const { mode, setMode, saveDataSuggested } = useBandwidthMode();
  const { isOnline } = useNetworkState();
  const [isSavingPreference, setIsSavingPreference] = useState(false);
  const [preferenceError, setPreferenceError] = useState(false);
  const isPreferenceBusy = isSavingPreference || i18nStatus === "loading";
  const isPortNotesRoute = location.pathname.startsWith("/ports/");
  const containerClass = location.pathname.startsWith("/ports/")
    ? "wide-container"
    : "content-container";

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
      }`}
    >
      <a className="skip-link" href="#main-content">
        {t("a11y.skipToContent")}
      </a>

      <header className={styles.header}>
        <div className={`${containerClass} ${styles.headerInner}`}>
          <div className={styles.identity}>
            <span className={styles.mark} aria-hidden="true">
              CP
            </span>
            <div>
              <strong>{t("app.name")}</strong>
              <span>{t("app.foundationLabel")}</span>
              <small className={styles.version} data-testid="app-version">
                v{appVersion}
              </small>
            </div>
          </div>

          <div className={styles.preferences}>
            <label className={`${styles.preferenceControl} ${styles.localeControl}`}>
              <span>{t("settings.languageLabel")}</span>
              <select
                value={locale}
                disabled={isPreferenceBusy}
                onChange={(event) => {
                  const nextLocale = event.currentTarget.value as Locale;
                  void applyPreference(() => setLocale(nextLocale));
                }}
              >
                <option value="vi">VI</option>
                <option value="en">EN</option>
              </select>
            </label>

            <label
              className={`${styles.preferenceControl} ${styles.appearanceControl}`}
            >
              <span>{t("settings.appearanceLabel")}</span>
              <select
                value={appearanceMode}
                disabled={isPreferenceBusy}
                onChange={(event) => {
                  void applyPreference(() =>
                    setAppearanceMode(
                      event.currentTarget.value as AppearanceMode,
                    ),
                  );
                }}
              >
                {appearanceModes.map((candidate) => (
                  <option value={candidate} key={candidate}>
                    {t(appearanceKeys[candidate])}
                  </option>
                ))}
              </select>
            </label>

            <label
              className={`${styles.preferenceControl} ${styles.bandwidthControl}`}
            >
              <span>{t("settings.bandwidthLabel")}</span>
              <select
                value={mode}
                disabled={isPreferenceBusy}
                onChange={(event) => {
                  void applyPreference(() =>
                    setMode(event.currentTarget.value as BandwidthMode),
                  );
                }}
              >
                {bandwidthModes.map((candidate) => (
                  <option value={candidate} key={candidate}>
                    {t(bandwidthKeys[candidate])}
                  </option>
                ))}
              </select>
              {saveDataSuggested && mode === "standard" ? (
                <small className={styles.saveDataHint}>Save-Data</small>
              ) : null}
            </label>

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
