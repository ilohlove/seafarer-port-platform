import { TrustStatus } from "../../../components";
import { useI18n } from "../../../i18n";
import type { PortNoteCardModel } from "../port-notes-view-model";
import styles from "../port-notes.module.css";
import { UserRankIdentity } from "../../user-rank";

export interface RecentCommunityNotesProps {
  readonly notes: readonly PortNoteCardModel[];
  readonly onPlaceholder: (feature: string) => void;
}

export function RecentCommunityNotes({
  notes,
  onPlaceholder,
}: RecentCommunityNotesProps) {
  const { t } = useI18n();

  if (notes.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="recent-notes-heading">
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionEyebrow}>
            {t("portNotes.notes.recentEyebrow")}
          </p>
          <h2 id="recent-notes-heading">
            {t("portNotes.notes.recentHeading")}
          </h2>
        </div>
      </div>
      <div className={styles.recentNotesList}>
        {notes.map((note) => (
          <article className={styles.recentNoteRow} key={note.id}>
            <span className={styles.topicTag}>{note.topic}</span>
            <div className={styles.recentNoteBody}>
              <strong>{note.title}</strong>
              <UserRankIdentity
                alias={note.authorLabel}
                rank={note.authorRank}
                context={note.context}
              />
              <small>
                {note.usefulness} · {note.confirmations}
              </small>
            </div>
            <TrustStatus {...note.trust} compact />
            <button
              className={styles.textButton}
              type="button"
              onClick={() =>
                onPlaceholder(
                  t("portNotes.notes.viewPlaceholder", { title: note.title }),
                )
              }
            >
              {t("portNotes.notes.view")}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
