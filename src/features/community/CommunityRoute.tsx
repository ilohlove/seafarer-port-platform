import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router";

import { EmptyState, Skeleton, TrustStatus } from "../../components";
import { useServices } from "../../app/providers";
import { useI18n } from "../../i18n";
import type { AsyncState, PublishedPortNoteReadModel } from "../../types";
import {
  buildCommunityLibraryModel,
  normalizeCommunitySearch,
  type CommunityNoteModel,
  type CommunityTopicFilter,
} from "./community-view-model";
import styles from "./community.module.css";

const topicFilters: readonly CommunityTopicFilter[] = [
  "all",
  "connectivity",
  "transport",
  "food",
  "shopping",
  "welfare",
  "other",
];

const topicFilterKeys = {
  all: "community.filter.all",
  connectivity: "community.filter.connectivity",
  transport: "community.filter.transport",
  food: "community.filter.food",
  shopping: "community.filter.shopping",
  welfare: "community.filter.welfare",
  other: "community.filter.other",
} as const;

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </svg>
  );
}

function NoteIcon({ topic }: { readonly topic: CommunityTopicFilter }) {
  const paths: Readonly<Record<CommunityTopicFilter, ReactNode>> = {
    all: <path d="M7 3h10l3 3v15H7zM17 3v4h3M10 11h7M10 15h7" />,
    connectivity: (
      <>
        <path d="M5 12a10 10 0 0 1 14 0M8 15a6 6 0 0 1 8 0" />
        <circle cx="12" cy="19" r="1" />
      </>
    ),
    transport: (
      <>
        <path d="M5 17h14l-1-7H6zM7 10l2-4h6l2 4" />
        <circle cx="8" cy="18" r="1.5" />
        <circle cx="16" cy="18" r="1.5" />
      </>
    ),
    food: (
      <>
        <path d="M7 3v8M4 3v5c0 2 1 3 3 3s3-1 3-3V3M7 11v10" />
        <path d="M16 3v18M16 3c3 2 4 5 4 8h-4" />
      </>
    ),
    shopping: (
      <>
        <path d="M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2" />
      </>
    ),
    welfare: (
      <>
        <path d="M12 21S4 16 4 9a4 4 0 0 1 7-2.6A4 4 0 0 1 18 9c0 7-6 12-6 12Z" />
      </>
    ),
    other: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.8 9a2.4 2.4 0 1 1 3.5 2.1c-.9.5-1.3 1-1.3 2M12 17h.01" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[topic]}
    </svg>
  );
}

function CommunityNoteRow({
  note,
  expanded,
  onToggle,
}: {
  readonly note: CommunityNoteModel;
  readonly expanded: boolean;
  readonly onToggle: () => void;
}) {
  const { t } = useI18n();
  const detailsId = `community-note-${note.id}`;

  return (
    <article
      className={styles.noteRow}
      data-attention={note.needsAttention || undefined}
    >
      <button
        className={styles.noteToggle}
        type="button"
        aria-expanded={expanded}
        aria-controls={detailsId}
        aria-label={t(
          expanded ? "community.note.collapse" : "community.note.expand",
          { title: note.title },
        )}
        onClick={onToggle}
      >
        <span className={styles.noteLead}>
          <span className={styles.topicIcon} aria-hidden="true">
            <NoteIcon topic={note.topic} />
          </span>
          <span className={styles.noteCopy}>
            <span className={styles.topicLabel}>{note.topicLabel}</span>
            <strong>{note.title}</strong>
            <span className={styles.noteSummary}>{note.summary}</span>
          </span>
        </span>

        <span className={styles.noteContext}>{note.context}</span>
        <span className={styles.noteEvidence}>{note.evidence}</span>
        <TrustStatus {...note.trust} compact />
        <span className={styles.chevron} aria-hidden="true">
          {expanded ? "⌃" : "›"}
        </span>
      </button>

      {expanded ? (
        <div className={styles.noteDetails} id={detailsId}>
          <div>
            <span>{t("community.note.details")}</span>
            <p>{note.summary}</p>
          </div>
          <dl>
            <div>
              <dt>{t("community.note.context")}</dt>
              <dd>{note.context}</dd>
            </div>
            <div>
              <dt>{t("community.note.evidence")}</dt>
              <dd>{note.evidence}</dd>
            </div>
          </dl>
          <Link className={styles.portLink} to={`/ports/${note.portSlug}`}>
            {t("community.note.openPort")} →
          </Link>
        </div>
      ) : null}
    </article>
  );
}

