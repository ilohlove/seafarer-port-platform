import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";

import { useServices, useSession } from "../../app/providers";
import { EmptyState, Skeleton } from "../../components";
import { useI18n, type TranslationKey } from "../../i18n";
import type { FeedbackModerationContext, FeedbackModerationItem, FeedbackModerationPriority, FeedbackModerationSort, NoteFeedbackState, PortNoteTopic } from "../../types";
import { AdminModerationLayout } from "./AdminModerationLayout";
import styles from "./admin-feedback.module.css";

const topics: readonly PortNoteTopic[] = ["esim", "physicalSim", "shoreLeave", "food", "shopping", "welfare", "general"];
const rejectReasons = ["spam", "irrelevant", "advertising", "noValue", "harassment", "misleading", "other"] as const;
type RejectReason = typeof rejectReasons[number];

function topicKey(topic: PortNoteTopic): TranslationKey {
  return ({ esim: "portNotes.topic.esim", physicalSim: "portNotes.topic.physicalSim", shoreLeave: "portNotes.topic.shoreLeave", food: "portNotes.topic.foodOrder", shopping: "portNotes.topic.shopping", welfare: "portNotes.topic.seamanClub", general: "portNotes.topic.generalTip" } as const)[topic];
}
function readState(value: string | null): NoteFeedbackState { return value === "approved" || value === "rejected" ? value : "pending"; }
function readPriority(value: string | null): FeedbackModerationPriority | undefined { return value === "P0" || value === "P1" || value === "P2" ? value : undefined; }
function readTopic(value: string | null): PortNoteTopic | undefined { return topics.find((topic) => topic === value); }
function isConflict(error: unknown): boolean { return (error instanceof Error ? error.message : String(error)).includes("feedback_not_pending"); }

function Icon({ kind }: { readonly kind: "approve" | "reject" | "context" | "close" }) {
  const paths = {
    approve: <path d="m5 12 4 4L19 6" />,
    reject: <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>,
    context: <><path d="M14 3h7v7" /><path d="m10 14 11-11" /><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1 2-2V5a2 2 0 0 1 2-2h5" /></>,
    close: <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>,
  } as const;
  return <svg aria-hidden="true" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">{paths[kind]}</g></svg>;
}

function ModerationRejectDialog({ item, reason, busy, onReasonChange, onCancel, onConfirm }: {
  readonly item: FeedbackModerationItem;
  readonly reason?: RejectReason;
  readonly busy: boolean;
  readonly onReasonChange: (reason: RejectReason) => void;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    return () => { if (dialog.open && typeof dialog.close === "function") dialog.close(); };
  }, []);
  return <div className={styles.modalBackdrop}><dialog ref={ref} aria-labelledby="reject-title" className={styles.rejectDialog} onCancel={(event) => { event.preventDefault(); onCancel(); }}>
    <h2 id="reject-title">{t("admin.feedback.rejectHeading")}</h2><p className={styles.rejectPreview}>“{item.body}”</p>
    <fieldset><legend>{t("admin.feedback.rejectReason")}</legend>{rejectReasons.map((value, index) => <label key={value}><input autoFocus={index === 0} type="radio" name="reject-reason" value={value} checked={reason === value} onChange={() => onReasonChange(value)} />{t(`admin.feedback.reject.${value}`)}</label>)}</fieldset>
    <div><button type="button" onClick={onCancel}>{t("admin.feedback.cancel")}</button><button type="button" disabled={!reason || busy} onClick={onConfirm}>{t("admin.feedback.confirmReject")}</button></div>
  </dialog></div>;
}

