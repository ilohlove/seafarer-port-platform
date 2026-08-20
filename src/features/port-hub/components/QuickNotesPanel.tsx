import { TrustStatus } from "../../../components";
import { useI18n } from "../../../i18n";
import type { QuickNotesModel } from "../port-notes-view-model";
import styles from "../port-notes.module.css";

export interface QuickNotesPanelProps {
  readonly model: QuickNotesModel;
  readonly onPlaceholder: (feature: string) => void;
}

export function QuickNotesPanel({
  model,
  onPlaceholder,
}: QuickNotesPanelProps) {
  const { t } = useI18n();
  const headingId = "quick-notes-heading";

  return (
    <section
      className={styles.quickNotes}
      aria-labelledby={headingId}
    >
      <div className={styles.quickNotesBody}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>{t("portNotes.quickNotes.eyebrow")}</p>
            <h2 id={headingId}>
              {t("portNotes.quickNotes.heading")}
            </h2>
          </div>
          <TrustStatus {...model.trust} compact />
        </div>
        <ul className={styles.quickNotesList}>
          {model.bullets.map((bullet) => (
            <li key={bullet.id}>{bullet.text}</li>
          ))}
        </ul>
        <button
          className={styles.secondaryButton}
          type="button"
          onClick={() => onPlaceholder(t("portNotes.quickNotes.viewAll"))}
        >
          {t("portNotes.quickNotes.viewAll")}
        </button>
      </div>
    </section>
  );
}
