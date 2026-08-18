import { TrustStatus } from "../../../components";
import { useI18n } from "../../../i18n";
import type { DecisionItemModel } from "../port-hub-view-model";
import styles from "../port-hub.module.css";

export function DecisionStrip({
  items,
}: {
  readonly items: readonly DecisionItemModel[];
}) {
  const { t } = useI18n();

  return (
    <section className={styles.decisionSection} aria-labelledby="decision-heading">
      <div className={styles.sectionTitleRow}>
        <h2 id="decision-heading">{t("portHub.decision.heading")}</h2>
        <span>{t("portHub.decision.caption")}</span>
      </div>
      <div className={styles.decisionGrid}>
        {items.map((item) => (
          <article
            className={styles.decisionCard}
            data-tone={item.tone ?? "default"}
            key={item.id}
          >
            <div className={styles.decisionTopline}>
              <span className={styles.decisionSymbol} aria-hidden="true">
                {item.symbol}
              </span>
              <h3>{item.label}</h3>
            </div>
            <strong className={styles.decisionValue}>{item.value}</strong>
            <p>{item.detail}</p>
            <TrustStatus {...item.trust} compact />
          </article>
        ))}
      </div>
    </section>
  );
}
