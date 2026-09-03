import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { useServices, useSession } from "../../../app/providers";
import { useI18n, type TranslationKey } from "../../../i18n";
import type { NoteFeedbackRecord, PortNoteRecord, PortNoteTopic } from "../../../types";
import type { PortNoteCardModel } from "../port-notes-view-model";
import { DEFAULT_USER_RANK, UserRankIdentity } from "../../user-rank";
import { CancelConfirmationDialog, CorrectionDialog, VerifiedConfirmationDialog } from "../../reputation";
import { NoteFeedbackPanel } from "./NoteFeedbackPanel";
import { resolveNoteFieldDisplayRule, shouldOfferNoteFieldExpansion } from "../note-field-config";
import styles from "../port-notes.module.css";

const topicKeys: Readonly<Record<PortNoteTopic, TranslationKey>> = {
  esim: "portNotes.topic.esim",
  physicalSim: "portNotes.topic.physicalSim",
  shoreLeave: "portNotes.topic.shoreLeave",
  food: "portNotes.topic.foodOrder",
  shopping: "portNotes.topic.shopping",
  welfare: "portNotes.topic.seamanClub",
  general: "portNotes.topic.generalTip",
};

interface TopicNotesPanelProps {
  readonly topic: PortNoteTopic;
  readonly portKey: string;
  readonly contextKey?: string;
  readonly fallbackNotes: readonly PortNoteCardModel[];
  readonly onWriteNote: () => void;
}

function mapLegacyTopic(note: PortNoteCardModel): PortNoteTopic {
  if (note.topicKey === "esim") return "esim";
  if (note.topicKey === "physicalSim") return "physicalSim";
  if (["taxi", "rideHailing", "shoreLeave"].includes(note.topicKey)) return "shoreLeave";
  if (["foodOrder", "supplies"].includes(note.topicKey)) return "food";
  if (["shopping", "placesToVisit"].includes(note.topicKey)) return "shopping";
  if (note.topicKey === "seamanClub") return "welfare";
  return "general";
}

function legacyNotes(
  notes: readonly PortNoteCardModel[],
  topic: PortNoteTopic,
): readonly PortNoteRecord[] {
  const matchingNotes = notes.filter((note) => mapLegacyTopic(note) === topic);
  const visibleNotes = matchingNotes.slice(0, 3);

  return visibleNotes
    .map((note) => {
      const details: Record<string, string> = {};
      if (note.context) details.context = note.context;
      return {
        id: note.id,
        portKey: "demo",
        topic,
        visibility: "public" as const,
        moderationState: "approved" as const,
        summary: note.summary,
        details,
        contactIsPublicBusiness: false,
        publicAlias: note.authorLabel,
        authorRank: note.authorRank,
        authorStaffTitle: note.authorStaffTitle,
        feedbackCount: 0,
        createdAt: "",
        accuracy: {
          state:
            note.trust.status === "communityConfirmed"
              ? "communityConfirmed" as const
              : note.trust.status === "conflictingReports"
                ? "needsReview" as const
                : "needsConfirmation" as const,
          stillCorrect: note.confirmationCount,
          changed: 0,
          notSure: 0,
        },
      };
    });
}

