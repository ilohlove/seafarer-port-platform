import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";

import {
  EmptyState,
  OfflineBanner,
  SearchBox,
  Skeleton,
} from "../../components";
import { useBandwidthMode, useServices } from "../../app/providers";
import { useI18n } from "../../i18n";
import type { AsyncState, PortSearchHit, PortSearchResult } from "../../types";
import styles from "./search.module.css";

const searchHints = ["Busan", "SGSIN", "Crew Gate", "Port Klang"] as const;

function uniqueLocationParts(hit: PortSearchHit): string {
  const parts = [hit.port.city, hit.port.country.name].filter(
    (value): value is string => Boolean(value),
  );
  const uniqueParts = parts.filter((value, index) => parts.indexOf(value) === index);
  return [
    ...uniqueParts,
    hit.port.unLocode,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" · ");
}

function SearchResultRow({
  hit,
  actionLabel,
  matchLabel,
  terminalLabel,
  gateLabel,
}: {
  readonly hit: PortSearchHit;
  readonly actionLabel: string;
  readonly matchLabel: string;
  readonly terminalLabel: string;
  readonly gateLabel: string;
}) {
  const { port, match } = hit;
  const contextLabels = match.context
    ? [
        `${terminalLabel}: ${match.context.terminalName}`,
        ...(match.context.gateName ? [`${gateLabel}: ${match.context.gateName}`] : []),
      ]
    : port.terminalNames.slice(0, 2).map((name) => `${terminalLabel}: ${name}`);
  const remainingTerminalCount = Math.max(
    0,
    port.terminalNames.length - (match.context ? 1 : contextLabels.length),
  );

  return (
    <Link
      className={styles.resultRow}
      to={`/ports/${port.slug}`}
      aria-label={`${actionLabel}: ${port.name}`}
    >
      <span className={styles.resultIdentity}>
        <strong>{port.name}</strong>
        <span>{uniqueLocationParts(hit)}</span>
      </span>
      <span className={styles.resultContext}>
        <span className={styles.matchReason}>{matchLabel}</span>
        <span className={styles.contextChips}>
          {contextLabels.map((label) => (
            <span className={styles.contextChip} key={label}>
              {label}
            </span>
          ))}
          {remainingTerminalCount > 0 ? (
            <span className={styles.contextChip}>+{remainingTerminalCount}</span>
          ) : null}
        </span>
      </span>
      <span className={styles.resultAction} aria-hidden="true">
        {actionLabel} →
      </span>
    </Link>
  );
}

