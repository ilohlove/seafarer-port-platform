import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router";

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

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function AppShell({ children }: { readonly children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { status: i18nStatus, t } = useI18n();
  const { locale, setLocale } = usePersistedLocale();
  const { mode: appearanceMode, setMode: setAppearanceMode } =
    useAppearanceMode();
  const { mode, setMode, saveDataSuggested } = useBandwidthMode();
  const { isOnline } = useNetworkState();
  const [isSavingPreference, setIsSavingPreference] = useState(false);
  const [preferenceError, setPreferenceError] = useState(false);
  const [headerQuery, setHeaderQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const isPreferenceBusy = isSavingPreference || i18nStatus === "loading";
  const isPortNotesRoute = location.pathname.startsWith("/ports/");
  const containerClass = "content-container";

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
        mobileMenuButtonRef.current?.focus();
      }
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !mobileMenuRef.current?.contains(event.target)
      ) {
        setIsMobileMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isMobileMenuOpen]);

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

  function submitHeaderSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = headerQuery.trim();
    if (query) {
      navigate(`/?q=${encodeURIComponent(query)}`);
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
            <div className={styles.identityCopy}>
              <strong>{t("app.name")}</strong>
              <span>{t("app.foundationLabel")}</span>
              <small className={styles.version} data-testid="app-version">
                v{appVersion}
              </small>
            </div>
          </div>

          {isPortNotesRoute ? (
            <form
              className={styles.headerSearch}
              aria-label={t("portNotes.search.region")}
              onSubmit={submitHeaderSearch}
            >
              <label className="visually-hidden" htmlFor="shell-port-search">
                {t("portNotes.search.label")}
              </label>
              <span className={styles.headerSearchIcon}>
                <SearchIcon />
              </span>
              <input
                id="shell-port-search"
                type="search"
                value={headerQuery}
                placeholder={t("portNotes.search.input")}
                autoCapitalize="none"
                autoComplete="off"
                enterKeyHint="search"
                onChange={(event) => setHeaderQuery(event.currentTarget.value)}
              />
              <button
                type="submit"
                aria-label={t("portNotes.search.submit")}
                disabled={!headerQuery.trim()}
              >
                <SearchIcon />
              </button>
            </form>
          ) : null}

          {isPortNotesRoute ? (
            <div className={styles.mobileHeaderActions}>
              <a
                className={styles.mobileIconButton}
                href="/#home-search"
                aria-label={t("portNotes.nav.search")}
              >
                <SearchIcon />
              </a>
              <div className={styles.mobileMenu} ref={mobileMenuRef}>
                <button
                  className={styles.mobileIconButton}
                  type="button"
                  aria-label={
                    isMobileMenuOpen
                      ? t("portNotes.nav.closeMore")
                      : t("portNotes.nav.more")
                  }
                  aria-expanded={isMobileMenuOpen}
                  aria-controls="port-secondary-navigation"
                  onClick={() => setIsMobileMenuOpen((open) => !open)}
                  ref={mobileMenuButtonRef}
                >
                  <MenuIcon />
                </button>
                {isMobileMenuOpen ? (
                  <nav
                    className={styles.mobileMenuPanel}
                    id="port-secondary-navigation"
                    aria-label={t("portNotes.nav.secondary")}
                  >
                    <a
                      href={`${location.pathname}#quick-action-compare-esim`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {t("portNotes.nav.esim")}
                    </a>
                    <a
                      href={`${location.pathname}#quick-action-shore-leave`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {t("portNotes.nav.transport")}
                    </a>
                  </nav>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className={styles.preferences}>
            <label
              className={`${styles.preferenceControl} ${styles.localeControl}`}
            >
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
