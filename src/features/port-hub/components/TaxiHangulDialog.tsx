import { useEffect, useRef } from "react";

import { TrustStatus } from "../../../components";
import { useI18n } from "../../../i18n";
import type { TaxiPhraseModel } from "../port-notes-view-model";
import styles from "../port-notes.module.css";

export interface TaxiHangulDialogProps {
  readonly model: TaxiPhraseModel;
  readonly open: boolean;
  readonly onClose: () => void;
}

export function TaxiHangulDialog({
  model,
  open,
  onClose,
}: TaxiHangulDialogProps) {
  const { t } = useI18n();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "Tab") {
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className={styles.dialogBackdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <dialog
        open
        className={styles.taxiDialog}
        aria-modal="true"
        aria-labelledby="taxi-dialog-heading"
        aria-describedby="taxi-dialog-description"
      >
        <div className={styles.dialogHeader}>
          <div>
            <p className={styles.sectionEyebrow}>
              {t("portNotes.taxiDialog.eyebrow")}
            </p>
            <h2 id="taxi-dialog-heading">
              {t("portNotes.taxiDialog.heading")}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            className={styles.dialogClose}
            type="button"
            aria-label={t("portNotes.taxiDialog.close")}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <p className={styles.dialogContext}>
          {model.contextLabel} · {model.gate}
        </p>
        <p className={styles.hangulPhrase} lang="ko">
          {model.phrase}
        </p>
        <p id="taxi-dialog-description">
          {t("portNotes.taxiDialog.meaning")}
        </p>
        <div className={styles.dialogTrust}>
          <TrustStatus {...model.trust} compact />
          <span>{t("portNotes.taxiDialog.warning")}</span>
        </div>
        <button
          className={styles.primaryButton}
          type="button"
          onClick={onClose}
        >
          {t("portNotes.taxiDialog.done")}
        </button>
      </dialog>
    </div>
  );
}
