import { TrustStatus } from "../../../components";
import { useI18n } from "../../../i18n";
import type { QuickNotesModel } from "../port-notes-view-model";
import styles from "../port-notes.module.css";

export interface QuickNotesPanelProps {
  readonly compact?: boolean;
  readonly model: QuickNotesModel;
  readonly onPlaceholder: (feature: string) => void;
}

export function QuickNotesPanel({
  compact = false,
  model,
  onPlaceholder,
}: QuickNotesPanelProps) {
  const { t } = useI18n();
  const bullets = compact
    ? [
        {
          id: "mobile-gate-shuttle",
          text: [model.bullets[0]?.text, model.bullets[1]?.text]
            .filter((value): value is string => Boolean(value))
            .join(" · "),
        },
        {
          id: "mobile-internet-sim",
          text: model.bullets[2]?.text ?? t("portNotes.quickNotes.noPhysicalSim"),
        },
        {
          id: "mobile-taxi-food",
          text: [model.bullets[4]?.text, model.bullets[3]?.text]
            .filter((value): value is string => Boolean(value))
            .join(" · "),
        },
      ]
    : model.bullets;
  const headingId = compact
    ? "mobile-quick-notes-heading"
    : "quick-notes-heading";

  return (
    <aside
      className={`${styles.quickNotes} ${compact ? styles.mobileQuickNotes : ""}`}
      aria-labelledby={headingId}
    >
      {!compact ? (
        <div className={styles.quickNotesIllustration} aria-hidden="true">
          <span>SN</span>
        </div>
      ) : null}
      <div className={styles.quickNotesBody}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>{t("portNotes.quickNotes.eyebrow")}</p>
            <h2 id={headingId}>
              {compact
                ? t("portNotes.quickNotes.mobileHeading")
                : t("portNotes.quickNotes.heading")}
            </h2>
          </div>
          <TrustStatus {...model.trust} compact />
        </div>
        <ul className={styles.quickNotesList}>
          {bullets.map((bullet) => (
            <li key={bullet.id}>{bullet.text}</li>
          ))}
        </ul>
        {!compact ? (
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() => onPlaceholder(t("portNotes.quickNotes.viewAll"))}
          >
            {t("portNotes.quickNotes.viewAll")}
          </button>
        ) : null}
      </div>
    </aside>
  );
}
