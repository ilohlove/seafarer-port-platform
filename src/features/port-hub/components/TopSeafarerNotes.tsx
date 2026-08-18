import { TrustStatus } from "../../../components";
import { useI18n } from "../../../i18n";
import type { PortNoteCardModel } from "../port-notes-view-model";
import styles from "../port-notes.module.css";

export interface TopSeafarerNotesProps {
  readonly notes: readonly PortNoteCardModel[];
  readonly onPlaceholder: (feature: string) => void;
}

export function TopSeafarerNotes({
  notes,
  onPlaceholder,
}: TopSeafarerNotesProps) {
  const { t } = useI18n();
  const highlightedNotes = notes.slice(0, 3);

  return (
    <section aria-labelledby="top-notes-heading">
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionEyebrow}>{t("portNotes.notes.eyebrow")}</p>
          <h2 id="top-notes-heading">{t("portNotes.notes.heading")}</h2>
        </div>
        <button
          className={styles.textButton}
          type="button"
          onClick={() => onPlaceholder("View all notes")}
        >
          {t("portNotes.notes.viewAll")}
        </button>
      </div>
      {highlightedNotes.length > 0 ? (
        <div className={styles.notesList}>
          {highlightedNotes.map((note) => (
            <article className={styles.noteCard} key={note.id}>
              <div className={styles.noteMeta}>
                <span className={styles.topicTag}>{note.topic}</span>
                <TrustStatus {...note.trust} compact />
              </div>
              <h3>{note.title}</h3>
              <p>{note.summary}</p>
              <span className={styles.noteAuthor}>{note.authorLabel}</span>
              {note.context ? (
                <span className={styles.noteContext}>{note.context}</span>
              ) : null}
              <div className={styles.noteEvidence}>
                <span>{note.confirmations}</span>
                <span>{note.usefulness}</span>
              </div>
              <div className={styles.noteActions}>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={() => onPlaceholder(`View note: ${note.title}`)}
                >
                  {t("portNotes.notes.view")}
                </button>
                <button
                  className={styles.textButton}
                  type="button"
                  onClick={() => onPlaceholder(`Confirm: ${note.title}`)}
                >
                  {t("portNotes.notes.confirm")}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.noDataCard}>
          <h3>{t("portNotes.notes.emptyHeading")}</h3>
          <p>{t("portNotes.notes.emptyDescription")}</p>
          <button
            className={styles.primaryButton}
            type="button"
            onClick={() => onPlaceholder("Write a Note")}
          >
            {t("portNotes.notes.write")}
          </button>
        </div>
      )}
    </section>
  );
}
