import { useState, type ReactNode } from "react";
import { useLocation } from "react-router";

import { OfflineBanner } from "../../components";
import { useI18n } from "../../i18n";
import type { BandwidthMode, Locale } from "../../types";
import {
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

export function AppShell({ children }: { readonly children: ReactNode }) {
  const location = useLocation();
  const { status: i18nStatus, t } = useI18n();
  const { locale, setLocale } = usePersistedLocale();
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
              SP
            </span>
            <div>
              <strong>{t("app.name")}</strong>
              <span>{t("app.foundationLabel")}</span>
            </div>
          </div>

          <div className={styles.preferences}>
            <label className={styles.localeControl}>
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

            <fieldset
              className={styles.bandwidthControl}
              disabled={isPreferenceBusy}
            >
              <legend>{t("settings.bandwidthLabel")}</legend>
              <div className={styles.modeButtons}>
                {bandwidthModes.map((candidate) => (
                  <button
                    type="button"
                    aria-pressed={mode === candidate}
                    data-active={mode === candidate || undefined}
                    key={candidate}
                    onClick={() => {
                      void applyPreference(() => setMode(candidate));
                    }}
                  >
                    {t(bandwidthKeys[candidate])}
                  </button>
                ))}
              </div>
              {saveDataSuggested && mode === "standard" ? (
                <small>Save-Data</small>
              ) : null}
            </fieldset>

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
