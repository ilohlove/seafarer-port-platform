import { useEffect, useRef, useState } from "react";
import { useServices } from "../../app/providers";
import { useI18n } from "../../i18n";
import type { ConfirmationResult, VerificationPeriod } from "../../types";
import styles from "./reputation.module.css";

const periods: readonly VerificationPeriod[] = ["today", "last7Days", "last30Days", "oneToThreeMonths", "older"];

function idempotencyKey(prefix: string): string {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function VerifiedConfirmationDialog({ noteId, open, onClose, onSuccess, onBusyChange }: { readonly noteId?: string; readonly open: boolean; readonly onClose: () => void; readonly onSuccess: (result: ConfirmationResult) => void; readonly onBusyChange?: (busy: boolean) => void }) {
  const services = useServices();
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const [directlyVerified, setDirectlyVerified] = useState(false);
  const [period, setPeriod] = useState<VerificationPeriod>("last7Days");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setDirectlyVerified(false);
      dialog.showModal?.();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!noteId || !directlyVerified || busyRef.current) return;
    busyRef.current = true;
    setBusy(true); setError(false);
    onBusyChange?.(true);
    try {
      const result = await services.reputation.confirmNote({ noteId, source: "direct", verificationPeriod: period, comment: comment.trim() || undefined, idempotencyKey: idempotencyKey("confirm") });
      onSuccess(result); ref.current?.close();
    } catch { setError(true); } finally { busyRef.current = false; setBusy(false); onBusyChange?.(false); }
  }

  return <dialog ref={ref} className={styles.actionSheet} aria-labelledby="confirmation-dialog-title" onClose={onClose}>
    <div className={styles.sheetHandle} aria-hidden="true" />
    <header><h2 id="confirmation-dialog-title">{t("confirmation.title")}</h2><button type="button" aria-label={t("xp.close")} onClick={() => ref.current?.close()}>×</button></header>
    <form className={styles.actionForm} onSubmit={(event) => void submit(event)}>
      <fieldset>
        <legend>{t("confirmation.how")}</legend>
        <label className={styles.verificationOption} aria-label={t("confirmation.source.direct")}>
          <input type="checkbox" checked={directlyVerified} onChange={(event) => setDirectlyVerified(event.currentTarget.checked)} />
          <span className={styles.verificationCopy}>
            <span className={styles.verificationTitle}>{t("confirmation.source.direct")}</span>
            <small>{t("confirmation.directHelp")}</small>
          </span>
        </label>
      </fieldset>
      <fieldset><legend>{t("confirmation.when")}</legend><div className={styles.periods}>{periods.map((value) => <label key={value}><input className="visually-hidden" type="radio" name="verification-period" value={value} checked={period === value} onChange={() => setPeriod(value)} /><span>{t(`confirmation.period.${value}`)}</span></label>)}</div></fieldset>
      <label className={styles.commentField}><span>{t("confirmation.comment")}</span><textarea maxLength={1000} value={comment} placeholder={t("confirmation.commentPlaceholder")} onChange={(event) => setComment(event.currentTarget.value)} /></label>
      {error ? <p className={styles.error} role="alert">{t("confirmation.error")}</p> : null}
      <button className={styles.actionSubmit} type="submit" disabled={busy || !directlyVerified}>{busy ? t("confirmation.submitting") : t("confirmation.submit")}</button>
      <p className={styles.trustNote}>▣ {t("confirmation.trustNote")}</p>
    </form>
  </dialog>;
}
