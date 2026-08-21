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
        </div>
        <ul className={styles.quickNotesList}>
          {model.items.map((item) => (
            <li className={styles.quickInfoCard} key={item.id}>
              <div className={styles.quickInfoHeader}>
                <span className={styles.quickInfoSymbol} aria-hidden="true">
                  {item.symbol}
                </span>
                <h3>{item.title}</h3>
                <TrustStatus {...item.trust} compact />
              </div>
              <p>{item.summary}</p>
              {item.hint ? <small>{item.hint}</small> : null}
            </li>
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
