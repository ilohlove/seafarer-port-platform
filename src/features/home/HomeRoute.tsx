import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";

import { OfflineBanner, SearchBox } from "../../components";
import { useBandwidthMode } from "../../app/providers";
import { useI18n } from "../../i18n";
import { usePortSuggestions } from "../search/use-port-suggestions";
import styles from "./home.module.css";

const exampleQueries = [
  { label: "Busan", query: "Busan" },
  { label: "Singapore", query: "Singapore" },
  { label: "Port Klang", query: "Port Klang" },
  { label: "Busan New Port", query: "Busan New Port" },
  { label: "Pasir Panjang", query: "Pasir Panjang" },
  { label: "Westports", query: "Westports" },
] as const;

export function HomeRoute() {
  const { t } = useI18n();
  const { mode } = useBandwidthMode();
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const autocompleteEnabled = mode !== "ultraLite";
  const { suggestions, loading: suggestionsLoading } = usePortSuggestions(query, {
    enabled: autocompleteEnabled,
    minimumLength: mode === "dataSaver" ? 3 : 2,
    debounceMs: mode === "dataSaver" ? 350 : 180,
  });
  const queryFromUrl = new URLSearchParams(location.search).get("q")?.trim();

  if (queryFromUrl) {
    return <Navigate to={`/search?q=${encodeURIComponent(queryFromUrl)}`} replace />;
  }

  function submitSearch(nextQuery: string) {
    const normalized = nextQuery.trim();
    navigate(normalized ? `/search?q=${encodeURIComponent(normalized)}` : "/search");
  }

  return (
    <div className={styles.page}>
      <div className={styles.workspace}>
        {mode !== "standard" ? (
          <OfflineBanner
            compact
            mode={mode}
            title={t("home.bandwidth.title")}
            message={t("home.bandwidth.message")}
          />
        ) : null}

        <div className={styles.primaryGrid}>
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
              suggestions={autocompleteEnabled ? suggestions : undefined}
              suggestionsLabel={t("home.results.eyebrow")}
              suggestionsLoading={suggestionsLoading}
              onSuggestionSelect={
                autocompleteEnabled
                  ? (suggestion) => {
                      const selected = suggestions.find(
                        (candidate) => candidate.id === suggestion.id,
                      );
                      if (selected) {
                        navigate(`/ports/${selected.slug}`);
                      }
                    }
                  : undefined
              }
              id="home-port-search"
            />
          </section>
        </div>

        <div className={styles.secondaryGrid}>
          <section className={styles.examples} aria-labelledby="home-examples-heading">
            <div className={styles.sectionHeading}>
              <p className={styles.sectionEyebrow}>{t("home.examples.eyebrow")}</p>
              <h2 id="home-examples-heading">{t("home.examples.heading")}</h2>
            </div>
            <div className={styles.exampleList}>
              {exampleQueries.map((example) => (
                <button
                  type="button"
                  key={example.query}
                  onClick={() => submitSearch(example.query)}
                >
                  {example.label}
                  <span aria-hidden="true">→</span>
                </button>
              ))}
            </div>
          </section>

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
    </div>
  );
}
