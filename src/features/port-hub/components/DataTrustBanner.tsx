import { TrustStatus } from "../../../components";
import { useI18n } from "../../../i18n";

import type { PortNotesViewModel } from "../port-notes-view-model";
import styles from "../port-notes.module.css";

export interface DataTrustBannerProps {
  readonly model: PortNotesViewModel["dataTrust"];
  readonly onContribute: () => void;
}

export function DataTrustBanner({
  model,
  onContribute,
}: DataTrustBannerProps) {
  const { t } = useI18n();

  return (
    <aside
      className={styles.communityPanel}
      aria-labelledby="data-trust-heading"
    >
      <div className={styles.communityPanelHeader}>
        <p className={styles.sectionEyebrow}>
          {t("portNotes.community.eyebrow")}
        </p>
        <TrustStatus {...model.trust} compact />
      </div>
      <h2 id="data-trust-heading">{t("portNotes.community.heading")}</h2>
      <p className={styles.communityMessage}>{model.message}</p>
      <ul className={styles.communityPrinciples}>
        <li>{t("portNotes.community.publicNotes")}</li>
        <li>{t("portNotes.community.pendingNotes")}</li>
        <li>{t("portNotes.community.prototype")}</li>
      </ul>
      <p className={styles.communityEvidence}>{model.evidence}</p>
      <p className={styles.communityDetail}>{model.detail}</p>
      <p className={styles.communityPrompt}>{model.contributionPrompt}</p>
      <button
        className={styles.communityContributeButton}
        type="button"
        onClick={onContribute}
      >
        {t("portNotes.community.contribute")}
      </button>
      <p className={styles.communityAdvice}>
        {t("portNotes.trust.advice")}
      </p>
    </aside>
  );
}
