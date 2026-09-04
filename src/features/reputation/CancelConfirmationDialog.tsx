import { useEffect, useRef, useState } from "react";

import { useServices } from "../../app/providers";
import { useI18n } from "../../i18n";
import { createIdempotencyKey } from "../../idempotency";
import type { ConfirmationRevocationResult } from "../../types";
import styles from "./reputation.module.css";

export function CancelConfirmationDialog({
  noteId,
  open,
  onClose,
  onSuccess,
  onBusyChange,
}: {
  readonly noteId?: string;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSuccess: (result: ConfirmationRevocationResult) => void;
  readonly onBusyChange?: (busy: boolean) => void;
}) {
  const services = useServices();
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const busyRef = useRef(false);
  const operationKeyRef = useRef<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      operationKeyRef.current = createIdempotencyKey();
      setError(false);
      dialog.showModal?.();
    }
    if (!open && dialog.open) dialog.close();
    if (!open) operationKeyRef.current = undefined;
  }, [open]);

  async function revoke() {
    if (!noteId || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(false);
    onBusyChange?.(true);
    try {
      const result = await services.reputation.revokeNoteConfirmation(noteId, operationKeyRef.current ??= createIdempotencyKey());
      operationKeyRef.current = undefined;
      onSuccess(result);
      ref.current?.close();
    } catch {
      setError(true);
    } finally {
      busyRef.current = false;
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  return (
    <dialog ref={ref} className={styles.actionSheet} aria-labelledby="cancel-confirmation-title" onClose={onClose}>
      <div className={styles.sheetHandle} aria-hidden="true" />
      <header>
        <h2 id="cancel-confirmation-title">{t("confirmation.cancelTitle")}</h2>
        <button type="button" aria-label={t("xp.close")} disabled={busy} onClick={() => ref.current?.close()}>×</button>
      </header>
      <div className={styles.cancelConfirmationBody}>
        <p>{t("confirmation.cancelDescription")}</p>
        {error ? <p className={styles.error} role="alert">{t("confirmation.cancelError")}</p> : null}
        <div className={styles.cancelConfirmationActions}>
          <button className={styles.cancelKeep} type="button" disabled={busy} onClick={() => ref.current?.close()}>
            {t("confirmation.keep")}
          </button>
          <button className={styles.cancelConfirm} type="button" disabled={busy} onClick={() => void revoke()}>
            {busy ? t("confirmation.cancelling") : t("confirmation.cancelAction")}
          </button>
        </div>
      </div>
    </dialog>
  );
}
