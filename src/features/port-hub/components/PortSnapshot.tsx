import { TrustStatus, type TrustStatusPresentation } from "../../../components";
import { useI18n } from "../../../i18n";
import type {
  InternetDealModel,
  PortSnapshotModel,
} from "../port-notes-view-model";
import styles from "../port-notes.module.css";

export interface PortSnapshotProps {
  readonly model: PortSnapshotModel;
  readonly deal: InternetDealModel;
  readonly onPlaceholder: (feature: string) => void;
  readonly showMedia: boolean;
}

export function PortSnapshot({
  model,
  deal,
  onPlaceholder,
  showMedia,
}: PortSnapshotProps) {
  const { t } = useI18n();
  const chips: readonly [string, TrustStatusPresentation][] = [
    [t("portNotes.snapshot.shoreLeave"), model.confidence],
    [`${model.noteCount} ${t("portNotes.snapshot.notesUnit")}`, model.confidence],
    [t("portNotes.snapshot.confidence"), model.confidence],
  ];

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
        >
          <span>CREWPORT · PORT NOTES</span>
        </div>
      ) : null}
      <div className={styles.snapshotBody}>
        <div className={styles.sectionEyebrow}>{t("portNotes.snapshot.eyebrow")}</div>
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
          <span>{model.gate}</span>
        </div>

        <div className={styles.snapshotFacts}>
          <div>
            <span>{t("portNotes.snapshot.shoreLeave")}</span>
            <strong>{model.shoreLeave}</strong>
          </div>
          <div>
            <span>{t("portNotes.snapshot.bestInternet")}</span>
            <strong>{deal.name}</strong>
            <small>
              {deal.plan} · {deal.price}
            </small>
          </div>
          <div>
            <span>{t("portNotes.snapshot.transport")}</span>
            <strong>{model.transport}</strong>
          </div>
          <div>
            <span>{t("portNotes.snapshot.community")}</span>
            <strong>
              {t("portNotes.snapshot.notesSummary", { count: model.noteCount })}
            </strong>
            <small>
              {t("portNotes.snapshot.pendingSummary", {
                count: model.pendingConfirmations,
              })}
            </small>
          </div>
        </div>

        <div
          className={styles.trustChipRow}
          aria-label={t("portNotes.snapshot.confidence")}
        >
          {chips.map(([label, trust]) => (
            <span className={styles.trustChip} key={label}>
              <span>{label}</span>
              <TrustStatus {...trust} compact />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
