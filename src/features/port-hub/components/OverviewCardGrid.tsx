import { TrustStatus } from "../../../components";
import { useI18n } from "../../../i18n";
import type { OverviewCardModel } from "../port-hub-view-model";
import styles from "../port-hub.module.css";

export function OverviewCardGrid({
  cards,
}: {
  readonly cards: readonly OverviewCardModel[];
}) {
  const { t } = useI18n();

  return (
    <section id="port-overview" aria-labelledby="overview-heading">
      <div className={styles.sectionTitleRow}>
        <h2 id="overview-heading">{t("portHub.overview.heading")}</h2>
        <span>{t("portHub.overview.caption")}</span>
      </div>
      <div className={styles.overviewGrid}>
        {cards.map((card) => (
          <article
            className={styles.overviewCard}
            data-tone={card.tone}
            data-card-id={card.id}
            key={card.id}
          >
            <div className={styles.cardHeading}>
              <span className={styles.cardSymbol} aria-hidden="true">
                {card.symbol}
              </span>
              <h3>{card.title}</h3>
            </div>
            <ul className={styles.factList}>
              {card.facts.slice(0, 5).map((fact, index) => (
                <li key={`${index}-${fact}`}>{fact}</li>
              ))}
            </ul>
            <footer className={styles.cardFooter}>
              <TrustStatus {...card.trust} compact />
              <p>
                <strong>{t("portHub.overview.reasonLabel")}:</strong>{" "}
                {card.reason}
              </p>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}
