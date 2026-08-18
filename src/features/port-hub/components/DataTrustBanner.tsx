import { TrustStatus } from "../../../components";
import { useI18n } from "../../../i18n";

import type { PortNotesViewModel } from "../port-notes-view-model";
import styles from "../port-notes.module.css";

export interface DataTrustBannerProps {
  readonly model: PortNotesViewModel["dataTrust"];
}

export function DataTrustBanner({ model }: DataTrustBannerProps) {
  const { t } = useI18n();

  return (
    <aside className={styles.trustBanner} aria-labelledby="data-trust-heading">
      <div className={styles.trustBannerSymbol} aria-hidden="true">
        ✓
      </div>
      <div>
        <p className={styles.sectionEyebrow}>{t("portNotes.trust.eyebrow")}</p>
        <h2 id="data-trust-heading">{model.message}</h2>
        <p>{model.detail}</p>
        <TrustStatus {...model.trust} />
      </div>
      <p className={styles.trustBannerAdvice}>
        {t("portNotes.trust.advice")}
      </p>
    </aside>
  );
}
