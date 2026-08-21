import { TrustStatus } from "../../../components";
import { useI18n } from "../../../i18n";
import type { PortSnapshotModel } from "../port-notes-view-model";
import styles from "../port-notes.module.css";

export interface PortSnapshotProps {
  readonly model: PortSnapshotModel;
  readonly onPlaceholder: (feature: string) => void;
  readonly showMedia: boolean;
}

export function PortSnapshot({
  model,
  onPlaceholder,
  showMedia,
}: PortSnapshotProps) {
  const { t } = useI18n();

  return (
    <section
      className={styles.snapshot}
      data-media={showMedia ? "visible" : "omitted"}
      aria-labelledby="port-snapshot-heading"
    >
      {showMedia ? (
        <div
          className={styles.snapshotMedia}
          data-testid="port-notes-media"
          aria-hidden="true"
        />
      ) : null}
      <div className={styles.snapshotBody}>
        <div className={styles.snapshotTopline}>
          <span className={styles.snapshotKicker}>
            ⚓ {t("portNotes.snapshot.guide")}
          </span>
          <span className={styles.snapshotProductLabel}>
            {t("portNotes.snapshot.productLabel")}
          </span>
        </div>
        <div className={styles.snapshotHeadingRow}>
          <div>
            <h1 id="port-snapshot-heading">{model.name}</h1>
            <p className={styles.location}>{model.location}</p>
          </div>
          <button
            className={styles.secondaryButton}
            type="button"
            aria-label={t("portNotes.snapshot.save")}
            onClick={() => onPlaceholder(t("portNotes.snapshot.save"))}
          >
            <span className={styles.saveLong}>
              + {t("portNotes.snapshot.save")}
            </span>
            <span className={styles.saveShort}>
              {t("portNotes.snapshot.saveShort")}
            </span>
          </button>
        </div>

        <div className={styles.terminalContext}>
          <span className={styles.contextLabel}>{t("portNotes.snapshot.selectedTerminal")}</span>
          <strong>{model.terminal}</strong>
          <span>
            <span className={styles.gateLabel}>{t("portNotes.snapshot.gateLabel")}</span>{" "}
            {model.gate}
          </span>
        </div>

        <div className={styles.snapshotStatusRow}>
          <div className={styles.snapshotShoreLeave}>
            <span>{t("portNotes.snapshot.shoreLeave")}</span>
            <strong>{model.shoreLeave}</strong>
          </div>
          <div
            className={styles.trustChipRow}
            aria-label={t("portNotes.snapshot.confidence")}
          >
            <TrustStatus {...model.confidence} compact />
            <span className={styles.trustChip}>
              {t("portNotes.snapshot.notesSummary", { count: model.noteCount })} · {t(
                "portNotes.snapshot.pendingSummary",
                { count: model.pendingConfirmations },
              )}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
