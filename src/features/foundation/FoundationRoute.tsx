import { useEffect, useRef, useState } from "react";

import {
  ActionBar,
  CriticalInfoStrip,
  EmptyState,
  OfflineBanner,
  PortResultCard,
  QuickBrief,
  SearchBox,
  ServiceCard,
  Skeleton,
  type TrustStatusPresentation,
} from "../../components";
import { useI18n } from "../../i18n";
import {
  deriveTrustDisplayStatus,
  type AsyncState,
  type PortHubReadModel,
  type PortSummary,
  type TrustDisplayStatus,
} from "../../types";
import { useBandwidthMode, useServices } from "../../app/providers";
import styles from "./foundation.module.css";

interface FoundationData {
  readonly search: {
    readonly items: readonly PortSummary[];
  };
}

const trustTranslationKeys = {
  officialSource: "trust.officialSource",
  communityConfirmed: "trust.communityConfirmed",
  needsConfirmation: "trust.needsConfirmation",
  conflictingReports: "trust.conflictingReports",
  unknown: "trust.unknown",
} as const;

function toTrustPresentation(
  status: TrustDisplayStatus,
  t: ReturnType<typeof useI18n>["t"],
): TrustStatusPresentation {
  return {
    status,
    label: t(trustTranslationKeys[status]),
  };
}

