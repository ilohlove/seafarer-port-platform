import { useI18n } from "../../../i18n";
import styles from "../port-notes.module.css";

export interface PortNotesNavigationProps {
  readonly portSlug: string;
  readonly onPlaceholder: (feature: string) => void;
}

export function PortNotesNavigation({
  portSlug,
  onPlaceholder,
}: PortNotesNavigationProps) {
  const { t } = useI18n();

  return (
    <>
      <aside
        className={styles.sidebar}
        aria-label={t("portNotes.nav.label")}
        data-navigation="desktop"
      >
        <div className={styles.sidebarIdentity}>
          <span className={styles.sidebarMark} aria-hidden="true">
            CP
          </span>
          <div>
            <strong>{t("portNotes.nav.brand")}</strong>
            <span>{t("portNotes.nav.tagline")}</span>
          </div>
        </div>
        <nav>
          <a href="/">{t("portNotes.nav.home")}</a>
          <button type="button" onClick={() => onPlaceholder(t("portNotes.nav.search"))}>
            {t("portNotes.nav.search")}
          </button>
          <a href={`/ports/${portSlug}`} aria-current="page">
            {t("portNotes.nav.port")}
          </a>
          <button type="button" onClick={() => onPlaceholder(t("portNotes.action.compareEsim"))}>
            {t("portNotes.nav.esim")}
          </button>
          <button type="button" onClick={() => onPlaceholder(t("portNotes.action.taxi"))}>
            {t("portNotes.nav.transport")}
          </button>
          <button type="button" onClick={() => onPlaceholder(t("portNotes.notes.heading"))}>
            {t("portNotes.nav.notes")}
          </button>
          <button type="button" onClick={() => onPlaceholder(t("portNotes.nav.saved"))}>
            {t("portNotes.nav.saved")}
          </button>
        </nav>
        <div className={styles.sidebarSupport}>
          <div className={styles.supportIllustration} aria-hidden="true">
            <span>~</span>
            <span>⌁</span>
          </div>
          <strong>{t("portNotes.nav.supportHeading")}</strong>
          <p>{t("portNotes.nav.supportDescription")}</p>
        </div>
      </aside>

      <nav
        className={styles.mobileBottomNavigation}
        aria-label={t("portNotes.nav.label")}
        data-navigation="mobile"
      >
        <a href="/">
          <span aria-hidden="true">⌂</span>
          {t("portNotes.nav.home")}
        </a>
        <a href="#port-notes-search-mobile">
          <span aria-hidden="true">⌕</span>
          {t("portNotes.nav.search")}
        </a>
        <a href={`/ports/${portSlug}`} aria-current="page">
          <span aria-hidden="true">⚓</span>
          {t("portNotes.nav.port")}
        </a>
        <a href="#top-notes-heading">
          <span aria-hidden="true">✎</span>
          {t("portNotes.nav.notes")}
        </a>
        <button type="button" onClick={() => onPlaceholder(t("portNotes.nav.saved"))}>
          <span aria-hidden="true">♡</span>
          {t("portNotes.nav.saved")}
        </button>
      </nav>
    </>
  );
}
