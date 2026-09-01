import { useEffect, useState } from "react";

import { EmptyState, Skeleton } from "../../components";
import { useServices, useSession } from "../../app/providers";
import { useI18n, type TranslationKey } from "../../i18n";
import type { PortNoteModerationState, PortNoteRecord } from "../../types";
import { DEFAULT_USER_RANK, UserRankIdentity } from "../user-rank";
import styles from "./my-notes.module.css";

const topicLabels: Readonly<Record<PortNoteRecord["topic"], TranslationKey>> = {
  esim: "portNotes.topic.esim",
  physicalSim: "portNotes.topic.physicalSim",
  shoreLeave: "portNotes.topic.shoreLeave",
  food: "portNotes.topic.foodOrder",
  shopping: "portNotes.topic.shopping",
  welfare: "portNotes.topic.seamanClub",
  general: "portNotes.topic.generalTip",
};

const stateLabels: Readonly<Record<PortNoteModerationState, TranslationKey>> = {
  notRequired: "myNotes.private",
  pending: "myNotes.pending",
  approved: "myNotes.approved",
  rejected: "myNotes.rejected",
  quarantined: "myNotes.quarantined",
};

export function MyNotesRoute() {
  const services = useServices();
  const session = useSession();
  const { t } = useI18n();
  const [notes, setNotes] = useState<readonly PortNoteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(session.status === "loading");

  useEffect(() => {
    if (session.status !== "authenticated") {
      setIsLoading(session.status === "loading");
      return;
    }
    let active = true;
    setIsLoading(true);
    void services.portNotes
      .listAllMyNotes()
      .then((items) => {
        if (active) setNotes(items);
      })
      .catch(() => {
        if (active) setNotes([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [services, session.status]);

  if (isLoading) {
    return <Skeleton label={t("state.loading")} lines={6} variant="list" />;
  }

  if (session.status !== "authenticated") {
    return (
      <EmptyState
        heading={t("myNotes.loginRequired")}
        description={t("settings.loginPlaceholder")}
        action={{ label: t("settings.loginLabel"), href: "/profile" }}
        announce
      />
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>CrewPort</p>
        <h1>{t("myNotes.heading")}</h1>
        <p>{t("myNotes.description")}</p>
        {session.profile ? (
          <div className={styles.rankSummary}>
            <UserRankIdentity
              alias={session.profile.nickname ?? session.profile.fullName}
              rank={session.profile.rank ?? DEFAULT_USER_RANK}
              avatarUrl={session.profile.avatarUrl}
            />
          </div>
        ) : null}
      </header>
      {notes.length === 0 ? <p className={styles.empty}>{t("myNotes.empty")}</p> : null}
      <div className={styles.list}>
        {notes.map((note) => (
          <article className={styles.card} key={note.id}>
            <div className={styles.meta}>
              <span>{t(topicLabels[note.topic])}</span>
              <span>{t(stateLabels[note.moderationState])}</span>
            </div>
            <p>{note.summary}</p>
            <small>{note.portKey}{note.contextKey ? ` · ${note.contextKey}` : ""}</small>
          </article>
        ))}
      </div>
    </div>
  );
}
