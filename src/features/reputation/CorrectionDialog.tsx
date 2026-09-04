import { useEffect, useMemo, useRef, useState } from "react";

import { useServices } from "../../app/providers";
import { useI18n } from "../../i18n";
import { createIdempotencyKey } from "../../idempotency";
import type { NoteCorrectionChangeSubmission, PortNoteRecord, VerificationPeriod } from "../../types";
import { getNoteFieldLabelKey, getNoteTopicDefinition, isContactNoteField } from "../port-hub/note-topic-fields";
import { resolveNoteFieldDisplayRule } from "../port-hub/note-field-config";
import styles from "./reputation.module.css";

const periods: readonly VerificationPeriod[] = ["today", "last7Days", "last30Days", "oneToThreeMonths", "older"];

function normalizeDetail(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function buildCorrectionChanges(
  note: PortNoteRecord,
  summary: string,
  values: Readonly<Record<string, string>>,
  activeKeys: readonly string[],
): readonly NoteCorrectionChangeSubmission[] {
  const changes: NoteCorrectionChangeSubmission[] = [];
  const proposedSummary = summary.trim();
  if (proposedSummary !== note.summary) {
    changes.push({ fieldKey: "summary", currentValue: note.summary, proposedValue: proposedSummary });
  }
  const keys = new Set([...Object.keys(note.details).filter((key) => key !== "context"), ...activeKeys]);
  for (const key of keys) {
    const currentValue = normalizeDetail(note.details[key]);
    const proposedValue = normalizeDetail(values[key]);
    if (currentValue !== proposedValue) changes.push({ fieldKey: key, currentValue, proposedValue });
  }
  return changes;
}

export function CorrectionDialog({ note, open, onClose, onSuccess }: {
  readonly note?: PortNoteRecord;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSuccess: () => void;
}) {
  const services = useServices();
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const [summary, setSummary] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [activeKeys, setActiveKeys] = useState<readonly string[]>([]);
  const [period, setPeriod] = useState<VerificationPeriod>("last7Days");
  const [moderationNote, setModerationNote] = useState("");
  const [evidence, setEvidence] = useState<File>();
  const [contactPermission, setContactPermission] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const pendingSubmissionRef = useRef<{ readonly signature: string; readonly key: string; evidencePath?: string } | undefined>(undefined);

  const topicFields = useMemo(() => note ? getNoteTopicDefinition(note.topic).fields : [], [note]);
  const availableFields = topicFields.filter((field) => !activeKeys.includes(field.key));
  const changes = note ? buildCorrectionChanges(note, summary, values, activeKeys) : [];
  const changesContact = Boolean(note && changes.some((change) => isContactNoteField(note.topic, change.fieldKey) && change.proposedValue));
  const canSubmit = Boolean(note && summary.trim() && changes.length > 0 && (!changesContact || contactPermission));

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && note && !dialog.open) {
      const visibleDetails = Object.fromEntries(Object.entries(note.details).filter(([key]) => key !== "context"));
      setSummary(note.summary);
      setValues(visibleDetails);
      setActiveKeys(Object.keys(visibleDetails));
      setPeriod("last7Days");
      setModerationNote("");
      setEvidence(undefined);
      setContactPermission(false);
      setError(false);
      pendingSubmissionRef.current = undefined;
      dialog.showModal?.();
    }
    if (!open && dialog.open) dialog.close();
  }, [note, open]);

  function labelFor(key: string): string {
    if (!note) return key;
    const labelKey = getNoteFieldLabelKey(note.topic, key);
    return labelKey ? t(labelKey) : key;
  }

  function addField(key: string) {
    if (!key || activeKeys.includes(key)) return;
    setActiveKeys((current) => [...current, key]);
    setValues((current) => ({ ...current, [key]: "" }));
  }

  function removeAddedField(key: string) {
    if (note?.details[key] !== undefined) return;
    setActiveKeys((current) => current.filter((candidate) => candidate !== key));
    setValues((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!note || !canSubmit) return;
    setBusy(true);
    setError(false);
    try {
      const signature = JSON.stringify({ changes, period, moderationNote: moderationNote.trim(), evidence: evidence ? [evidence.name, evidence.size, evidence.lastModified] : null, changesContact, contactPermission });
      if (pendingSubmissionRef.current?.signature !== signature) {
        pendingSubmissionRef.current = { signature, key: createIdempotencyKey() };
      }
      const pending = pendingSubmissionRef.current;
      const evidencePath = pending.evidencePath ?? (evidence ? await services.reputation.uploadEvidence(evidence, "correction") : undefined);
      pending.evidencePath = evidencePath;
      await services.reputation.submitCorrection({
        noteId: note.id,
        changes,
        verificationPeriod: period,
        note: moderationNote.trim() || undefined,
        evidencePath,
        contactPermissionConfirmed: changesContact ? contactPermission : undefined,
        idempotencyKey: pending.key,
      });
      pendingSubmissionRef.current = undefined;
      onSuccess();
      ref.current?.close();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return <dialog ref={ref} className={styles.actionSheet} aria-labelledby="correction-dialog-title" onClose={onClose}>
    <div className={styles.sheetHandle} aria-hidden="true" />
    <header><h2 id="correction-dialog-title">{t("correction.title")}</h2><button type="button" aria-label={t("xp.close")} onClick={() => ref.current?.close()}>×</button></header>
    <form className={styles.actionForm} onSubmit={(event) => void submit(event)}>
      <p className={styles.correctionTopic}>{note ? t(getNoteTopicDefinition(note.topic).label) : null}</p>
      <label className={styles.commentField}>
        <span>{t("portNotes.topicPanel.takeaway")}</span>
        <textarea required maxLength={resolveNoteFieldDisplayRule("mainNote").hardLimit} value={summary} onChange={(event) => setSummary(event.currentTarget.value)} />
      </label>
      {activeKeys.length > 0 ? <div className={styles.correctionFields}>
        {activeKeys.map((key) => {
          const rule = resolveNoteFieldDisplayRule(key);
          const removing = note?.details[key] !== undefined && !normalizeDetail(values[key]);
          return <div className={styles.correctionField} key={key}>
            <label>
              <span>{labelFor(key)}</span>
              {rule.inputControl === "textarea"
                ? <textarea rows={2} maxLength={rule.hardLimit} value={values[key] ?? ""} onChange={(event) => { const value = event.currentTarget.value; setValues((current) => ({ ...current, [key]: value })); }} />
                : <input type="text" maxLength={rule.hardLimit} value={values[key] ?? ""} onChange={(event) => { const value = event.currentTarget.value; setValues((current) => ({ ...current, [key]: value })); }} />}
            </label>
            {removing ? <small>{t("correction.willRemove")}</small> : null}
            {note?.details[key] === undefined ? <button type="button" onClick={() => removeAddedField(key)}>{t("correction.removeField")}</button> : null}
          </div>;
        })}
      </div> : null}
      {availableFields.length > 0 ? <label className={styles.commentField}>
        <span>{t("correction.addContent")}</span>
        <select value="" onChange={(event) => addField(event.currentTarget.value)}>
          <option value="">{t("correction.chooseField")}</option>
          {availableFields.map((field) => <option key={field.key} value={field.key}>{t(field.label)}</option>)}
        </select>
      </label> : null}
      {changesContact ? <label className={styles.correctionConsent}>
        <input type="checkbox" checked={contactPermission} onChange={(event) => setContactPermission(event.currentTarget.checked)} />
        <span>{t("portNotes.capture.contactPermission")}</span>
      </label> : null}
      <fieldset><legend>{t("confirmation.when")}</legend><div className={styles.periods}>{periods.map((value) => <label key={value}><input className="visually-hidden" type="radio" name="correction-period" checked={period === value} onChange={() => setPeriod(value)} /><span>{t(`confirmation.period.${value}`)}</span></label>)}</div></fieldset>
      <label className={styles.commentField}><span>{t("confirmation.comment")}</span><textarea maxLength={1000} value={moderationNote} onChange={(event) => setModerationNote(event.currentTarget.value)} /></label>
      <label className={styles.fileField}><span>{t("confirmation.evidence")}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setEvidence(event.currentTarget.files?.[0])} /><small>{t("confirmation.evidenceHelp")}</small></label>
      {!changes.length ? <p className={styles.correctionHint}>{t("correction.noChanges")}</p> : null}
      {changesContact && !contactPermission ? <p className={styles.correctionHint}>{t("portNotes.capture.contactPermissionRequired")}</p> : null}
      {error ? <p className={styles.error} role="alert">{t("correction.error")}</p> : null}
      <button className={styles.actionSubmit} type="submit" disabled={busy || !canSubmit}>{busy ? t("correction.submitting") : t("correction.submit")}</button>
    </form>
  </dialog>;
}