export function FoundationRoute() {
  const services = useServices();
  const { t } = useI18n();
  const { mode } = useBandwidthMode();
  const labels = {
    eyebrow: t("foundation.eyebrow"),
    heading: t("foundation.heading"),
    intro: t("foundation.intro"),
    searchLabel: t("foundation.searchLabel"),
    searchPlaceholder: t("foundation.searchPlaceholder"),
    searchSubmit: t("foundation.searchSubmit"),
    searchClear: t("foundation.searchClear"),
    searchHelp: t("foundation.searchHelp"),
    loading: t("foundation.loading"),
    noResult: t("foundation.noResult"),
    noResultDescription: t("foundation.noResultDescription"),
    error: t("foundation.error"),
    retry: t("foundation.retry"),
    brief: t("foundation.brief"),
    briefDescription: t("foundation.briefDescription"),
    services: t("foundation.services"),
    reason: t("foundation.reason"),
    actionLabel: t("foundation.actionLabel"),
    modeTitle: t("foundation.modeTitle"),
    modeMessage: t("foundation.modeMessage"),
    viewPort: t("foundation.viewPort"),
    detailHeading: t("foundation.detailHeading"),
    plan: t("foundation.actionPlan"),
    offline: t("foundation.actionOffline"),
    share: t("foundation.actionShare"),
    report: t("foundation.actionReport"),
  };
  const [query, setQuery] = useState("Singapore");
  const [submittedQuery, setSubmittedQuery] = useState("Singapore");
  const [selectedPortSlug, setSelectedPortSlug] = useState<string>();
  const [reloadToken, setReloadToken] = useState(0);
  const [detailReloadToken, setDetailReloadToken] = useState(0);
  const [state, setState] = useState<AsyncState<FoundationData>>({
    status: "loading",
  });
  const [hubState, setHubState] = useState<AsyncState<PortHubReadModel>>({
    status: "empty",
    reason: "detail-not-requested",
  });
  const detailRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });

    void services.ports
      .search(
        { query: submittedQuery, limit: 3 },
        { signal: controller.signal },
      )
      .then((search) => {
        if (controller.signal.aborted) {
          return;
        }

        setState(
          search.items.length === 0
            ? { status: "empty", reason: "no-search-result" }
            : { status: "success", data: { search } },
        );
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          status: "error",
          error: {
            code: "mock-read-failed",
            message: error instanceof Error ? error.message : String(error),
            retryable: true,
          },
        });
      });

    return () => controller.abort();
  }, [reloadToken, services, submittedQuery]);

  useEffect(() => {
    if (!selectedPortSlug) {
      setHubState({ status: "empty", reason: "detail-not-requested" });
      return;
    }

    const controller = new AbortController();
    setHubState({ status: "loading" });
    void services.ports
      .getPortHub(
        { portSlug: selectedPortSlug },
        { signal: controller.signal },
      )
      .then((hub) => {
        if (controller.signal.aborted) {
          return;
        }
        setHubState(
          hub
            ? { status: "success", data: hub }
            : { status: "empty", reason: "port-detail-not-found" },
        );
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setHubState({
            status: "error",
            error: {
              code: "mock-detail-read-failed",
              message: error instanceof Error ? error.message : String(error),
              retryable: true,
            },
          });
        }
      });

    return () => controller.abort();
  }, [detailReloadToken, selectedPortSlug, services]);

  useEffect(() => {
    if (hubState.status === "success") {
      detailRef.current?.focus();
    }
  }, [hubState.status]);

  const hub = hubState.status === "success" ? hubState.data : undefined;
  const firstService = hub?.services.categories
    .flatMap((category) =>
      category.recommendations.slice(0, 1).map((recommendation) => ({
        category,
        recommendation,
      })),
    )
    .at(0);

  return (
    <div className={styles.page}>
      <section className={`reading-container ${styles.intro}`}>
        <p className={styles.eyebrow}>{labels.eyebrow}</p>
        <h1>{labels.heading}</h1>
        <p>{labels.intro}</p>
      </section>

      {mode !== "standard" ? (
        <OfflineBanner
          mode={mode}
          title={labels.modeTitle}
          message={labels.modeMessage}
        />
      ) : null}

      <section className={styles.section} aria-labelledby="repository-preview">
        <h2 id="repository-preview">Repository boundary</h2>
        <SearchBox
          value={query}
          onChange={setQuery}
          onSubmit={(nextQuery) => {
            setSelectedPortSlug(undefined);
            setSubmittedQuery(nextQuery);
          }}
          label={labels.searchLabel}
          placeholder={labels.searchPlaceholder}
          submitLabel={labels.searchSubmit}
          clearLabel={labels.searchClear}
          helperText={labels.searchHelp}
        />

        <div className={styles.resultRegion} aria-live="polite">
          {state.status === "loading" ? (
            <Skeleton label={labels.loading} lines={4} variant="card" />
          ) : null}

          {state.status === "empty" ? (
            <EmptyState
              heading={labels.noResult}
              description={labels.noResultDescription}
            />
          ) : null}

          {state.status === "error" ? (
            <EmptyState
              heading={labels.error}
              description={state.error.message}
              action={{
                label: labels.retry,
                onClick: () => setReloadToken((value) => value + 1),
              }}
              announce
            />
          ) : null}

          {state.status === "success" ? (
            <div className={styles.resultGrid}>
              {state.data.search.items.map((port) => {
                const status = deriveTrustDisplayStatus(port.trust);
                return (
                  <PortResultCard
                    key={port.id}
                    name={port.name}
                    country={port.country.name}
                    city={port.city}
                    unLocode={port.unLocode}
                    terminalContext={port.terminalNames.join(" · ")}
                    actionLabel={labels.viewPort}
                    trust={toTrustPresentation(status, t)}
                    controls="foundation-detail"
                    expanded={selectedPortSlug === port.slug}
                    onSelect={() => {
                      setSelectedPortSlug(port.slug);
                    }}
                  />
                );
              })}
            </div>
          ) : null}
        </div>
      </section>

      {selectedPortSlug ? (
        <section
          id="foundation-detail"
          ref={detailRef}
          className={styles.detailPreview}
          aria-labelledby="foundation-detail-heading"
          tabIndex={-1}
        >
          <h2 id="foundation-detail-heading" className="visually-hidden">
            {labels.detailHeading}
          </h2>

          {hubState.status === "loading" ? (
            <Skeleton label={labels.loading} lines={5} variant="card" />
          ) : null}

          {hubState.status === "error" ? (
            <EmptyState
              heading={labels.error}
              description={hubState.error.message}
              action={{
                label: labels.retry,
                onClick: () => setDetailReloadToken((value) => value + 1),
              }}
              announce
            />
          ) : null}

          {hub ? (
            <>
              {hub.criticalInformation[0] ? (
                <CriticalInfoStrip
                  title={hub.criticalInformation[0].title}
                  severity={hub.criticalInformation[0].severity}
                >
                  {hub.criticalInformation[0].summary}
                </CriticalInfoStrip>
              ) : null}

              <QuickBrief
                heading={labels.brief}
                description={labels.briefDescription}
                items={hub.quickBrief.slice(0, 4).map((item) => ({
                  id: item.id,
                  label: item.label,
                  value: item.value,
                }))}
              />

              {firstService ? (
                <section
                  className={styles.section}
                  aria-labelledby="service-preview"
                >
                  <h2 id="service-preview">{labels.services}</h2>
                  <div className={styles.serviceGrid}>
                    <ServiceCard
                      category={firstService.category.label}
                      name={firstService.recommendation.place.name}
                      summary={firstService.recommendation.place.address}
                      trust={toTrustPresentation(
                        deriveTrustDisplayStatus(
                          firstService.recommendation.place.trust,
                        ),
                        t,
                      )}
                      reason={{
                        label: labels.reason,
                        text: firstService.recommendation.reasonCodes.join(", "),
                      }}
                    />
                  </div>
                </section>
              ) : null}

              <ActionBar
                label={labels.actionLabel}
                actions={[
                  {
                    id: "plan",
                    label: labels.plan,
                    disabled: true,
                  },
                  {
                    id: "offline",
                    label: labels.offline,
                    disabled: true,
                  },
                  {
                    id: "share",
                    label: labels.share,
                    disabled: true,
                  },
                  {
                    id: "report",
                    label: labels.report,
                    disabled: true,
                  },
                ]}
              />
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
