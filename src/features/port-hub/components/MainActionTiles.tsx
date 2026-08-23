import type { PortNoteActionModel } from "../port-notes-view-model";
import { useI18n } from "../../../i18n";
import styles from "../port-notes.module.css";

export interface MainActionTilesProps {
  readonly actions: readonly PortNoteActionModel[];
  readonly onAction: (action: PortNoteActionModel) => void;
}

function ActionIcon({ id }: { readonly id: string }) {
  const paths = {
    "compare-esim": (
      <>
        <path d="M5 19a10 10 0 0 1 14 0M8 15a6 6 0 0 1 8 0M11 11a2 2 0 0 1 2 0M12 21V9" />
      </>
    ),
    "physical-sim": (
      <>
        <path d="M7 3h7l4 4v14H7zM14 3v5h4" />
        <path d="M10 12h5v5h-5zM12.5 12v5M10 14.5h5" />
      </>
    ),
    "shore-leave": (
      <>
        <path d="M5 17h14l-1-7H6zM7 10 8.5 6h7l1.5 4M8 17v2M16 17v2" />
        <circle cx="8" cy="14" r="1" />
        <circle cx="16" cy="14" r="1" />
      </>
    ),
    "food-fruit": (
      <>
        <circle cx="9" cy="14" r="5" />
        <circle cx="15" cy="14" r="5" />
        <path d="M12 8c0-3 2-5 5-5M12 8c-2-2-4-2-6-1" />
      </>
    ),
    "shopping-gifts": (
      <>
        <path d="M5 8h14l-1 13H6zM9 9V6a3 3 0 0 1 6 0v3" />
      </>
    ),
    "seaman-club": (
      <>
        <path d="M12 21S4 16 4 9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 7-6 12-6 12Z" />
      </>
    ),
    "other-notes": (
      <>
        <path d="M7 3h7l4 4v14H7zM14 3v5h4" />
        <path d="M10 12h5M10 15h5M10 18h3" />
      </>
    ),
    "write-note": (
      <>
        <path d="m4 20 4-1 11-11-3-3L5 16zM14 7l3 3" />
      </>
    ),
  } as const;
  const icon = paths[id as keyof typeof paths] ?? paths["write-note"];

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icon}
    </svg>
  );
}

export function MainActionTiles({
  actions,
  onAction,
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
            className={styles.actionTile}
            type="button"
            id={`quick-action-${action.id}`}
            key={action.id}
            data-tone={action.tone}
            data-action-id={action.id}
            data-primary={action.id === "write-note" ? "true" : undefined}
            onClick={() => onAction(action)}
          >
            <span className={styles.actionSymbol} aria-hidden="true">
              <ActionIcon id={action.id} />
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