export function AdminFeedbackRoute() {
  const services = useServices();
  const session = useSession();
  const { t, formatDate } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const state = readState(searchParams.get("status"));
  const priority = readPriority(searchParams.get("priority"));
  const topic = readTopic(searchParams.get("topic"));
  const sort: FeedbackModerationSort = searchParams.get("sort") === "newest" ? "newest" : "oldest";
  const cursor = searchParams.get("cursor") ?? undefined;
  const portFilter = searchParams.get("port") ?? undefined;
  const selectedId = searchParams.get("selected") ?? undefined;
  const [portDraft, setPortDraft] = useState(searchParams.get("port") ?? "");
  const [items, setItems] = useState<readonly FeedbackModerationItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string>();
  const [actionError, setActionError] = useState(false);
  const [conflictItemId, setConflictItemId] = useState<string>();
  const [rejectItem, setRejectItem] = useState<FeedbackModerationItem>();
  const [rejectReason, setRejectReason] = useState<RejectReason>();
  const [context, setContext] = useState<FeedbackModerationContext>();
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState(false);
  const contextRef = useRef<HTMLElement>(null);

  const updateParams = useCallback((changes: Readonly<Record<string, string | undefined>>) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      Object.entries(changes).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
      return next;
    });
  }, [setSearchParams]);
  function refresh() { updateParams({ cursor: undefined }); setConflictItemId(undefined); setItems([]); }

  useEffect(() => {
    if (session.status !== "authenticated" || session.profile?.role === "member") return;
    const controller = new AbortController();
    setLoading(true); setLoadError(false);
    void services.portNotes.listFeedbackModerationQueue({ state, portKey: portFilter, topic, priority, sort, cursor, limit: 25, signal: controller.signal })
      .then((page) => { if (!controller.signal.aborted) { setItems(page.items); setNextCursor(page.nextCursor); } })
      .catch(() => { if (!controller.signal.aborted) setLoadError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [cursor, portFilter, priority, services, session.profile?.role, session.status, sort, state, topic]);

  useEffect(() => {
    if (!selectedId || session.status !== "authenticated") { setContext(undefined); return; }
    const controller = new AbortController();
    setContext(undefined); setContextLoading(true); setContextError(false);
    void services.portNotes.getFeedbackModerationContext(selectedId, { signal: controller.signal })
      .then((value) => { if (!controller.signal.aborted) setContext(value); })
      .catch(() => { if (!controller.signal.aborted) setContextError(true); })
      .finally(() => { if (!controller.signal.aborted) { setContextLoading(false); requestAnimationFrame(() => contextRef.current?.focus()); } });
    return () => controller.abort();
  }, [selectedId, services, session.status]);

  useEffect(() => {
    if (!selectedId) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") updateParams({ selected: undefined }); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [selectedId, updateParams]);

  async function review(item: FeedbackModerationItem, decision: "approved" | "rejected", reason?: string) {
    if (busyItemId) return;
    setBusyItemId(item.id); setActionError(false); setConflictItemId(undefined);
    try {
      await services.portNotes.moderateFeedback(item.id, decision, reason);
      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
      if (selectedId === item.id) updateParams({ selected: undefined });
      setRejectItem(undefined); setRejectReason(undefined);
    } catch (error) {
      if (isConflict(error)) setConflictItemId(item.id); else setActionError(true);
    } finally { setBusyItemId(undefined); }
  }

  if (session.status === "loading") return <Skeleton label={t("state.loading")} lines={5} variant="list" />;
  if (session.status !== "authenticated" || session.profile?.role === "member") return <EmptyState heading={t("admin.notes.accessDenied")} description={t("admin.feedback.description")} announce />;

  return <AdminModerationLayout><section className={styles.page}>
    <header className={styles.heading}><h2>{t("admin.feedback.heading")}</h2><p>{t("admin.feedback.description")}</p></header>
    <fieldset className={styles.stateTabs} aria-label={t("admin.feedback.queueState")}>
      {(["pending", "approved", "rejected"] as const).map((value) => <button type="button" key={value} aria-pressed={state === value} onClick={() => updateParams({ status: value, cursor: undefined })}>{t(`noteFeedback.status.${value}`)}</button>)}
    </fieldset>
    <form className={styles.toolbar} onSubmit={(event) => { event.preventDefault(); updateParams({ port: portDraft.trim() || undefined, cursor: undefined }); }}>
      <label><span>{t("admin.feedback.port")}</span><input value={portDraft} onChange={(event) => setPortDraft(event.currentTarget.value)} placeholder="KRPUS" /></label>
      <label><span>{t("admin.feedback.topic")}</span><select value={topic ?? ""} onChange={(event) => updateParams({ topic: event.currentTarget.value || undefined, cursor: undefined })}><option value="">{t("admin.feedback.allTopics")}</option>{topics.map((value) => <option key={value} value={value}>{t(topicKey(value))}</option>)}</select></label>
      <label><span>{t("admin.feedback.priority")}</span><select value={priority ?? ""} onChange={(event) => updateParams({ priority: event.currentTarget.value || undefined, cursor: undefined })}><option value="">{t("admin.feedback.allPriorities")}</option><option value="P0">P0</option><option value="P1">P1</option><option value="P2">P2</option></select></label>
      <label><span>{t("admin.feedback.sort")}</span><select value={sort} onChange={(event) => updateParams({ sort: event.currentTarget.value, cursor: undefined })}><option value="oldest">{t("admin.feedback.oldest")}</option><option value="newest">{t("admin.feedback.newest")}</option></select></label>
      <button type="submit">{t("admin.feedback.applyFilters")}</button>
    </form>
    {loadError ? <p className={styles.error} role="alert">{t("admin.feedback.loadError")} <button type="button" onClick={refresh}>{t("admin.feedback.refresh")}</button></p> : null}
    {actionError ? <p className={styles.error} role="alert">{t("admin.feedback.actionError")}</p> : null}
    <div className={styles.workspace} data-context-open={selectedId ? "true" : undefined}>
      <div className={styles.queue} aria-busy={loading || undefined}>
        {loading ? <Skeleton label={t("admin.feedback.loading")} lines={5} variant="list" /> : null}
        {!loading && !loadError && items.length === 0 ? <p className={styles.empty}>{t("admin.feedback.empty")}</p> : null}
        {items.map((item) => <article key={item.id} className={styles.card} data-selected={selectedId === item.id ? "true" : undefined}>
          <div className={styles.cardTop}><span>{item.portKey} · {t(topicKey(item.noteTopic))}</span><span className={styles.priority} data-priority={item.priority}>{t("admin.feedback.priorityLabel", { priority: item.priority })}</span></div>
          {item.riskSignals.includes("veryShort") ? <p className={styles.risk}>⚠ {t("admin.feedback.veryShort")}</p> : null}
          <p className={styles.body}>“{item.body}”</p>
          <p className={styles.author}>{item.publicAlias} · <time dateTime={item.createdAt}>{formatDate(item.createdAt, { dateStyle: "medium", timeStyle: "short" })}</time></p>
          <div className={styles.noteContext}><span>{t("admin.feedback.replyTo")}</span><strong>“{item.noteSummary}”</strong><small>{item.noteContextKey ? `${item.portKey} · ${item.noteContextKey}` : item.portKey}</small></div>
          {conflictItemId === item.id ? <p className={styles.conflict} role="alert">{t("admin.feedback.conflict")} <button type="button" onClick={refresh}>{t("admin.feedback.refresh")}</button></p> : null}
          <div className={styles.actions}>
            {item.status === "pending" ? <><button className={styles.approve} disabled={Boolean(busyItemId)} type="button" onClick={() => void review(item, "approved")}><Icon kind="approve" />{t("admin.feedback.approve")}</button><button disabled={Boolean(busyItemId)} type="button" onClick={() => { setRejectItem(item); setRejectReason(undefined); }}><Icon kind="reject" />{t("admin.feedback.reject")}</button></> : null}
            <button type="button" onClick={() => updateParams({ selected: item.id })}><Icon kind="context" />{t("admin.feedback.viewOriginal")}</button>
          </div>
        </article>)}
        <nav className={styles.pagination} aria-label={t("admin.feedback.pagination")}>
          {cursor ? <button type="button" onClick={() => history.back()}>{t("admin.feedback.previous")}</button> : <span />}
          {nextCursor ? <button type="button" onClick={() => updateParams({ cursor: nextCursor })}>{t("admin.feedback.next")}</button> : null}
        </nav>
      </div>
      {selectedId ? <aside ref={contextRef} className={styles.contextPanel} tabIndex={-1} aria-label={t("admin.feedback.contextHeading")}>
        <header><h2>{t("admin.feedback.contextHeading")}</h2><button type="button" aria-label={t("admin.feedback.closeContext")} onClick={() => updateParams({ selected: undefined })}><Icon kind="close" /></button></header>
        {contextLoading ? <Skeleton label={t("admin.feedback.contextLoading")} lines={5} variant="list" /> : null}
        {contextError ? <p className={styles.error} role="alert">{t("admin.feedback.contextError")}</p> : null}
        {context ? <ContextContent context={context} selectedId={selectedId} /> : null}
      </aside> : null}
    </div>
    {rejectItem ? <ModerationRejectDialog item={rejectItem} reason={rejectReason} busy={Boolean(busyItemId)} onReasonChange={setRejectReason} onCancel={() => setRejectItem(undefined)} onConfirm={() => rejectReason && void review(rejectItem, "rejected", t(`admin.feedback.reject.${rejectReason}`))} /> : null}
  </section></AdminModerationLayout>;

  function ContextContent({ context: value, selectedId: focusedId }: { readonly context: FeedbackModerationContext; readonly selectedId: string }) {
    const note = value.note;
    const deepLink = `/ports/${encodeURIComponent(note.portKey.toLowerCase())}?topic=${encodeURIComponent(note.topic)}&note=${encodeURIComponent(note.id)}&feedback=${encodeURIComponent(focusedId)}`;
    return <div className={styles.contextContent}>
      <p className={styles.breadcrumb}>{note.portKey}{note.contextKey ? ` · ${note.contextKey}` : ""} · {t(topicKey(note.topic))}</p>
      <h3>{note.summary}</h3><p>{t(`admin.feedback.trust.${note.accuracy.state}`)}</p>
      <p className={styles.author}>{note.publicAlias}{note.updatedAt ? ` · ${formatDate(note.updatedAt, { dateStyle: "medium" })}` : ""}</p>
      <Link className={styles.fullLink} to={deepLink}>{t("admin.feedback.openFullPage")} <Icon kind="context" /></Link>
      <section className={styles.thread}><h3>{t("admin.feedback.thread")}</h3>{value.feedback.map((feedback) => <article id={`moderation-context-feedback-${feedback.id}`} key={feedback.id} data-focused={feedback.id === focusedId ? "true" : undefined}>{feedback.id === focusedId ? <strong>{t("admin.feedback.reviewing")}</strong> : null}<p>{feedback.body}</p><small>{feedback.publicAlias}</small></article>)}</section>
    </div>;
  }
}
