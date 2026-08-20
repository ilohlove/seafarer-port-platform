import { TrustStatus } from "../../../components";
import { useI18n } from "../../../i18n";
import type { InternetDealModel } from "../port-notes-view-model";
import styles from "../port-notes.module.css";

export interface BestInternetDealProps {
  readonly model: InternetDealModel;
  readonly onPlaceholder: (feature: string) => void;
}

export function BestInternetDeal({
  model,
  onPlaceholder,
}: BestInternetDealProps) {
  const { t } = useI18n();

  return (
    <section className={styles.internetDeal} aria-labelledby="best-internet-heading">
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionEyebrow}>{t("portNotes.deal.eyebrow")}</p>
          <h2 id="best-internet-heading">{t("portNotes.deal.heading")}</h2>
        </div>
        <TrustStatus {...model.trust} compact />
      </div>
      <div className={styles.dealContent}>
        <div className={styles.dealBadge} aria-hidden="true">
          eSIM
        </div>
        <div className={styles.dealMain}>
          <h3>{model.name}</h3>
          <p className={styles.dealProvider}>{model.provider}</p>
          <div className={styles.dealPriceRow}>
            <strong>{model.price}</strong>
            <span>{model.plan}</span>
          </div>
          <div className={styles.dealFacts}>
            <span>{model.hotspot}</span>
            <span>{model.signal}</span>
            <span>{model.videoCall}</span>
          </div>
          <p className={styles.evidenceLine}>{model.evidence}</p>
        </div>
      </div>
      <div className={styles.inlineActions}>
        <button
          className={styles.primaryButton}
          type="button"
          onClick={() => onPlaceholder(t("portNotes.deal.compare"))}
        >
          {t("portNotes.deal.compare")}
        </button>
        <button
          className={styles.secondaryButton}
          type="button"
          onClick={() => onPlaceholder(t("portNotes.deal.read"))}
        >
          {t("portNotes.deal.read")}
        </button>
        <button
          className={styles.textButton}
          type="button"
          onClick={() => onPlaceholder(t("portNotes.deal.add"))}
        >
          {t("portNotes.deal.add")}
        </button>
      </div>
      <p className={styles.disclaimer}>
        {t("portNotes.deal.disclaimer")}
      </p>
    </section>
  );
}
