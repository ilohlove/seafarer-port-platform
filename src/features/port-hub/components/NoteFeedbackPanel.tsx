import { useEffect, useRef, useState } from "react";

import { useServices, useSession } from "../../../app/providers";
import { useI18n, type TranslationKey } from "../../../i18n";
import type { NoteFeedbackRecord } from "../../../types";
import { DEFAULT_USER_RANK, UserRankIdentity } from "../../user-rank";
import styles from "../port-notes.module.css";

function idempotencyKey(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `feedback-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function mergeFeedback(current: readonly NoteFeedbackRecord[], incoming: readonly NoteFeedbackRecord[]) {
  return [...new Map([...current, ...incoming].map((item) => [item.id, item])).values()]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function normalizeFeedbackBody(body: string): string {
  return body.trim().replace(/\s+/gu, " ").toLocaleLowerCase();
}

function feedbackErrorKey(error: unknown): TranslationKey {
  const code = error && typeof error === "object" && "code" in error
    ? String(error.code)
    : "";
  if (code === "feedback-cooldown") return "noteFeedback.cooldownError";
  if (code === "feedback-rate-limit") return "noteFeedback.rateLimitError";
  if (code === "feedback-duplicate") return "noteFeedback.duplicateError";
  return "noteFeedback.error";
}

interface NoteFeedbackPanelProps {
  readonly noteId: string;
  readonly panelId: string;
  readonly open: boolean;
  readonly initialCount: number;
  readonly focusFeedbackId?: string;
  readonly onApprovedCountChange: (count: number) => void;
  readonly onProposeCorrection: (feedback: NoteFeedbackRecord) => void;
}

export function NoteFeedbackPanel({
  noteId,
  panelId,
  open,
  initialCount,
  focusFeedbackId,
  onApprovedCountChange,
  onProposeCorrection,
}: NoteFeedbackPanelProps) {
  const services = useServices();
  const session = useSession();
  const { t, formatDate } = useI18n();
  const [items, setItems] = useState<readonly NoteFeedbackRecord[]>([]);
  const [nextCursor, setNextCursor] = useState<string>();
  const [loaded, setLoaded] = useState(false);
  const [expandedAll, setExpandedAll] = useState(false);
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<TranslationKey>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingSubmissionRef = useRef<{ readonly normalizedBody: string; readonly key: string } | undefined>(undefined);

  useEffect(() => {
    setItems([]);
    setNextCursor(undefined);
    setLoaded(false);
    setExpandedAll(false);
    setBody("");
    setEditingId(undefined);
    setErrorKey(undefined);
    pendingSubmissionRef.current = undefined;
  }, [noteId]);

  useEffect(() => {
    if (!open || loaded) return;
    if (!services.portNotes.isConfigured()) {
      setLoaded(true);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setErrorKey(undefined);
    void services.portNotes.listFeedback(noteId, undefined, 2, { signal: controller.signal })
      .then((page) => {
        if (controller.signal.aborted) return;
        setItems(page.items);
        setNextCursor(page.nextCursor);
        setLoaded(true);
      })
      .catch(() => { if (!controller.signal.aborted) setErrorKey("noteFeedback.error"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [loaded, noteId, open, services]);

  useEffect(() => {
    if (!open || !focusFeedbackId || items.some((item) => item.id === focusFeedbackId) || !services.portNotes.isConfigured()) return;
    const controller = new AbortController();
    void services.portNotes.getFeedback(focusFeedbackId, { signal: controller.signal })
      .then((focused) => {
        if (!controller.signal.aborted) setItems((current) => mergeFeedback(current, [focused]));
      })
      .catch(() => { if (!controller.signal.aborted) setErrorKey("noteFeedback.error"); });
    return () => controller.abort();
  }, [focusFeedbackId, items, open, services]);

  useEffect(() => {
    if (!open || !loaded) return;
    if (focusFeedbackId) {
      document.getElementById(`note-feedback-${focusFeedbackId}`)?.focus();
    } else if (items.length === 0 && session.status === "authenticated") {
      textareaRef.current?.focus();
    }
  }, [focusFeedbackId, items.length, loaded, open, session.status]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim() || busy) return;
    setBusy(true);
    setErrorKey(undefined);
    try {
      const previous = editingId ? items.find((item) => item.id === editingId) : undefined;
      const normalizedBody = normalizeFeedbackBody(body);
      if (!editingId && pendingSubmissionRef.current?.normalizedBody !== normalizedBody) {
        pendingSubmissionRef.current = { normalizedBody, key: idempotencyKey() };
      }
      const saved = editingId
        ? await services.portNotes.updateFeedback(editingId, body.trim())
        : await services.portNotes.submitFeedback(noteId, body.trim(), pendingSubmissionRef.current!.key);
      setItems((current) => editingId
        ? current.map((item) => item.id === editingId ? saved : item)
        : mergeFeedback(current, [saved]));
      if (previous?.status === "approved" && saved.status !== "approved") {
        onApprovedCountChange(Math.max(0, initialCount - 1));
      } else if (previous?.status !== "approved" && saved.status === "approved") {
        onApprovedCountChange(initialCount + 1);
      }
      setBody("");
      setEditingId(undefined);
      pendingSubmissionRef.current = undefined;
    } catch (error) {
      setErrorKey(feedbackErrorKey(error));
    } finally {
      setBusy(false);
    }
  }

  function submitOnEnter(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (!body.trim() || busy) return;
    event.currentTarget.form?.requestSubmit();
  }

  async function remove(feedback: NoteFeedbackRecord) {
    setBusy(true);
    setErrorKey(undefined);
    try {
      await services.portNotes.deleteFeedback(feedback.id);
      setItems((current) => current.filter((item) => item.id !== feedback.id));
      if (feedback.status === "approved") onApprovedCountChange(Math.max(0, initialCount - 1));
    } catch (error) {
      setErrorKey(feedbackErrorKey(error));
    } finally {
      setBusy(false);
    }
  }

  async function loadMore() {
    if (!nextCursor || loading) return;
    setLoading(true);
    setErrorKey(undefined);
    setExpandedAll(true);
    try {
      const page = await services.portNotes.listFeedback(noteId, nextCursor, 20);
      setItems((current) => mergeFeedback(current, page.items));
      setNextCursor(page.nextCursor);
    } catch {
      setErrorKey("noteFeedback.error");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <section id={panelId} className={styles.feedbackPanel} aria-label={t("noteFeedback.count", { count: initialCount })}>
      <div className={styles.feedbackHeader}>
        <strong>{t("noteFeedback.latest")}</strong>
        {!expandedAll && nextCursor ? <button type="button" onClick={() => void loadMore()}>{t("noteFeedback.viewAll", { count: initialCount })}</button> : null}
      </div>
      {loading && items.length === 0 ? <p>{t("noteFeedback.loading")}</p> : null}
      {loaded && items.length === 0 && initialCount > 0 ? <p>{t("noteFeedback.empty")}</p> : null}
      <div className={styles.feedbackList}>
        {items.map((item) => {
          const own = item.authorId === session.profile?.userId;
          const canConvert = own || (session.status === "authenticated" && session.profile?.role !== "member");
          const focused = item.id === focusFeedbackId;
          return (
            <article className={styles.feedbackItem} data-focused={focused ? "true" : undefined} id={`note-feedback-${item.id}`} key={item.id} tabIndex={focused ? -1 : undefined}>
              <UserRankIdentity alias={item.publicAlias || t("profile.defaultAlias")} rank={item.authorRank ?? DEFAULT_USER_RANK} staffTitle={item.authorStaffTitle} />
              <p>{item.body}</p>
              <div className={styles.feedbackMeta}>
                <time dateTime={item.createdAt}>{item.createdAt ? formatDate(item.createdAt, { dateStyle: "medium" }) : ""}</time>
                {item.status !== "approved" ? <span>{t(`noteFeedback.status.${item.status}`)}</span> : null}
                {item.usedForCorrection ? <span>{t("noteFeedback.used")}</span> : null}
              </div>
              <div className={styles.feedbackActions}>
                {canConvert ? <button type="button" onClick={() => onProposeCorrection(item)}>{t("noteFeedback.proposeCorrection")}</button> : null}
                {own ? <button type="button" onClick={() => { setEditingId(item.id); setBody(item.body); textareaRef.current?.focus(); }}>{t("noteFeedback.edit")}</button> : null}
                {own ? <button type="button" disabled={busy} onClick={() => void remove(item)}>{t("noteFeedback.delete")}</button> : null}
              </div>
            </article>
          );
        })}
      </div>
      {expandedAll && nextCursor ? <button type="button" className={styles.feedbackMore} onClick={() => void loadMore()}>{t("noteFeedback.more")}</button> : null}
      {session.status === "authenticated" ? (
        <form className={styles.feedbackForm} onSubmit={(event) => void save(event)}>
          <label>
            <span>{editingId ? t("noteFeedback.editLabel") : t("noteFeedback.add")}</span>
            <textarea ref={textareaRef} required maxLength={2000} value={body} onChange={(event) => setBody(event.currentTarget.value)} onKeyDown={submitOnEnter} placeholder={t("noteFeedback.placeholder")} />
          </label>
          <div>
            {editingId ? <button type="button" onClick={() => { setEditingId(undefined); setBody(""); }}>{t("noteFeedback.cancel")}</button> : null}
            <button type="submit" disabled={busy || !body.trim()}>{busy ? t("noteFeedback.saving") : t("noteFeedback.submit")}</button>
          </div>
          <small>{t("noteFeedback.noXp")}</small>
        </form>
      ) : <p>{t("noteFeedback.signIn")}</p>}
      {errorKey ? <p role="alert">{t(errorKey)}</p> : null}
    </section>
  );
}
