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
  );
}
