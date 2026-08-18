import { useI18n } from "../../../i18n";
import styles from "../port-hub.module.css";

export interface PortHubNavigationProps {
  readonly portSlug: string;
  readonly onPlaceholder: (label: string) => void;
}

export function PortHubNavigation({
  portSlug,
  onPlaceholder,
}: PortHubNavigationProps) {
  const { t } = useI18n();
  const futureItems = [
    t("portHub.nav.shorePlanner"),
    t("portHub.nav.esimCompare"),
    t("portHub.nav.community"),
    t("portHub.nav.saved"),
  ];

  return (
    <>
      <aside className={styles.sidebar} aria-label={t("portHub.nav.label")}>
        <div className={styles.sidebarBrand}>
          <span className={styles.sidebarMark} aria-hidden="true">
            SP
          </span>
          <div>
            <strong>{t("app.name")}</strong>
            <span>{t("portHub.nav.workspace")}</span>
          </div>
        </div>

        <nav>
          <ul className={styles.sidebarList}>
            <li>
              <a href="/">{t("portHub.nav.home")}</a>
            </li>
            <li>
              <a href="/#repository-preview">{t("portHub.nav.search")}</a>
            </li>
            <li>
              <a
                href={`/ports/${portSlug}`}
                aria-current="page"
                className={styles.activeNavItem}
              >
                {t("portHub.nav.portHub")}
              </a>
            </li>
            {futureItems.map((label) => (
              <li key={label}>
                <button type="button" onClick={() => onPlaceholder(label)}>
                  {label}
                  <span className={styles.futureTag}>
                    {t("portHub.nav.soon")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <p className={styles.sidebarPrinciple}>
          {t("portHub.nav.principle")}
        </p>
      </aside>

      <nav className={styles.mobileNav} aria-label={t("portHub.nav.mobileLabel")}>
        <a href="/">{t("portHub.nav.home")}</a>
        <a href="/#repository-preview">{t("portHub.nav.search")}</a>
        <a href={`/ports/${portSlug}`} aria-current="page">
          {t("portHub.nav.portHub")}
        </a>
        <button
          type="button"
          onClick={() => onPlaceholder(t("portHub.nav.more"))}
        >
          {t("portHub.nav.more")}
        </button>
      </nav>
    </>
  );
}
