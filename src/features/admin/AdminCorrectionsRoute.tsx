import { useEffect, useState } from "react";

import { useServices, useSession } from "../../app/providers";
import { EmptyState, Skeleton } from "../../components";
import { useI18n, type TranslationKey } from "../../i18n";
import { createIdempotencyKey } from "../../idempotency";
import type { CorrectionQueueItem, NoteCorrectionChangeReadModel } from "../../types";
import { getNoteFieldLabelKey } from "../port-hub/note-topic-fields";
import styles from "./admin-corrections.module.css";
import { AdminModerationLayout } from "./AdminModerationLayout";

function changesFor(item: CorrectionQueueItem): readonly NoteCorrectionChangeReadModel[] {
  if (item.changes.length) return item.changes;
  return [{
    id: `legacy-${item.id}`,
    fieldKey: "summary",
    currentValue: item.currentInformation,
    proposedValue: item.proposedInformation,
    status: item.status === "rejected" ? "rejected" : item.status === "pending" ? "pending" : "accepted",
  }];
}

export function AdminCorrectionsRoute() {
  const services = useServices();
  const session = useSession();
  const { t } = useI18n();
  const [items, setItems] = useState<readonly CorrectionQueueItem[]>([]);
  const [status, setStatus] = useState<"pending" | "accepted" | "rejected">("pending");
  const [impacts, setImpacts] = useState<Record<string, "minor" | "material">>({});
  const [selections, setSelections] = useState<Record<string, readonly string[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<TranslationKey>();
  const [notice, setNotice] = useState(false);

  useEffect(() => {
    if (session.status !== "authenticated" || session.profile?.role === "member") return;
    let active = true;
    setLoading(true);
    setError(undefined);
    void services.reputation.listCorrections(status)
      .then((values) => active && setItems(values))
      .catch(() => active && setError("admin.corrections.error"))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [services, session, status]);

  async function review(item: CorrectionQueueItem, decision: "accepted" | "rejected", acceptAll = false) {
    setError(undefined);
    const changes = changesFor(item);
    const acceptedChangeIds = decision === "accepted"
      ? acceptAll ? changes.map((change) => change.id) : selections[item.id] ?? changes.map((change) => change.id)
      : [];
    if (decision === "accepted" && acceptedChangeIds.length === 0) return;
    try {
      await services.reputation.reviewCorrection({
        correctionId: item.id,
        decision,
        acceptedChangeIds,
        impact: decision === "accepted" ? impacts[item.id] ?? "material" : undefined,
        idempotencyKey: createIdempotencyKey(),
      });
      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
      setNotice(true);
    } catch (caught) {
      setError(String(caught).includes("correction_stale") ? "admin.corrections.stale" : "admin.corrections.error");
    }
  }

  async function openEvidence(path: string) {
    try {
      const url = await services.reputation.getEvidenceUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setError("admin.corrections.error");
    }
  }

  if (session.status === "loading") return <Skeleton label={t("state.loading")} lines={6} variant="card" />;
  if (session.status !== "authenticated" || session.profile?.role === "member") return <EmptyState heading={t("admin.notes.accessDenied")} description={t("admin.corrections.description")} announce />;

  return <AdminModerationLayout><section className={styles.page}>
    <header><div><p>CrewPort · Moderation</p><h1>{t("admin.corrections.heading")}</h1><span>{t("admin.corrections.description")}</span></div></header>
    <nav className={styles.tabs} aria-label={t("admin.corrections.statusFilter")}>
      {(["pending", "accepted", "rejected"] as const).map((value) => <button type="button" key={value} aria-pressed={status === value} onClick={() => setStatus(value)}>{t(`admin.corrections.status.${value}`)}</button>)}
    </nav>
    {notice ? <output className={styles.notice}>{t("admin.corrections.updated")}</output> : null}
    {error ? <p className={styles.error} role="alert">{t(error)}</p> : null}
    {loading ? <Skeleton label={t("state.loading")} lines={6} variant="list" /> : null}
    {!loading && items.length === 0 ? <p>{t("admin.corrections.empty")}</p> : null}
    <div className={styles.list}>{items.map((item) => {
      const changes = changesFor(item);
      const selected = selections[item.id] ?? changes.map((change) => change.id);
      return <article key={item.id}>
        <div className={styles.meta}><strong>{item.portKey}</strong><span>@{item.submitterAlias || "CrewPort"}</span></div>
        {item.status === "partiallyAccepted" ? <p className={styles.partial}>{t("admin.corrections.partial")}</p> : null}
        <div className={styles.changeList}>{changes.map((change) => {
          const label = t(getNoteFieldLabelKey(item.topic, change.fieldKey) ?? "correction.field.other");
          return <section className={styles.changeItem} key={change.id}>
            {status === "pending" ? <label className={styles.changeSelect}>
              <input type="checkbox" checked={selected.includes(change.id)} aria-label={`${t("admin.corrections.selectChange")}: ${label}`} onChange={() => setSelections((current) => ({ ...current, [item.id]: selected.includes(change.id) ? selected.filter((id) => id !== change.id) : [...selected, change.id] }))} />
              <strong>{label}</strong>
            </label> : <strong>{label}</strong>}
            <div className={styles.diff}>
              <section><h2>{t("admin.corrections.current")}</h2><p>{change.currentValue ?? t("admin.corrections.noValue")}</p></section>
              <section><h2>{t("admin.corrections.proposed")}</h2><p>{change.proposedValue ?? t("admin.corrections.removeValue")}</p></section>
            </div>
          </section>;
        })}</div>
        {item.evidencePath ? <button className={styles.evidence} type="button" onClick={() => void openEvidence(item.evidencePath!)}>{t("admin.corrections.evidence")}</button> : null}
        {status === "pending" ? <>
          <fieldset><legend>{t("admin.corrections.approve")}</legend><label><input type="radio" name={`impact-${item.id}`} checked={(impacts[item.id] ?? "material") === "minor"} onChange={() => setImpacts((current) => ({ ...current, [item.id]: "minor" }))} />{t("admin.corrections.minor")}</label><label><input type="radio" name={`impact-${item.id}`} checked={(impacts[item.id] ?? "material") === "material"} onChange={() => setImpacts((current) => ({ ...current, [item.id]: "material" }))} />{t("admin.corrections.material")}</label></fieldset>
          <p className={styles.consequence}>{(impacts[item.id] ?? "material") === "material" ? t("admin.corrections.materialConsequence") : t("admin.corrections.minorConsequence")}</p>
          <div className={styles.actions}><button type="button" onClick={() => void review(item, "rejected")}>{t("admin.corrections.reject")}</button><button type="button" disabled={selected.length === 0} onClick={() => void review(item, "accepted")}>{t("admin.corrections.acceptSelected")}</button><button type="button" onClick={() => void review(item, "accepted", true)}>{t("admin.corrections.acceptAll")}</button></div>
        </> : null}
      </article>;
    })}</div>
  </section></AdminModerationLayout>;
}
