import { useEffect, useRef, useState } from "react";
import { useServices } from "../../app/providers";
import { useI18n } from "../../i18n";
import type { CorrectionFieldType, VerificationPeriod } from "../../types";
import styles from "./reputation.module.css";

const fields: readonly CorrectionFieldType[] = ["price", "location", "hours", "contact", "service", "operatingStatus", "other"];
const periods: readonly VerificationPeriod[] = ["today", "last7Days", "last30Days", "oneToThreeMonths", "older"];

export function CorrectionDialog({ noteId, currentInformation, open, onClose, onSuccess }: { readonly noteId?: string; readonly currentInformation: string; readonly open: boolean; readonly onClose: () => void; readonly onSuccess: () => void }) {
  const services = useServices();
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const [fieldType, setFieldType] = useState<CorrectionFieldType>("price");
  const [proposed, setProposed] = useState("");
  const [period, setPeriod] = useState<VerificationPeriod>("last7Days");
  const [note, setNote] = useState("");
  const [evidence, setEvidence] = useState<File>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => { const dialog = ref.current; if (!dialog) return; if (open && !dialog.open) dialog.showModal?.(); if (!open && dialog.open) dialog.close(); }, [open]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!noteId || !proposed.trim()) return;
    setBusy(true); setError(false);
    try {
      const evidencePath = evidence ? await services.reputation.uploadEvidence(evidence, "correction") : undefined;
      await services.reputation.submitCorrection({ noteId, action: fieldType === "operatingStatus" && /đóng|closed|inactive/iu.test(proposed) ? "INVALIDATE" : "UPDATE", fieldType, currentInformation, proposedInformation: proposed.trim(), verificationPeriod: period, note: note.trim() || undefined, evidencePath, idempotencyKey: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `correction-${Date.now()}` });
      onSuccess(); ref.current?.close(); setProposed(""); setNote("");
    } catch { setError(true); } finally { setBusy(false); }
  }

  return <dialog ref={ref} className={styles.actionSheet} aria-labelledby="correction-dialog-title" onClose={onClose}>
    <div className={styles.sheetHandle} aria-hidden="true" />
    <header><h2 id="correction-dialog-title">{t("correction.title")}</h2><button type="button" aria-label={t("xp.close")} onClick={() => ref.current?.close()}>×</button></header>
    <form className={styles.actionForm} onSubmit={(event) => void submit(event)}>
      <label className={styles.commentField}><span>{t("correction.field")}</span><select value={fieldType} onChange={(event) => setFieldType(event.currentTarget.value as CorrectionFieldType)}>{fields.map((value) => <option value={value} key={value}>{t(`correction.field.${value}`)}</option>)}</select></label>
      <label className={styles.commentField}><span>{t("correction.current")}</span><textarea value={currentInformation} readOnly /></label>
      <label className={styles.commentField}><span>{t("correction.proposed")}</span><textarea required maxLength={4000} value={proposed} onChange={(event) => setProposed(event.currentTarget.value)} /></label>
      <fieldset><legend>{t("confirmation.when")}</legend><div className={styles.periods}>{periods.map((value) => <label key={value}><input className="visually-hidden" type="radio" name="correction-period" checked={period === value} onChange={() => setPeriod(value)} /><span>{t(`confirmation.period.${value}`)}</span></label>)}</div></fieldset>
      <label className={styles.commentField}><span>{t("confirmation.comment")}</span><textarea maxLength={1000} value={note} onChange={(event) => setNote(event.currentTarget.value)} /></label>
      <label className={styles.fileField}><span>{t("confirmation.evidence")}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setEvidence(event.currentTarget.files?.[0])} /><small>{t("confirmation.evidenceHelp")}</small></label>
      {error ? <p className={styles.error} role="alert">{t("correction.error")}</p> : null}
      <button className={styles.actionSubmit} type="submit" disabled={busy || proposed.trim().length === 0}>{busy ? t("correction.submitting") : t("correction.submit")}</button>
    </form>
  </dialog>;
}
