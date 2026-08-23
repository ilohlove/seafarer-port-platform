import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import { EmptyState, OfflineBanner, PortResultCard, SearchBox, Skeleton } from "../../components";
import { useBandwidthMode, useServices } from "../../app/providers";
import { useI18n, type TranslationKey } from "../../i18n";
import {
  deriveTrustDisplayStatus,
  type AsyncState,
  type PortSummary,
  type TrustDisplayStatus,
} from "../../types";
import { SiteNavigation } from "../navigation";
import styles from "./home.module.css";

const exampleQueries = ["Busan", "Singapore", "Port Klang"] as const;
const trustTranslationKeys = {
  officialSource: "trust.officialSource",
  communityConfirmed: "trust.communityConfirmed",
  needsConfirmation: "trust.needsConfirmation",
  conflictingReports: "trust.conflictingReports",
  unknown: "trust.unknown",
} as const satisfies Record<TrustDisplayStatus, TranslationKey>;

interface HomeSearchData {
  readonly items: readonly PortSummary[];
  readonly total: number;
}

function getTrustLabel(
  port: PortSummary,
  translate: (key: TranslationKey, variables?: Record<string, string | number>) => string,
) {
  const status = deriveTrustDisplayStatus(port.trust);
  return { status, label: translate(trustTranslationKeys[status]) };
}

export function HomeRoute() {
  const services = useServices();
  const { t } = useI18n();
  const { mode } = useBandwidthMode();
  const location = useLocation();
  const navigate = useNavigate();
  const queryFromUrl = new URLSearchParams(location.search).get("q") ?? "";
  const [query, setQuery] = useState(queryFromUrl);
  const [state, setState] = useState<AsyncState<HomeSearchData>>({
    status: queryFromUrl ? "loading" : "empty",
    ...(queryFromUrl ? {} : { reason: "idle" }),
  });
  const [notice, setNotice] = useState<string>();

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
              code: "home-search-failed",
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
    setNotice(undefined);
    navigate(normalized ? `/?q=${encodeURIComponent(normalized)}` : "/");
  }

  return (
    <div className={styles.page}>
      <SiteNavigation current="home" onPlaceholder={setNotice} />

      <div className={styles.workspace}>
        {notice ? (
          <output className={styles.notice} aria-live="polite">
            {t("portNotes.placeholder", { feature: notice })}
          </output>
        ) : null}

        {mode !== "standard" ? (
          <OfflineBanner
            compact
            mode={mode}
            title={t("home.bandwidth.title")}
            message={t("home.bandwidth.message")}
          />
        ) : null}

        <header className={styles.intro}>
          <p className={styles.eyebrow}>{t("home.eyebrow")}</p>
          <h1>{t("home.heading")}</h1>
          <p>{t("home.intro")}</p>
        </header>

        <section
          id="home-search"
          className={styles.searchPanel}
          aria-labelledby="home-search-heading"
        >
          <div className={styles.sectionHeading}>
            <p className={styles.sectionEyebrow}>{t("home.search.eyebrow")}</p>
            <h2 id="home-search-heading">{t("home.search.heading")}</h2>
          </div>
          <SearchBox
            value={query}
            onChange={setQuery}
            onSubmit={submitSearch}
            label={t("home.search.label")}
            placeholder={t("home.search.placeholder")}
            submitLabel={t("home.search.submit")}
            clearLabel={t("home.search.clear")}
            helperText={t("home.search.help")}
            id="home-port-search"
          />
        </section>

        {state.status === "loading" ? (
          <section aria-label={t("home.search.loading")}>
            <Skeleton label={t("home.search.loading")} lines={4} variant="list" />
          </section>
        ) : null}

        {state.status === "error" ? (
          <EmptyState
            heading={t("home.search.error")}
            description={state.error.message}
            action={{
              label: t("home.search.retry"),
              onClick: () => submitSearch(query),
            }}
            announce
          />
        ) : null}

        {state.status === "empty" && state.reason === "no-results" ? (
          <EmptyState
            heading={t("home.search.noResults")}
            description={t("home.search.noResultsDescription")}
            symbol="?"
            announce
          />
        ) : null}

        {state.status === "success" ? (
          <section className={styles.results} aria-labelledby="home-results-heading">
            <div className={styles.sectionHeading}>
              <p className={styles.sectionEyebrow}>{t("home.results.eyebrow")}</p>
              <h2 id="home-results-heading">
                {t("home.results.heading", { count: state.data.total })}
              </h2>
            </div>
            <div className={styles.resultGrid}>
              {state.data.items.map((port) => {
                const trust = getTrustLabel(port, t);
                return (
                <PortResultCard
                  key={port.id}
                  href={`/ports/${port.slug}`}
                  onClick={(event) => {
                    event.preventDefault();
                    navigate(`/ports/${port.slug}`);
                  }}
                  name={port.name}
                  country={port.country.name}
                  city={port.city}
                  unLocode={port.unLocode}
                  terminalContext={port.terminalNames.join(" · ")}
                  actionLabel={t("home.results.open")}
                  trust={trust}
                />
                );
              })}
            </div>
          </section>
        ) : null}

        {state.status === "empty" && state.reason === "idle" ? (
          <section className={styles.examples} aria-labelledby="home-examples-heading">
            <div className={styles.sectionHeading}>
              <p className={styles.sectionEyebrow}>{t("home.examples.eyebrow")}</p>
              <h2 id="home-examples-heading">{t("home.examples.heading")}</h2>
            </div>
            <div className={styles.exampleList}>
              {exampleQueries.map((example) => (
                <button
                  type="button"
                  key={example}
                  onClick={() => submitSearch(example)}
                >
                  {example}
                  <span aria-hidden="true">→</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className={styles.principles} aria-labelledby="home-principles-heading">
          <div className={styles.sectionHeading}>
            <p className={styles.sectionEyebrow}>{t("home.principles.eyebrow")}</p>
            <h2 id="home-principles-heading">{t("home.principles.heading")}</h2>
          </div>
          <ul>
            <li>{t("home.principles.search")}</li>
            <li>{t("home.principles.trust")}</li>
            <li>{t("home.principles.bandwidth")}</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
