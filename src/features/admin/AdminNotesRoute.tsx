import { useEffect, useState } from "react";
import { Link } from "react-router";

import { EmptyState, Skeleton } from "../../components";
import { useServices, useSession } from "../../app/providers";
import { useI18n } from "../../i18n";
import type { PortNoteModerationState, PortNoteRecord } from "../../types";
import styles from "./admin-notes.module.css";

type QueueFilter = "all" | PortNoteModerationState;

const topicLabels = {
  esim: "portNotes.topic.esim",
  physicalSim: "portNotes.topic.physicalSim",
  shoreLeave: "portNotes.topic.shoreLeave",
  food: "portNotes.topic.foodOrder",
  shopping: "portNotes.topic.shopping",
  welfare: "portNotes.topic.seamanClub",
  general: "portNotes.topic.generalTip",
} as const;

const stateLabels = {
  notRequired: "admin.notes.notRequired",
  pending: "admin.notes.pending",
  approved: "admin.notes.approved",
  rejected: "admin.notes.rejected",
  quarantined: "admin.notes.quarantined",
} as const;

function makeIdempotencyKey(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `moderation-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function AdminNotesRoute() {
  const services = useServices();
  const session = useSession();
  const { t } = useI18n();
  const [filter, setFilter] = useState<QueueFilter>("pending");
  const [notes, setNotes] = useState<readonly PortNoteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState(false);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  useEffect(() => {
    if (session.status !== "authenticated" || session.profile?.role === "member") {
      return;
    }
    let active = true;
    setIsLoading(true);
    setError(false);
    void services.portNotes
      .listModerationQueue({ state: filter === "all" ? undefined : filter })
      .then((items) => {
        if (active) {
          setNotes(items);
        }
      })
      .catch(() => {
        if (active) {
          setError(true);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [filter, services, session]);

  async function moderate(
    note: PortNoteRecord,
    nextState: "approved" | "rejected" | "quarantined",
  ) {
    const reason = reasons[note.id]?.trim();
    if ((nextState === "rejected" || nextState === "quarantined") && !reason) {
      setError(true);
      return;
    }
    setError(false);
    try {
      await services.portNotes.moderateNote({
        noteId: note.id,
        nextState,
        reason,
        idempotencyKey: makeIdempotencyKey(),
      });
      setNotes((current) => current.filter((candidate) => candidate.id !== note.id));
      setNotice(true);
    } catch {
      setError(true);
    }
  }

  async function toggleHighlyUseful(note: PortNoteRecord) {
    setError(false);
    try {
      await services.reputation.setHighlyUseful(note.id, !note.highlyUseful, "practicalValue");
      setNotes((current) => current.map((candidate) => candidate.id === note.id ? { ...candidate, highlyUseful: !candidate.highlyUseful } : candidate));
      setNotice(true);
    } catch { setError(true); }
  }

  if (session.status === "loading") {
    return <Skeleton label={t("state.loading")} lines={6} variant="card" />;
  }

  if (session.status !== "authenticated" || session.profile?.role === "member") {
    return (
      <EmptyState
        heading={t("admin.notes.accessDenied")}
        description={t("admin.notes.description")}
        announce
      />
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>CrewPort</p>
          <h1>{t("admin.notes.heading")}</h1>
          <p>{t("admin.notes.description")}</p>
        </div>
        <label className={styles.filter}>
          <span>{t("admin.notes.filter")}</span>
          <select value={filter} onChange={(event) => setFilter(event.currentTarget.value as QueueFilter)}>
            <option value="all">{t("admin.notes.all")}</option>
            <option value="pending">{t("admin.notes.pending")}</option>
            <option value="approved">{t("admin.notes.approved")}</option>
            <option value="rejected">{t("admin.notes.rejected")}</option>
            <option value="quarantined">{t("admin.notes.quarantined")}</option>
          </select>
        </label>
        <nav className={styles.adminLinks}>
          <Link to="/admin/moderation/corrections">{t("admin.notes.corrections")}</Link>
          {session.profile?.role === "admin" ? <Link to="/admin/reputation/ledger">{t("admin.notes.reputationLedger")}</Link> : null}
        </nav>
      </header>

      {notice ? <output className={styles.notice}>{t("admin.notes.updated")}</output> : null}
      {error ? <p className={styles.error} role="alert">{t("admin.notes.error")}</p> : null}
      {isLoading ? <Skeleton label={t("state.loading")} lines={5} variant="list" /> : null}
      {!isLoading && notes.length === 0 ? <p className={styles.empty}>{t("admin.notes.empty")}</p> : null}

      <div className={styles.list}>
        {notes.map((note) => (
          <article className={styles.note} key={note.id}>
            <div className={styles.noteMeta}>
              <span>{t(topicLabels[note.topic])}</span>
              <span>{t(stateLabels[note.moderationState])}</span>
            </div>
            <p className={styles.summary}>{note.summary}</p>
            <dl>
              <div><dt>{t("admin.notes.author")}</dt><dd>{note.publicAlias || t("profile.defaultAlias")}</dd></div>
              <div><dt>{t("admin.notes.context")}</dt><dd>{note.contextKey ?? "—"}</dd></div>
              <div><dt>{t("admin.notes.topic")}</dt><dd>{t(topicLabels[note.topic])}</dd></div>
              {note.contactIsPublicBusiness ? (
                <div><dt>{t("admin.notes.contact")}</dt><dd>{note.contact ?? "—"}</dd></div>
              ) : null}
            </dl>
            <label className={styles.reason}>
              <span>{t("admin.notes.reason")}</span>
              <textarea
                value={reasons[note.id] ?? ""}
                placeholder={t("admin.notes.reasonPlaceholder")}
                onChange={(event) =>
                  setReasons((current) => ({ ...current, [note.id]: event.currentTarget.value }))
                }
              />
            </label>
            <div className={styles.actions}>
              <button type="button" onClick={() => void moderate(note, "approved")}>
                {t("admin.notes.approve")}
              </button>
              <button type="button" onClick={() => void moderate(note, "rejected")}>
                {t("admin.notes.reject")}
              </button>
              <button type="button" onClick={() => void moderate(note, "quarantined")}>
                {t("admin.notes.quarantine")}
              </button>
              {note.moderationState === "approved" ? <button type="button" onClick={() => void toggleHighlyUseful(note)}>{note.highlyUseful ? t("admin.notes.removeHighlyUseful") : t("admin.notes.highlyUseful")}</button> : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