export function CommunityRoute() {
  const services = useServices();
  const { t } = useI18n();
  const [state, setState] = useState<
    AsyncState<readonly PublishedPortNoteReadModel[]>
  >({ status: "loading" });
  const [reloadToken, setReloadToken] = useState(0);
  const [query, setQuery] = useState("");
  const [portId, setPortId] = useState("all");
  const [topic, setTopic] = useState<CommunityTopicFilter>("all");
  const [expandedNoteId, setExpandedNoteId] = useState<string>();
  const [isPortChooserOpen, setIsPortChooserOpen] = useState(false);
  const writeButtonRef = useRef<HTMLButtonElement>(null);
  const portChooserRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });

    void services.community
      .listPublishedPortNotes({ signal: controller.signal })
      .then((notes) => {
        if (!controller.signal.aborted) {
          setState(
            notes.length > 0
              ? { status: "success", data: notes }
              : { status: "empty", reason: "no-published-notes" },
          );
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            status: "error",
            error: {
              code: "community-notes-failed",
              message: error instanceof Error ? error.message : String(error),
              retryable: true,
            },
          });
        }
      });

    return () => controller.abort();
  }, [reloadToken, services]);

  useEffect(() => {
    if (!isPortChooserOpen) {
      return;
    }

    portChooserRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsPortChooserOpen(false);
        writeButtonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isPortChooserOpen]);

  const library = useMemo(
    () =>
      state.status === "success"
        ? buildCommunityLibraryModel(state.data, t)
        : { ports: [], notes: [] },
    [state, t],
  );
  const normalizedQuery = normalizeCommunitySearch(query);
  const filteredNotes = library.notes.filter(
    (note) =>
      (portId === "all" || note.portId === portId) &&
      (topic === "all" || note.topic === topic) &&
      (!normalizedQuery || note.searchText.includes(normalizedQuery)),
  );
  const usefulNotes = filteredNotes.filter((note) => !note.needsAttention);
  const attentionNotes = filteredNotes.filter((note) => note.needsAttention);
  const hasActiveFilters = Boolean(normalizedQuery || portId !== "all" || topic !== "all");

  function clearFilters() {
    setQuery("");
    setPortId("all");
    setTopic("all");
    setExpandedNoteId(undefined);
  }

  function renderNoteSection(
    id: string,
    heading: string,
    notes: readonly CommunityNoteModel[],
  ) {
    if (notes.length === 0) {
      return null;
    }

    return (
      <section className={styles.noteSection} aria-labelledby={id}>
        <header className={styles.sectionHeading}>
          <h2 id={id}>{heading}</h2>
          <span>{t("community.section.count", { count: notes.length })}</span>
        </header>
        <div className={styles.noteList}>
          {notes.map((note) => (
            <CommunityNoteRow
              key={note.id}
              note={note}
              expanded={expandedNoteId === note.id}
              onToggle={() =>
                setExpandedNoteId((current) =>
                  current === note.id ? undefined : note.id,
                )
              }
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.libraryHeader} aria-labelledby="community-heading">
        <header className={styles.intro}>
          <div className={styles.introCopy}>
            <p className={styles.eyebrow}>{t("community.eyebrow")}</p>
            <h1 id="community-heading">{t("community.heading")}</h1>
            <p>{t("community.description")}</p>
          </div>
          <button
            ref={writeButtonRef}
            className={styles.writeButton}
            type="button"
            aria-expanded={isPortChooserOpen}
            aria-controls="community-port-chooser"
            onClick={() => setIsPortChooserOpen((open) => !open)}
          >
            <span aria-hidden="true">✎</span>
            {t("community.write")}
          </button>
        </header>

        {isPortChooserOpen ? (
          <div
            ref={portChooserRef}
            className={styles.portChooser}
            id="community-port-chooser"
          >
            <div>
              <strong>{t("community.write.choosePort")}</strong>
              <span>{t("community.write.helper")}</span>
            </div>
            <div className={styles.portChoices}>
              {library.ports.map((port) => (
                <Link key={port.id} to={`/ports/${port.slug}?writeNote=1`}>
                  <strong>{port.name}</strong>
                  <span>{port.location}</span>
                </Link>
              ))}
            </div>
            <button
              className={styles.closeChooser}
              type="button"
              onClick={() => {
                setIsPortChooserOpen(false);
                writeButtonRef.current?.focus();
              }}
            >
              {t("community.write.close")}
            </button>
          </div>
        ) : null}

        <div className={styles.filters}>
          <div className={styles.filterRow}>
            <label className={styles.searchField}>
              <span className="visually-hidden">{t("community.search.label")}</span>
              <SearchIcon />
              <input
                type="search"
                value={query}
                placeholder={t("community.search.placeholder")}
                onChange={(event) => setQuery(event.currentTarget.value)}
              />
              {query ? (
                <button
                  type="button"
                  aria-label={t("search.form.clear")}
                  onClick={() => setQuery("")}
                >
                  ×
                </button>
              ) : null}
            </label>

            <label className={styles.portFilter}>
              <span className="visually-hidden">{t("community.port.label")}</span>
              <select
                value={portId}
                aria-label={t("community.port.label")}
                onChange={(event) => setPortId(event.currentTarget.value)}
              >
                <option value="all">{t("community.port.all")}</option>
                {library.ports.map((port) => (
                  <option value={port.id} key={port.id}>
                    {port.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className={styles.topicFilters}>
            <legend className="visually-hidden">
              {t("community.filters.label")}
            </legend>
            {topicFilters.map((candidate) => (
              <button
                type="button"
                key={candidate}
                aria-pressed={topic === candidate}
                onClick={() => setTopic(candidate)}
              >
                {t(topicFilterKeys[candidate])}
              </button>
            ))}
          </fieldset>
        </div>
      </section>

      {state.status === "loading" ? (
        <Skeleton label={t("community.loading")} lines={4} variant="list" />
      ) : null}

      {state.status === "error" ? (
        <EmptyState
          heading={t("community.error.heading")}
          description={t("community.error.description")}
          action={{
            label: t("community.error.retry"),
            onClick: () => setReloadToken((token) => token + 1),
          }}
          announce
        />
      ) : null}

      {state.status === "empty" ||
      (state.status === "success" && filteredNotes.length === 0) ? (
        <EmptyState
          heading={t("community.empty.heading")}
          description={t("community.empty.description")}
          action={
            hasActiveFilters
              ? { label: t("community.empty.clear"), onClick: clearFilters }
              : undefined
          }
        />
      ) : null}

      {state.status === "success" && filteredNotes.length > 0 ? (
        <div className={styles.sections}>
          {renderNoteSection(
            "community-useful-heading",
            t("community.useful.heading"),
            usefulNotes,
          )}
          {renderNoteSection(
            "community-attention-heading",
            t("community.attention.heading"),
            attentionNotes,
          )}
        </div>
      ) : null}
    </div>
  );
}
