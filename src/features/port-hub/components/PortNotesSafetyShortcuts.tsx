import { TrustStatus } from "../../../components";
import { useI18n } from "../../../i18n";
import type { SafetyShortcutModel } from "../port-notes-view-model";
import styles from "../port-notes.module.css";

export interface PortNotesSafetyShortcutsProps {
  readonly model: SafetyShortcutModel;
  readonly onPlaceholder: (feature: string) => void;
}

export function PortNotesSafetyShortcuts({
  model,
  onPlaceholder,
}: PortNotesSafetyShortcutsProps) {
  const { t } = useI18n();

  return (
    <section className={styles.safetyShortcuts} aria-labelledby="safety-heading">
      <div className={styles.safetyItem}>
        <div className={styles.safetyIcon} aria-hidden="true">
          !
        </div>
        <div>
          <p className={styles.sectionEyebrow}>{t("portNotes.safety.emergencyEyebrow")}</p>
          <h2 id="safety-heading">{model.emergencyName}</h2>
          <strong className={styles.emergencyPhone}>{model.emergencyPhone}</strong>
          <TrustStatus {...model.emergencyTrust} compact />
        </div>
        <button
          className={styles.secondaryButton}
          type="button"
          onClick={() => onPlaceholder("Emergency contacts")}
        >
          {t("portNotes.safety.details")}
        </button>
      </div>
      <div className={styles.safetyItem}>
        <div className={styles.safetyIcon} aria-hidden="true">
          ↩
        </div>
        <div>
          <p className={styles.sectionEyebrow}>{t("portNotes.safety.returnEyebrow")}</p>
          <h2>{t("portNotes.safety.returnHeading")}</h2>
          <p>{model.returnSummary}</p>
          <span className={styles.noteContext}>{model.gate}</span>
        </div>
        <button
          className={styles.secondaryButton}
          type="button"
          onClick={() => onPlaceholder("Return Card")}
        >
          {t("portNotes.safety.returnCard")}
        </button>
      </div>
      <p className={styles.safetyNote}>{model.note}</p>
    </section>
  );
}
