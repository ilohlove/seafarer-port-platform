import { TrustStatus } from "../../../components";
import { useI18n } from "../../../i18n";
import type { QuickBriefModel } from "../port-hub-view-model";
import styles from "../port-hub.module.css";

export function QuickBriefPanel({ brief }: { readonly brief: QuickBriefModel }) {
  const { t } = useI18n();

  return (
    <section className={styles.quickBrief} aria-labelledby="quick-brief-heading">
      <div className={styles.panelHeading}>
        <div>
          <p className={styles.panelKicker}>{t("portHub.quick.kicker")}</p>
          <h2 id="quick-brief-heading">{t("portHub.quick.heading")}</h2>
        </div>
        <span className={styles.panelSymbol} aria-hidden="true">
          QB
        </span>
      </div>
      <ul className={styles.briefList}>
        {brief.bullets.map((bullet, index) => (
          <li key={`${index}-${bullet}`}>{bullet}</li>
        ))}
      </ul>
      <footer className={styles.briefFooter}>
        <span>
          <strong>{t("portHub.quick.source")}:</strong> {brief.sourceSummary}
        </span>
        <span className={styles.briefTrust}>
          <strong>{t("portHub.quick.dataStatus")}:</strong>
          <TrustStatus {...brief.trust} compact />
        </span>
      </footer>
    </section>
  );
}
