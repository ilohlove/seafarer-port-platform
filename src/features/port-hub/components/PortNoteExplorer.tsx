import { useMemo, useState } from "react";

import { TrustStatus } from "../../../components";
import { useI18n, type TranslationKey } from "../../../i18n";
import type { NoteTopic } from "../../../types";
import type { PortNoteCardModel } from "../port-notes-view-model";
import styles from "../port-notes.module.css";
import { UserRankIdentity } from "../../user-rank";

export interface PortNoteExplorerProps {
  readonly notes: readonly PortNoteCardModel[];
  readonly onPlaceholder: (feature: string) => void;
  readonly onWriteNote: () => void;
}

const topicFilters: readonly NoteTopic[] = [
  "esim",
  "physicalSim",
  "taxi",
  "foodOrder",
  "shopping",
  "seamanClub",
];

const topicKeys: Readonly<Record<NoteTopic, TranslationKey>> = {
  esim: "portNotes.topic.esim",
  physicalSim: "portNotes.topic.physicalSim",
  taxi: "portNotes.topic.taxi",
  rideHailing: "portNotes.topic.rideHailing",
  foodOrder: "portNotes.topic.foodOrder",
  supplies: "portNotes.topic.supplies",
  shopping: "portNotes.topic.shopping",
  placesToVisit: "portNotes.topic.placesToVisit",
  seamanClub: "portNotes.topic.seamanClub",
  shoreLeave: "portNotes.topic.shoreLeave",
  warning: "portNotes.topic.warning",
  generalTip: "portNotes.topic.generalTip",
};

export function PortNoteExplorer({
  notes,
  onPlaceholder,
  onWriteNote,
}: PortNoteExplorerProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<NoteTopic>();
  const featuredNotes = notes.slice(0, 3);
  const isFiltering = Boolean(query.trim() || topic);
  const filteredNotes = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return notes.filter((note) => {
      const matchesTopic = !topic || note.topicKey === topic;
      const searchable = `${note.title} ${note.summary} ${note.topic} ${note.context ?? ""}`.toLocaleLowerCase();
      return matchesTopic && (!normalized || searchable.includes(normalized));
    });
  }, [notes, query, topic]);

  function renderNote(note: PortNoteCardModel, featured = false) {
    return (
      <article
        className={styles.noteCard}
        data-featured={featured ? "true" : undefined}
        data-note-kind={featured ? "primary" : "secondary"}
        key={note.id}
      >
        <div className={styles.noteMeta}>
          <span className={styles.topicTag}>{note.topic}</span>
          <TrustStatus {...note.trust} compact />
        </div>
        <h3>{note.title}</h3>
        <p>{note.summary}</p>
        <UserRankIdentity
          alias={note.authorLabel}
          rank={note.authorRank}
          context={note.context}
        />
        <div className={styles.noteEvidence}>
          <span>{note.confirmations}</span>
          <span>{note.usefulness}</span>
        </div>
        <div className={styles.noteActions}>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() =>
              onPlaceholder(t("portNotes.notes.viewPlaceholder", { title: note.title }))
            }
          >
            {t("portNotes.notes.view")}
          </button>
          <button
            className={styles.textButton}
            type="button"
            onClick={() =>
              onPlaceholder(t("portNotes.notes.confirmPlaceholder", { title: note.title }))
            }
          >
            {t("portNotes.notes.confirm")}
          </button>
        </div>
      </article>
    );
  }

  return (
    <section id="notes-explorer" aria-labelledby="top-notes-heading">
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionEyebrow}>{t("portNotes.notes.eyebrow")}</p>
          <h2 id="top-notes-heading">{t("portNotes.notes.heading")}</h2>
        </div>
        <span className={styles.sectionCaption}>{t("portNotes.noteBrowser.caption")}</span>
      </div>

      {!isFiltering && featuredNotes.length > 0 ? (
        <div className={styles.notesList}>
          {featuredNotes.map((note, index) => renderNote(note, index === 0))}
        </div>
      ) : (
        <div className={styles.noDataCard}>
          <h3>{t("portNotes.notes.emptyHeading")}</h3>
          <p>{t("portNotes.notes.emptyDescription")}</p>
          <button className={styles.primaryButton} type="button" onClick={onWriteNote}>
            {t("portNotes.notes.write")}
          </button>
        </div>
      )}

      <section className={styles.noteBrowser} aria-labelledby="note-browser-heading">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>{t("portNotes.noteBrowser.eyebrow")}</p>
            <h3 id="note-browser-heading">{t("portNotes.noteBrowser.heading")}</h3>
          </div>
          <span className={styles.sectionCaption}>{t("portNotes.noteBrowser.caption")}</span>
        </div>
        <label className={styles.noteSearchLabel} htmlFor="port-note-filter">
          {t("portNotes.noteBrowser.searchLabel")}
        </label>
        <input
          id="port-note-filter"
          className={styles.noteSearchInput}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder={t("portNotes.noteBrowser.searchPlaceholder")}
        />
        <fieldset className={styles.noteFilters}>
          <legend className="visually-hidden">{t("portNotes.noteBrowser.filterLabel")}</legend>
          <button
            className={!topic ? styles.activeFilter : undefined}
            type="button"
            aria-pressed={!topic}
            onClick={() => setTopic(undefined)}
          >
            {t("portNotes.noteBrowser.all")}
          </button>
          {topicFilters.map((candidate) => (
            <button
              className={topic === candidate ? styles.activeFilter : undefined}
              type="button"
              aria-pressed={topic === candidate}
              key={candidate}
              onClick={() => setTopic(candidate)}
            >
              {t(topicKeys[candidate])}
            </button>
          ))}
        </fieldset>
        {isFiltering ? (
          filteredNotes.length > 0 ? (
            <div className={styles.notesList}>
              {filteredNotes.map((note) => renderNote(note))}
            </div>
          ) : (
            <p className={styles.noteEmpty}>{t("portNotes.noteBrowser.empty")}</p>
          )
        ) : null}
      </section>
    </section>
  );
}
