import type { PortNoteActionModel } from "../port-notes-view-model";
import { useI18n } from "../../../i18n";
import styles from "../port-notes.module.css";

export interface MainActionTilesProps {
  readonly actions: readonly PortNoteActionModel[];
  readonly onPlaceholder: (feature: string) => void;
}

export function MainActionTiles({
  actions,
  onPlaceholder,
}: MainActionTilesProps) {
  const { t } = useI18n();

  return (
    <section
      className={styles.actionSection}
      aria-labelledby="main-actions-heading"
    >
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionEyebrow}>{t("portNotes.actions.eyebrow")}</p>
          <h2 id="main-actions-heading">{t("portNotes.actions.heading")}</h2>
        </div>
        <span className={styles.sectionCaption}>{t("portNotes.actions.caption")}</span>
      </div>
      <div className={styles.actionGrid}>
        {actions.map((action) => (
          <button
            className={`${styles.actionTile} ${styles[`actionTile${action.tone}`]}`}
            type="button"
            key={action.id}
            data-primary={action.id === "write-note" ? "true" : undefined}
            onClick={() => onPlaceholder(action.label)}
          >
            <span className={styles.actionSymbol} aria-hidden="true">
              {action.symbol}
            </span>
            <span className={styles.actionTileBody}>
              <strong>{action.label}</strong>
              <span>{action.description}</span>
              {action.count ? <small>{action.count}</small> : null}
            </span>
            <span className={styles.actionArrow} aria-hidden="true">
              →
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