function NoteActionIcon({ kind }: { readonly kind: "confirm" | "feedback" | "changed" }) {
  if (kind === "confirm") {
    return (
      <svg className={styles.noteActionIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="9" />
        <path d="m8.2 12.2 2.4 2.4 5.4-5.5" />
      </svg>
    );
  }
  if (kind === "feedback") {
    return (
      <svg className={styles.noteActionIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 9 9 0 0 1-3.8-.9L4 20l1.3-3.7A7.5 7.5 0 1 1 20 11.5Z" />
      </svg>
    );
  }
  return (
    <svg className={styles.noteActionIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M13.5 5.5H6.8A2.8 2.8 0 0 0 4 8.3v8.9A2.8 2.8 0 0 0 6.8 20h8.9a2.8 2.8 0 0 0 2.8-2.8v-6.7" />
      <path d="m10 14 1.1-3.3L17.8 4a1.6 1.6 0 0 1 2.2 2.2l-6.7 6.7L10 14Z" />
    </svg>
  );
}

function NoteTrustIcon() {
  return (
    <span className={styles.noteTrustIcon} aria-hidden="true">
      <svg viewBox="0 0 32 32" focusable="false">
        <path d="M16 3.5c4.2 2.8 7.8 3.5 10.5 3.8v7.6c0 6.1-4 10.5-10.5 13.6C9.5 25.4 5.5 21 5.5 14.9V7.3C8.2 7 11.8 6.3 16 3.5Z" />
        <path d="M16 9v11M12 14h8M12.5 21.5c1.2-1 2.3-1.5 3.5-1.5s2.3.5 3.5 1.5" />
      </svg>
    </span>
  );
}

type NoteDetailIconKind = "avoid" | "price" | "pickup" | "ride" | "agreement" | "information";

export function noteDetailIconKind(detailKey: string): NoteDetailIconKind {
  const field = detailKey.split(".").at(-1);
  if (field === "avoid") return "avoid";
  if (["price", "fairPrice", "goodPrice", "cost"].includes(field ?? "")) return "price";
  if (["pickup", "location", "place", "where", "supermarket", "seller"].includes(field ?? "")) return "pickup";
  if (["rideApp", "delivery", "shuttle"].includes(field ?? "")) return "ride";
  if (field === "agreeFare") return "agreement";
  return "information";
}

function NoteDetailIcon({ detailKey }: { readonly detailKey: string }) {
  const kind = noteDetailIconKind(detailKey);
  return (
    <span className={styles.noteDetailIcon} data-note-detail-icon={kind} aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        {kind === "avoid" ? <><path d="M12 3.5c3 2 5.6 2.5 7.5 2.7v5.4c0 4.4-2.9 7.5-7.5 9.8-4.6-2.3-7.5-5.4-7.5-9.8V6.2C6.4 6 9 5.5 12 3.5Z" /><path d="m8.8 15.2 6.4-6.4" /></> : null}
        {kind === "price" ? <><path d="M4 5h7.2L20 13.8 13.8 20 5 11.2 4 5Z" /><circle cx="8" cy="8" r="1" /></> : null}
        {kind === "pickup" ? <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.2" /></> : null}
        {kind === "ride" ? <><path d="m5.2 10 1.7-4h10.2l1.7 4" /><path d="M4 10h16v7H4zM7 17v2M17 17v2" /><circle cx="7" cy="14" r="1" /><circle cx="17" cy="14" r="1" /></> : null}
        {kind === "agreement" ? <><path d="M6 3h9l3 3v15H6V3Z" /><path d="M15 3v4h4M9 11h6M9 15h4" /><circle cx="16.5" cy="17.5" r="2.5" /></> : null}
        {kind === "information" ? <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></> : null}
      </svg>
    </span>
  );
}

function ExpandableNoteText({ value, fieldKey, label }: { readonly value: string; readonly fieldKey: string; readonly label: string }) {
  const { t } = useI18n();
  const contentId = useId();
  const contentRef = useRef<HTMLSpanElement>(null);
  const [expanded, setExpanded] = useState(false);
  const rule = resolveNoteFieldDisplayRule(fieldKey);
  const estimatedOverflow = shouldOfferNoteFieldExpansion(value, rule);
  const [measuredOverflow, setMeasuredOverflow] = useState(estimatedOverflow);
  const clampStyle = { "--note-collapsed-lines": rule.collapsedLines } as CSSProperties;

  useLayoutEffect(() => {
    if (expanded) return;
    const measure = () => {
      const element = contentRef.current;
      setMeasuredOverflow(estimatedOverflow || Boolean(element && element.scrollHeight > element.clientHeight + 1));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [estimatedOverflow, expanded, value]);

  return (
    <span className={styles.noteExpandableText}>
      <span
        id={contentId}
        ref={contentRef}
        className={styles.noteClampedText}
        data-expanded={expanded ? "true" : undefined}
        style={clampStyle}
      >
        {value}
      </span>
      {measuredOverflow ? (
        <button
          type="button"
          className={styles.noteFieldExpand}
          aria-expanded={expanded}
          aria-controls={contentId}
          aria-label={`${t(expanded ? "portNotes.topicPanel.fieldLess" : "portNotes.topicPanel.fieldMore")}: ${label}`}
          onClick={() => setExpanded((current) => !current)}
        >
          {t(expanded ? "portNotes.topicPanel.fieldLess" : "portNotes.topicPanel.fieldMore")}
        </button>
      ) : null}
    </span>
  );
}

export function TopicNoteContent({ summary, details }: { readonly summary: string; readonly details: Readonly<Record<string, string>> }) {
  const { t } = useI18n();
  const detailsId = useId();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const visibleDetails = useMemo(
    () => Object.entries(details).filter(([key, value]) => key !== "context" && value.trim().length > 0),
    [details],
  );

  return (
    <>
      <div className={styles.topicNoteSummary}>
        <span className={styles.noteSummaryIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M6.5 3.5h11v17l-5.5-3.7-5.5 3.7v-17Z" />
          </svg>
        </span>
        <span className={styles.noteSummaryCopy}>
          <strong>{t("portNotes.topicPanel.takeaway")}</strong>
          <span className={styles.noteSummaryValue}>
            <ExpandableNoteText
              value={summary}
              fieldKey="mainNote"
              label={t("portNotes.topicPanel.takeaway")}
            />
          </span>
        </span>
      </div>
      {detailsOpen && visibleDetails.length > 0 ? (
        <dl id={detailsId} className={styles.topicNoteDetails}>
          {visibleDetails.map(([key, value]) => {
            const label = detailLabel(key, t);
            return (
              <div key={key} data-note-detail-key={key}>
                <NoteDetailIcon detailKey={key} />
                <dt>{label}</dt>
                <span className={styles.noteDetailSeparator} aria-hidden="true">:</span>
                <dd><ExpandableNoteText value={value} fieldKey={key} label={label} /></dd>
              </div>
            );
          })}
        </dl>
      ) : null}
      {visibleDetails.length > 0 ? (
        <button
          type="button"
          className={styles.noteDetailsToggle}
          data-note-details-toggle
          aria-expanded={detailsOpen}
          aria-controls={detailsId}
          onClick={() => setDetailsOpen((current) => !current)}
        >
          <span>{detailsOpen
            ? t("portNotes.topicPanel.hideDetails")
            : t("portNotes.topicPanel.viewDetails", { count: visibleDetails.length })}</span>
          <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path d={detailsOpen ? "m5 12 5-5 5 5" : "m5 8 5 5 5-5"} />
          </svg>
        </button>
      ) : null}
    </>
  );
}

export function NoteConfirmationButton({ confirmed, disabled, busy, disabledTitle, onClick }: {
  readonly confirmed: boolean;
  readonly disabled: boolean;
  readonly busy: boolean;
  readonly disabledTitle?: string;
  readonly onClick: () => void;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className={styles.confirmAction}
      data-note-action="confirm"
      aria-pressed={confirmed}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      title={disabled ? disabledTitle : undefined}
      onClick={onClick}
    >
      <NoteActionIcon kind="confirm" />
      <span className={styles.noteActionLabel}>
        {confirmed
          ? t("portNotes.topicPanel.confirmedAction")
          : t("portNotes.topicPanel.confirmInformation")}
      </span>
    </button>
  );
}

function NoteCard({
  note,
  featured,
  onConfirm,
  onChanged,
  onFeedbackCorrection,
  confirmationDisabled,
  confirmationBusy,
}: {
  readonly note: PortNoteRecord;
  readonly featured: boolean;
  readonly onConfirm: () => void;
  readonly onChanged: () => void;
  readonly onFeedbackCorrection: (feedback: NoteFeedbackRecord) => void;
  readonly confirmationDisabled: boolean;
  readonly confirmationBusy: boolean;
}) {
  const { t, formatDate } = useI18n();
  const feedbackPanelId = useId();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackCount, setFeedbackCount] = useState(note.feedbackCount);
  const [focusFeedbackId, setFocusFeedbackId] = useState<string>();

  useEffect(() => setFeedbackCount(note.feedbackCount), [note.feedbackCount]);

  function toggleFeedback() {
    setFocusFeedbackId(undefined);
    setFeedbackOpen((current) => !current);
  }

  return (
    <article className={styles.topicNoteGroup}>
      <div
        className={styles.topicNoteCard}
        data-topic-note-card
        data-featured={featured ? "true" : undefined}
        data-rank-level={note.authorStaffTitle ? undefined : note.authorRank?.level}
      >
      <div className={styles.featuredNoteHeader}>
        <div className={styles.noteAuthorIdentity} data-note-author-identity>
          <UserRankIdentity
            alias={note.publicAlias || t("profile.defaultAlias")}
            rank={note.authorRank ?? DEFAULT_USER_RANK}
            staffTitle={note.authorStaffTitle}
          />
        </div>
      </div>
      <TopicNoteContent summary={note.summary} details={note.details} />
      {note.feedbackChangeAlert ? (
        <div className={styles.feedbackChangeAlert}>
          <span>{t("noteFeedback.changeAlert")}</span>
          <button type="button" onClick={() => { setFocusFeedbackId(note.feedbackChangeAlert?.feedbackId); setFeedbackOpen(true); }}>
            {t("noteFeedback.viewChanged")}
          </button>
        </div>
      ) : null}
      <div className={styles.noteTrustActions}>
        <div className={styles.topicNoteEvidence}>
          <NoteTrustIcon />
          <span className={styles.noteTrustCopy}>
            <strong>{note.accuracy.state === "communityConfirmed" ? t("portNotes.topicPanel.communityConfirmed") : t("portNotes.topicPanel.confirmationCount", { count: note.accuracy.stillCorrect })}</strong>
            <span>{note.lastVerifiedAt ? t("portNotes.topicPanel.lastVerified", { date: formatDate(note.lastVerifiedAt, { month: "short", year: "numeric" }) }) : t("portNotes.topicPanel.notVerified")}</span>
          </span>
        </div>
        <div
          className={styles.noteActionStack}
          data-action-count="3"
        >
          <NoteConfirmationButton
            confirmed={note.accuracy.viewerAnswer === "stillCorrect"}
            disabled={confirmationDisabled}
            busy={confirmationBusy}
            disabledTitle={t("confirmation.selfNotAllowed")}
            onClick={onConfirm}
          />
          <button
            type="button"
            className={styles.feedbackToggle}
            data-note-action="feedback"
            aria-expanded={feedbackOpen}
            aria-controls={feedbackPanelId}
            onClick={toggleFeedback}
          >
            <NoteActionIcon kind="feedback" />
            <span className={styles.noteActionLabel}>{feedbackCount > 0 ? t("noteFeedback.actionCount", { count: feedbackCount }) : t("noteFeedback.addAction")}</span>
          </button>
          <button
            type="button"
            className={styles.changedAction}
            data-note-action="changed"
            onClick={onChanged}
          >
            <NoteActionIcon kind="changed" />
            <span className={styles.noteActionLabel}>{t("portNotes.topicPanel.reportChanged")}</span>
          </button>
        </div>
      </div>
      </div>
      <NoteFeedbackPanel
        noteId={note.id}
        panelId={feedbackPanelId}
        open={feedbackOpen}
        initialCount={feedbackCount}
        focusFeedbackId={focusFeedbackId}
        onApprovedCountChange={setFeedbackCount}
        onProposeCorrection={onFeedbackCorrection}
      />
    </article>
  );
}

const detailKeys: Readonly<Record<string, TranslationKey>> = {
  "common.price": "portNotes.capture.price",
  "common.place": "portNotes.capture.place",
  "common.extra": "portNotes.capture.extra",
};

function detailLabel(key: string, t: (key: TranslationKey) => string): string {
  const direct = detailKeys[key];
  if (direct) return t(direct);
  const [topic, field] = key.split(".");
  const candidate = `portNotes.capture.chip.${topic}.${field}` as TranslationKey;
  return t(candidate) ?? key;
}

function sortFeaturedNotes(
  notes: readonly PortNoteRecord[],
): readonly PortNoteRecord[] {
  return [...notes].sort(
    (left, right) =>
      right.accuracy.stillCorrect - left.accuracy.stillCorrect ||
      left.accuracy.changed - right.accuracy.changed ||
      Number(Boolean(right.contextKey)) - Number(Boolean(left.contextKey)) ||
      right.createdAt.localeCompare(left.createdAt),
  );
}

export function TopicNotesPanel({
  topic,
  portKey,
  contextKey,
  fallbackNotes,
  onWriteNote,
}: TopicNotesPanelProps) {
  const services = useServices();
  const session = useSession();
  const { t } = useI18n();
  const panelRef = useRef<HTMLElement>(null);
  const [notes, setNotes] = useState<readonly PortNoteRecord[]>([]);
  const [ownNotes, setOwnNotes] = useState<readonly PortNoteRecord[]>([]);
  const [nextCursor, setNextCursor] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [confirmationNote, setConfirmationNote] = useState<PortNoteRecord>();
  const [revocationNote, setRevocationNote] = useState<PortNoteRecord>();
  const [busyConfirmationNoteId, setBusyConfirmationNoteId] = useState<string>();
  const [correctionNote, setCorrectionNote] = useState<PortNoteRecord>();
  const [correctionFeedback, setCorrectionFeedback] = useState<NoteFeedbackRecord>();
  const [actionNotice, setActionNotice] = useState<string>();

  const topicLabel = t(topicKeys[topic]);

  useEffect(() => {
    panelRef.current?.scrollIntoView?.({ block: "start", behavior: "smooth" });
    const controller = new AbortController();
    setIsLoading(true);
    setError(false);
    setNextCursor(undefined);

    if (!services.portNotes.isConfigured()) {
      setNotes(legacyNotes(fallbackNotes, topic));
      setOwnNotes([]);
      setIsLoading(false);
      return () => controller.abort();
    }

    void services.portNotes
      .listTopicNotes({
        portKey,
        contextKey,
        topic,
        limit: 3,
        signal: controller.signal,
      })
      .then((page) => {
        if (!controller.signal.aborted) {
          setNotes(sortFeaturedNotes(page.items));
          setNextCursor(page.nextCursor);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    if (session.status === "authenticated") {
      void services.portNotes
        .listMyNotes(portKey, contextKey, { signal: controller.signal })
        .then((items) => {
          if (!controller.signal.aborted) {
            setOwnNotes(items.filter((item) => item.topic === topic));
          }
        })
        .catch(() => undefined);
    }

    return () => controller.abort();
  }, [contextKey, fallbackNotes, portKey, services, session.status, topic]);

  const visibleOwnNotes = useMemo(
    () => ownNotes.filter((note) => note.visibility === "private" || note.moderationState !== "approved"),
    [ownNotes],
  );

  async function loadMore() {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const page = await services.portNotes.listTopicNotes({
        portKey,
        contextKey,
        topic,
        cursor: nextCursor,
        limit: 5,
      });
      setNotes((current) => sortFeaturedNotes([...current, ...page.items]));
      setNextCursor(page.nextCursor);
    } catch {
      setError(true);
    } finally {
      setIsLoadingMore(false);
    }
  }

  function requestAuthentication() {
    if (!session.isConfigured || session.status === "unavailable") {
      setActionNotice(t("settings.loginPlaceholder"));
      return;
    }

    void services.auth
      .signInWithGoogle(`${window.location.pathname}${window.location.search}`)
      .catch(() => setActionNotice(t("settings.authError")));
  }

  return (
    <section className={styles.topicNotesPanel} ref={panelRef} aria-labelledby="topic-notes-heading">
      <div className={styles.topicNotesHeader}>
        <div>
          <p className={styles.sectionEyebrow}>{t("portNotes.topicPanel.featured")}</p>
          <h2 id="topic-notes-heading">{t("portNotes.topicPanel.heading", { topic: topicLabel })}</h2>
        </div>
        <button className={styles.textButton} type="button" onClick={onWriteNote}>
          {t("portNotes.topicPanel.write")}
        </button>
      </div>

      {visibleOwnNotes.length > 0 ? (
        <div className={styles.topicOwnNotes}>
          {visibleOwnNotes.map((note) => (
            <p key={note.id}>
              {note.visibility === "private"
                ? t("portNotes.topicPanel.private")
                : t("portNotes.topicPanel.pending")}
            </p>
          ))}
        </div>
      ) : null}

      {isLoading ? <p className={styles.topicNotesState}>{t("portNotes.topicPanel.loading")}</p> : null}
      {error ? <p className={styles.topicNotesState} role="alert">{t("state.error")}</p> : null}
      {!isLoading && !error && notes.length === 0 ? (
        <div className={styles.topicNotesEmpty}>
          <p>{t("portNotes.topicPanel.empty")}</p>
          <button className={styles.primaryButton} type="button" onClick={onWriteNote}>
            {t("portNotes.topicPanel.write")}
          </button>
        </div>
      ) : null}
      <div className={styles.topicNotesGrid}>
        {notes.map((note, index) => (
          <NoteCard
            key={note.id}
            note={note}
            featured={index === 0}
             confirmationDisabled={session.status === "authenticated" && note.authorId === session.profile?.userId}
             confirmationBusy={busyConfirmationNoteId === note.id}
             onConfirm={() => {
               if (session.status === "authenticated") {
                 if (note.accuracy.viewerAnswer === "stillCorrect") setRevocationNote(note);
                 else setConfirmationNote(note);
               }
               else requestAuthentication();
            }}
            onChanged={() => {
              if (session.status === "authenticated") setCorrectionNote(note);
              else requestAuthentication();
            }}
            onFeedbackCorrection={(feedback) => {
              setCorrectionNote(note);
              setCorrectionFeedback(feedback);
            }}
          />
        ))}
      </div>
      {nextCursor ? (
        <button className={styles.secondaryButton} type="button" onClick={() => void loadMore()} disabled={isLoadingMore}>
          {isLoadingMore ? t("portNotes.topicPanel.loading") : t("portNotes.topicPanel.more")}
        </button>
      ) : null}
      {actionNotice ? <output className={styles.topicNotesState} aria-live="polite">{actionNotice}</output> : null}
      <VerifiedConfirmationDialog
        noteId={confirmationNote?.id}
        open={Boolean(confirmationNote)}
        onClose={() => setConfirmationNote(undefined)}
        onBusyChange={(busy) => setBusyConfirmationNoteId(busy ? confirmationNote?.id : undefined)}
        onSuccess={(result) => {
          setActionNotice(result.rewardedXp > 0 ? t("confirmation.successReward", { xp: result.rewardedXp }) : t("confirmation.successNoReward"));
          if (confirmationNote) {
            setNotes((current) => current.map((note) => note.id === confirmationNote.id ? {
              ...note,
              accuracy: { ...note.accuracy, viewerAnswer: "stillCorrect", stillCorrect: result.communityConfirmationCount },
            } : note));
          }
        }}
      />
      <CancelConfirmationDialog
        noteId={revocationNote?.id}
        open={Boolean(revocationNote)}
        onClose={() => setRevocationNote(undefined)}
        onBusyChange={(busy) => setBusyConfirmationNoteId(busy ? revocationNote?.id : undefined)}
        onSuccess={(result) => {
          setActionNotice(result.revokedXp > 0
            ? t("confirmation.cancelSuccess", { xp: result.revokedXp })
            : t("confirmation.cancelSuccessNoXp"));
          if (revocationNote) {
            setNotes((current) => current.map((note) => note.id === revocationNote.id ? {
              ...note,
              accuracy: { ...note.accuracy, viewerAnswer: undefined, stillCorrect: result.communityConfirmationCount },
            } : note));
          }
        }}
      />
      <CorrectionDialog
        noteId={correctionNote?.id}
        currentInformation={correctionNote?.summary ?? ""}
        initialProposedInformation={correctionFeedback?.body}
        sourceFeedbackId={correctionFeedback?.id}
        open={Boolean(correctionNote)}
        onClose={() => { setCorrectionNote(undefined); setCorrectionFeedback(undefined); }}
        onSuccess={() => { setActionNotice(t("correction.success")); setCorrectionFeedback(undefined); }}
      />
    </section>
  );
}