export function SearchRoute() {
  const services = useServices();
  const { t } = useI18n();
  const { mode } = useBandwidthMode();
  const location = useLocation();
  const navigate = useNavigate();
  const queryFromUrl = new URLSearchParams(location.search).get("q")?.trim() ?? "";
  const [query, setQuery] = useState(queryFromUrl);
  const [state, setState] = useState<AsyncState<PortSearchResult>>({
    status: queryFromUrl.trim() ? "loading" : "empty",
    ...(queryFromUrl.trim() ? {} : { reason: "idle" }),
  });

  useEffect(() => {
    setQuery(queryFromUrl);

    if (!queryFromUrl.trim()) {
      setState({ status: "empty", reason: "idle" });
      return;
    }

    const controller = new AbortController();
    setState({ status: "loading" });

    void services.ports
      .search({ query: queryFromUrl, limit: 6 }, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) {
          setState(
            result.items.length > 0
              ? { status: "success", data: result }
              : { status: "empty", reason: "no-results" },
          );
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            status: "error",
            error: {
              code: "search-failed",
              message: error instanceof Error ? error.message : String(error),
              retryable: true,
            },
          });
        }
      });

    return () => controller.abort();
  }, [queryFromUrl, services]);

  function submitSearch(nextQuery: string) {
    const normalized = nextQuery.trim();
    navigate(normalized ? `/search?q=${encodeURIComponent(normalized)}` : "/search");
  }

  const matchLabel = (hit: PortSearchHit): string => {
    if (hit.match.kind === "terminal") {
      return t("search.results.matchTerminal", { value: hit.match.value });
    }
    if (hit.match.kind === "gate") {
      return t("search.results.matchGate", { value: hit.match.value });
    }
    return t("search.results.match", { value: hit.match.value });
  };

  return (
    <div className={styles.page}>
      <div className={styles.workspace}>
        {mode !== "standard" ? (
          <OfflineBanner
            compact
            mode={mode}
            title={t("search.bandwidth.title")}
            message={t("search.bandwidth.message")}
          />
        ) : null}

        <section className={styles.searchStrip} aria-labelledby="search-page-heading">
          <div className={styles.searchHeading}>
            <h1 id="search-page-heading">{t("search.heading")}</h1>
            <p>{t("search.form.helper")}</p>
          </div>
          <SearchBox
            value={query}
            onChange={setQuery}
            onSubmit={submitSearch}
            onClear={() => navigate("/search")}
            label={t("search.form.label")}
            placeholder={t("search.form.placeholder")}
            submitLabel={t("search.form.submit")}
            clearLabel={t("search.form.clear")}
            labelVisuallyHidden
            id="search-page-input"
          />
        </section>

        <div className={styles.searchLayout}>
          <main className={styles.results} aria-labelledby="search-results-heading">
            <div className={styles.sectionHeading}>
              <p>{t("search.results.eyebrow")}</p>
              <h2 id="search-results-heading">
                {state.status === "success"
                  ? t("search.results.heading", { count: state.data.total })
                  : t("search.results.title")}
              </h2>
            </div>

            {state.status === "loading" ? (
              <div className={styles.resultList} aria-label={t("search.loading")}>
                <Skeleton label={t("search.loading")} lines={3} variant="list" />
              </div>
            ) : null}

            {state.status === "error" ? (
              <EmptyState
                heading={t("search.error.heading")}
                description={state.error.message}
                action={{
                  label: t("search.error.retry"),
                  onClick: () => submitSearch(query),
                }}
                announce
              />
            ) : null}

            {state.status === "empty" && state.reason === "idle" ? (
              <EmptyState
                heading={t("search.empty.heading")}
                description={t("search.empty.description")}
              />
            ) : null}

            {state.status === "empty" && state.reason === "no-results" ? (
              <EmptyState
                heading={t("search.empty.noResults", { query: queryFromUrl })}
                description={
                  <>
                    <p>{t("search.empty.noResultsDescription")}</p>
                    <ul className={styles.emptyHints}>
                      <li>{t("search.empty.hintPort")}</li>
                      <li>{t("search.empty.hintTerminal")}</li>
                      <li>{t("search.empty.hintCode")}</li>
                      <li>{t("search.empty.hintLocation")}</li>
                    </ul>
                  </>
                }
                symbol="?"
                announce
              />
            ) : null}

            {state.status === "success" ? (
              <div className={styles.resultList}>
                {state.data.items.map((hit) => (
                  <SearchResultRow
                    key={hit.port.id}
                    hit={hit}
                    actionLabel={t("search.results.open")}
                    matchLabel={matchLabel(hit)}
                    terminalLabel={t("search.results.terminal")}
                    gateLabel={t("search.results.gate")}
                  />
                ))}
              </div>
            ) : null}
          </main>

          <aside className={styles.helperCard} aria-labelledby="search-helper-heading">
            <p className={styles.helperEyebrow}>{t("search.helper.eyebrow")}</p>
            <h2 id="search-helper-heading">{t("search.helper.heading")}</h2>
            <p>{t("search.helper.description")}</p>
            <h3>{t("search.helper.methodsHeading")}</h3>
            <ul>
              <li>{t("search.helper.methodPort")}</li>
              <li>{t("search.helper.methodTerminal")}</li>
              <li>{t("search.helper.methodGate")}</li>
              <li>{t("search.helper.methodLocation")}</li>
              <li>{t("search.helper.methodCode")}</li>
            </ul>
            <div className={styles.hintChips} aria-label={t("search.helper.examplesLabel")}>
              {searchHints.map((hint) => (
                <button type="button" key={hint} onClick={() => submitSearch(hint)}>
                  {hint}
                </button>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
