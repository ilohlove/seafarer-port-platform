import { useEffect, useMemo, useRef, useState } from "react";

import { TrustStatus, type TrustStatusPresentation } from "../../../components";
import { useServices, useSession } from "../../../app/providers";
import { useI18n, type TranslationKey } from "../../../i18n";
import type { PortNoteRecord, PortNoteTopic } from "../../../types";
import type { PortNoteCardModel } from "../port-notes-view-model";
import { DEFAULT_USER_RANK, UserRankIdentity } from "../../user-rank";
import { CorrectionDialog, VerifiedConfirmationDialog } from "../../reputation";
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

function trustForNote(
  note: PortNoteRecord,
  t: (key: TranslationKey) => string,
): TrustStatusPresentation {
  if (note.accuracy.state === "communityConfirmed") {
    return { status: "communityConfirmed", label: t("trust.communityConfirmed") };
  }
  if (note.accuracy.state === "needsReview") {
    return { status: "conflictingReports", label: t("portNotes.topicPanel.needsReview") };
  }
  return { status: "needsConfirmation", label: t("trust.needsConfirmation") };
}

function NoteCard({
  note,
  featured,
  onConfirm,
  onChanged,
  onHelpful,
  canAssess,
}: {
  readonly note: PortNoteRecord;
  readonly featured: boolean;
  readonly onConfirm: () => void;
  readonly onChanged: () => void;
  readonly onHelpful: () => void;
  readonly canAssess: boolean;
}) {
  const { t } = useI18n();
  const trust = trustForNote(note, t);
  const visibleDetails = Object.entries(note.details).filter(
    ([key]) => key !== "context",
  );

  return (
    <article
      className={styles.topicNoteCard}
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
        <TrustStatus {...trust} compact />
      </div>
      <p className={styles.topicNoteSummary}>{note.summary}</p>
      {visibleDetails.length > 0 ? (
        <dl className={styles.topicNoteDetails}>
          <dt>{t("portNotes.topicPanel.details")}</dt>
          {visibleDetails.map(([key, value]) => (
            <dd key={key}>{value}</dd>
          ))}
        </dl>
      ) : null}
      <div className={styles.topicNoteEvidence}>
        {t("portNotes.topicPanel.evidence", {
          confirmed: note.accuracy.stillCorrect,
          changed: note.accuracy.changed,
        })}
      </div>
      {canAssess ? (
        <fieldset className={styles.accuracyFieldset}>
          <legend>{t("portNotes.topicPanel.accuracy")}</legend>
          <button
            type="button"
            aria-pressed={note.accuracy.viewerAnswer === "stillCorrect"}
            onClick={onConfirm}
          >
            {t("portNotes.topicPanel.stillCorrect")}
          </button>
          <button
            type="button"
            aria-pressed={note.accuracy.viewerAnswer === "changed"}
            onClick={onChanged}
          >
            {t("portNotes.topicPanel.changed")}
          </button>
          <button type="button" onClick={onHelpful}>
            {t("portNotes.topicPanel.helpful")}
          </button>
        </fieldset>
      ) : null}
    </article>
  );
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
  const [correctionNote, setCorrectionNote] = useState<PortNoteRecord>();
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

  async function markHelpful(noteId: string) {
    try {
      await services.reputation.setHelpful(noteId, true);
      setActionNotice(t("confirmation.successNoReward"));
    } catch {
      setError(true);
    }
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
            canAssess={session.status === "authenticated" && note.authorId !== session.profile?.userId}
            onConfirm={() => setConfirmationNote(note)}
            onChanged={() => setCorrectionNote(note)}
            onHelpful={() => void markHelpful(note.id)}
          />
        ))}
      </div>
      {session.status !== "authenticated" && notes.length > 0 ? (
        <p className={styles.topicNotesLogin}>{t("portNotes.topicPanel.loginToAssess")}</p>
      ) : null}
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
        onSuccess={(rewardedXp) => {
          setActionNotice(rewardedXp > 0 ? t("confirmation.successReward", { xp: rewardedXp }) : t("confirmation.successNoReward"));
          if (confirmationNote) {
            setNotes((current) => current.map((note) => note.id === confirmationNote.id ? {
              ...note,
              accuracy: { ...note.accuracy, viewerAnswer: "stillCorrect", stillCorrect: note.accuracy.stillCorrect + 1 },
            } : note));
          }
        }}
      />
      <CorrectionDialog
        noteId={correctionNote?.id}
        currentInformation={correctionNote?.summary ?? ""}
        open={Boolean(correctionNote)}
        onClose={() => setCorrectionNote(undefined)}
        onSuccess={() => setActionNotice(t("correction.success"))}
      />
    </section>
  );
}
