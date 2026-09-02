import { useEffect, useState } from "react";
import { Link } from "react-router";
import { EmptyState, Skeleton } from "../../components";
import { useServices, useSession } from "../../app/providers";
import { useI18n } from "../../i18n";
import type { CorrectionQueueItem } from "../../types";
import styles from "./admin-corrections.module.css";

function makeKey(): string { return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `review-${Date.now()}`; }

export function AdminCorrectionsRoute() {
  const services = useServices();
  const session = useSession();
  const { t } = useI18n();
  const [items, setItems] = useState<readonly CorrectionQueueItem[]>([]);
  const [status, setStatus] = useState<"pending" | "accepted" | "rejected">("pending");
  const [impacts, setImpacts] = useState<Record<string, "minor" | "material">>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState(false);

  useEffect(() => {
    if (session.status !== "authenticated" || session.profile?.role === "member") return;
    let active = true; setLoading(true); setError(false);
    void services.reputation.listCorrections(status).then((values) => active && setItems(values)).catch(() => active && setError(true)).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [services, session, status]);

  async function review(item: CorrectionQueueItem, decision: "accepted" | "rejected") {
    setError(false);
    try {
      await services.reputation.reviewCorrection({ correctionId: item.id, decision, impact: decision === "accepted" ? impacts[item.id] ?? "material" : undefined, idempotencyKey: makeKey() });
      setItems((current) => current.filter((candidate) => candidate.id !== item.id)); setNotice(true);
    } catch { setError(true); }
  }

  async function openEvidence(path: string) {
    try {
      const url = await services.reputation.getEvidenceUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch { setError(true); }
  }

  if (session.status === "loading") return <Skeleton label={t("state.loading")} lines={6} variant="card" />;
  if (session.status !== "authenticated" || session.profile?.role === "member") return <EmptyState heading={t("admin.notes.accessDenied")} description={t("admin.corrections.description")} announce />;
  return <main className={styles.page}>
    <header><div><p>CrewPort · Moderation</p><h1>{t("admin.corrections.heading")}</h1><span>{t("admin.corrections.description")}</span></div><Link to="/admin/notes">{t("admin.notes.heading")}</Link></header>
    <nav className={styles.tabs} aria-label={t("admin.corrections.statusFilter")}>
      {(["pending", "accepted", "rejected"] as const).map((value) => <button type="button" key={value} aria-pressed={status === value} onClick={() => setStatus(value)}>{t(`admin.corrections.status.${value}`)}</button>)}
    </nav>
    {notice ? <output className={styles.notice}>{t("admin.corrections.updated")}</output> : null}
    {error ? <p className={styles.error} role="alert">{t("admin.corrections.error")}</p> : null}
    {loading ? <Skeleton label={t("state.loading")} lines={6} variant="list" /> : null}
    {!loading && items.length === 0 ? <p>{t("admin.corrections.empty")}</p> : null}
    <div className={styles.list}>{items.map((item) => <article key={item.id}>
      <div className={styles.meta}><strong>{item.portKey}</strong><span>{t(`correction.field.${item.fieldType}`)} · @{item.submitterAlias || "CrewPort"}</span></div>
      <div className={styles.diff}><section><h2>{t("admin.corrections.current")}</h2><p>{item.currentInformation}</p></section><section><h2>{t("admin.corrections.proposed")}</h2><p>{item.proposedInformation}</p></section></div>
      {item.evidencePath ? <button className={styles.evidence} type="button" onClick={() => void openEvidence(item.evidencePath!)}>{t("admin.corrections.evidence")}</button> : null}
      {status === "pending" ? <><fieldset><legend>{t("admin.corrections.approve")}</legend><label><input type="radio" name={`impact-${item.id}`} checked={(impacts[item.id] ?? "material") === "minor"} onChange={() => setImpacts((current) => ({ ...current, [item.id]: "minor" }))} />{t("admin.corrections.minor")}</label><label><input type="radio" name={`impact-${item.id}`} checked={(impacts[item.id] ?? "material") === "material"} onChange={() => setImpacts((current) => ({ ...current, [item.id]: "material" }))} />{t("admin.corrections.material")}</label></fieldset>
      <p className={styles.consequence}>{(impacts[item.id] ?? "material") === "material" ? t("admin.corrections.materialConsequence") : t("admin.corrections.minorConsequence")}</p>
      <div className={styles.actions}><button type="button" onClick={() => void review(item, "rejected")}>{t("admin.corrections.reject")}</button><button type="button" onClick={() => void review(item, "accepted")}>{t("admin.corrections.approve")}</button></div></> : null}
    </article>)}</div>
  </main>;
}
