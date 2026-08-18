import { TrustStatus } from "../../../components";
import { useI18n } from "../../../i18n";
import type { BandwidthMode } from "../../../types";
import type { PortHubHeaderModel } from "../port-hub-view-model";
import styles from "../port-hub.module.css";

export interface PortHeaderProps {
  readonly header: PortHubHeaderModel;
  readonly mode: BandwidthMode;
  readonly onPlaceholder: (label: string) => void;
}

export function PortHeader({
  header,
  mode,
  onPlaceholder,
}: PortHeaderProps) {
  const { t } = useI18n();

  return (
    <header className={styles.portHeader}>
      {mode === "standard" ? (
        <figure
          className={styles.portMedia}
          aria-label={t("portHub.header.mediaLabel", { port: header.name })}
          data-testid="port-media"
        >
          <span>{header.unLocode ?? "PORT"}</span>
          <span>{t("portHub.header.mediaCaption")}</span>
        </figure>
      ) : null}

      <div className={styles.portIdentity}>
        <p className={styles.eyebrow}>{t("portHub.header.eyebrow")}</p>
        <div className={styles.portTitleRow}>
          <div>
            <h1>{header.name}</h1>
            <p className={styles.portLocation}>
              {header.location}
              {header.unLocode ? ` · ${header.unLocode}` : ""}
            </p>
          </div>
          <button
            type="button"
            className={styles.saveButton}
            onClick={() => onPlaceholder(t("portHub.header.save"))}
          >
            <span aria-hidden="true">+</span>
            {t("portHub.header.save")}
          </button>
        </div>

        <div className={styles.terminalRow}>
          <div>
            <span className={styles.fieldLabel}>
              {t("portHub.header.selectedTerminal")}
            </span>
            <strong>{header.selectedTerminal}</strong>
            {header.gateNames.length > 0 ? (
              <span className={styles.terminalMeta}>
                {t("portHub.header.gates", {
                  value: header.gateNames.join(" · "),
                })}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            className={styles.terminalButton}
            aria-haspopup="listbox"
            onClick={() =>
              onPlaceholder(t("portHub.header.terminalSelector"))
            }
          >
            {t("portHub.header.changeTerminal")}
          </button>
        </div>

        <div className={styles.headerBadges}>
          <TrustStatus {...header.trust} compact />
          <span className={styles.qualityBadge}>
            <span aria-hidden="true">◆</span>
            {t("portHub.header.dataQuality", { value: header.dataQuality })}
          </span>
          <TrustStatus {...header.dataQualityTrust} compact />
        </div>
      </div>
    </header>
  );
}
