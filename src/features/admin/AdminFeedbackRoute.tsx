import { useEffect, useState } from "react";
import { Link } from "react-router";

import { useServices, useSession } from "../../app/providers";
import { EmptyState, Skeleton } from "../../components";
import { useI18n } from "../../i18n";
import type { NoteFeedbackRecord, NoteFeedbackState } from "../../types";
import styles from "./admin-notes.module.css";

export function AdminFeedbackRoute() {
  const services = useServices();
  const session = useSession();
  const { t } = useI18n();
  const [filter, setFilter] = useState<NoteFeedbackState>("pending");
  const [items, setItems] = useState<readonly NoteFeedbackRecord[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (session.status !== "authenticated" || session.profile?.role === "member") return;
    let active = true;
    setLoading(true);
    setError(false);
    void services.portNotes.listFeedbackModerationQueue(filter)
      .then((rows) => { if (active) setItems(rows); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filter, services, session]);

  async function review(item: NoteFeedbackRecord, decision: "approved" | "rejected") {
    const reason = reasons[item.id]?.trim();
    if (decision === "rejected" && !reason) { setError(true); return; }
    setError(false);
    try {
      await services.portNotes.moderateFeedback(item.id, decision, reason);
      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
    } catch { setError(true); }
  }

  if (session.status === "loading") return <Skeleton label={t("state.loading")} lines={5} variant="list" />;
  if (session.status !== "authenticated" || session.profile?.role === "member") {
    return <EmptyState heading={t("admin.notes.accessDenied")} description={t("admin.feedback.description")} announce />;
  }

  return <div className={styles.page}>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>CrewPort</p><h1>{t("admin.feedback.heading")}</h1><p>{t("admin.feedback.description")}</p></div>
      <label className={styles.filter}><span>{t("admin.notes.filter")}</span><select value={filter} onChange={(event) => setFilter(event.currentTarget.value as NoteFeedbackState)}><option value="pending">{t("admin.notes.pending")}</option><option value="approved">{t("admin.notes.approved")}</option><option value="rejected">{t("admin.notes.rejected")}</option></select></label>
      <nav className={styles.adminLinks}><Link to="/admin/notes">{t("admin.feedback.notes")}</Link><Link to="/admin/moderation/corrections">{t("admin.notes.corrections")}</Link></nav>
    </header>
    {error ? <p className={styles.error} role="alert">{t("admin.feedback.error")}</p> : null}
    {loading ? <Skeleton label={t("state.loading")} lines={5} variant="list" /> : null}
    {!loading && items.length === 0 ? <p className={styles.empty}>{t("admin.feedback.empty")}</p> : null}
    <div className={styles.list}>{items.map((item) => <article className={styles.note} key={item.id}>
      <div className={styles.noteMeta}><span>{item.portKey}</span><span>{t(`noteFeedback.status.${item.status}`)}</span></div>
      <p className={styles.summary}>{item.body}</p>
      <dl><div><dt>{t("admin.notes.author")}</dt><dd>{item.publicAlias}</dd></div><div><dt>{t("admin.feedback.note")}</dt><dd>{item.noteSummary}</dd></div></dl>
      <label className={styles.reason}><span>{t("admin.notes.reason")}</span><textarea value={reasons[item.id] ?? ""} onChange={(event) => setReasons((current) => ({ ...current, [item.id]: event.currentTarget.value }))} /></label>
      {item.status === "pending" ? <div className={styles.actions}><button type="button" onClick={() => void review(item, "approved")}>{t("admin.notes.approve")}</button><button type="button" onClick={() => void review(item, "rejected")}>{t("admin.notes.reject")}</button></div> : null}
    </article>)}</div>
  </div>;
}
