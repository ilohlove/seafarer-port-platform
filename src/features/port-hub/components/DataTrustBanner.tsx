import { TrustStatus } from "../../../components";
import { useI18n } from "../../../i18n";
import type { DataTrustModel } from "../port-hub-view-model";
import styles from "../port-hub.module.css";

export function DataTrustBanner({ model }: { readonly model: DataTrustModel }) {
  const { t } = useI18n();

  return (
    <section className={styles.trustBanner} aria-labelledby="trust-banner-heading">
      <span className={styles.trustBannerSymbol} aria-hidden="true">
        ✓
      </span>
      <div>
        <div className={styles.trustBannerHeading}>
          <h2 id="trust-banner-heading">{t("portHub.trustBanner.heading")}</h2>
          <TrustStatus {...model.trust} compact />
        </div>
        <p>{model.message}</p>
        <details>
          <summary>{t("portHub.trustBanner.how")}</summary>
          <p>{model.detail}</p>
          <p>{t("portHub.trustBanner.verifyOnArrival")}</p>
        </details>
      </div>
    </section>
  );
}
