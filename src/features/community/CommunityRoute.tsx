import { Link } from "react-router";

import { useI18n } from "../../i18n";
import styles from "./community.module.css";

export function CommunityRoute() {
  const { t } = useI18n();

  return (
    <section className={styles.locked} aria-labelledby="community-locked-heading">
      <p className={styles.lockedEyebrow}>CrewPort</p>
      <h1 id="community-locked-heading">{t("community.locked.heading")}</h1>
      <p>{t("community.locked.description")}</p>
      <Link className={styles.lockedAction} to="/search">
        {t("community.locked.action")}
      </Link>
    </section>
  );
}
