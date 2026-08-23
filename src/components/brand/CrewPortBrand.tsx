import { useI18n } from "../../i18n";
import styles from "./crewport-brand.module.css";

export interface CrewPortBrandProps {
  readonly href?: string;
  readonly showVersion?: boolean;
}

export function CrewPortBrand({
  href = "/",
  showVersion = true,
}: CrewPortBrandProps) {
  const { t } = useI18n();

  return (
    <a
      className={styles.brandLogo}
      href={href}
      aria-label={`${t("app.name")} — ${t("app.foundationLabel")}`}
    >
      <img
        className={styles.brandAnchor}
        src="/brand/crewport-anchor.png"
        alt=""
        aria-hidden="true"
      />
      <span className={styles.brandTextBlock}>
        <span className={styles.brandWordmark} aria-hidden="true">
          <span className={styles.brandCrew}>CREW</span>
          <span className={styles.brandPort}>PORT</span>
        </span>
        <span className={styles.brandTagline}>{t("app.foundationLabel")}</span>
        {showVersion ? (
          <span className={styles.brandVersion} data-testid="app-version">
            v{__APP_VERSION__}
          </span>
        ) : null}
      </span>
    </a>
  );
}
