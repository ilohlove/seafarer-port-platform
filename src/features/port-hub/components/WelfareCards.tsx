import { TrustStatus } from "../../../components";
import { useI18n } from "../../../i18n";
import type { WelfareCardModel } from "../port-notes-view-model";
import styles from "../port-notes.module.css";

export function WelfareCards({
  cards,
}: {
  readonly cards: readonly WelfareCardModel[];
}) {
  const { t } = useI18n();

  return (
    <section id="welfare-section" aria-labelledby="welfare-heading">
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionEyebrow}>
            {t("portNotes.welfare.eyebrow")}
          </p>
          <h2 id="welfare-heading">{t("portNotes.welfare.heading")}</h2>
        </div>
        <span className={styles.sectionCaption}>
          {t("portNotes.welfare.caption")}
        </span>
      </div>
      {cards.length > 0 ? (
        <div className={styles.welfareGrid}>
          {cards.map((card) => (
            <article className={styles.welfareCard} key={card.id}>
              <div className={styles.welfareCardHeader}>
                <h3>{card.name}</h3>
                <TrustStatus {...card.trust} compact />
              </div>
              <div
                className={styles.welfareBadges}
                aria-label={t("portNotes.welfare.services")}
              >
                {card.badges.map((badge) => (
                  <span data-status={badge.status} key={badge.id}>
                    {badge.status === "unknown" ? "? " : "✓ "}
                    {badge.label}
                  </span>
                ))}
              </div>
              <p>{card.summary}</p>
              {card.call ? (
                <a className={styles.callButton} href={card.call.href}>
                  {card.call.label}
                </a>
              ) : (
                <p className={styles.noVerifiedContact}>
                  {t("portNotes.welfare.noVerifiedPhone")}
                </p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.noDataCard}>
          <h3>{t("portNotes.welfare.emptyHeading")}</h3>
          <p>{t("portNotes.welfare.emptyDescription")}</p>
        </div>
      )}
    </section>
  );
}
