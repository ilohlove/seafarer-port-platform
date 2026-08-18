import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";

import { useBandwidthMode, useServices } from "../../app/providers";
import {
  CriticalInfoStrip,
  EmptyState,
  OfflineBanner,
  SearchBox,
  Skeleton,
} from "../../components";
import { useI18n } from "../../i18n";
import type { AsyncState, PortHubReadModel } from "../../types";
import {
  DataTrustBanner,
  DecisionStrip,
  OverviewCardGrid,
  PortHeader,
  PortHubNavigation,
  QuickBriefPanel,
  ReturnToShipPanel,
} from "./components";
import { buildPortHubViewModel } from "./port-hub-view-model";
import styles from "./port-hub.module.css";

export function PortHubRoute() {
  const { portSlug = "" } = useParams();
  const services = useServices();
  const { mode } = useBandwidthMode();
  const { t, formatMoney } = useI18n();
  const [state, setState] = useState<AsyncState<PortHubReadModel>>({
    status: "loading",
  });
  const [reloadToken, setReloadToken] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [placeholderNotice, setPlaceholderNotice] = useState<string>();
  const [plannerNotice, setPlannerNotice] = useState<string>();

  useEffect(() => {
    if (!portSlug) {
      setState({ status: "empty", reason: "missing-port-slug" });
      return;
    }

    const controller = new AbortController();
    setState({ status: "loading" });

    void services.ports
      .getPortHub({ portSlug }, { signal: controller.signal })
      .then((hub) => {
        if (controller.signal.aborted) {
          return;
        }
        setState(
          hub
            ? { status: "success", data: hub }
            : { status: "empty", reason: "port-not-found" },
        );
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setState({
          status: "error",
          error: {
            code: "port-hub-load-failed",
            message: error instanceof Error ? error.message : String(error),
            retryable: true,
          },
        });
      });

    return () => controller.abort();
  }, [portSlug, reloadToken, services]);

  const viewModel = useMemo(
    () =>
      state.status === "success"
        ? buildPortHubViewModel(state.data, t, formatMoney)
        : undefined,
    [formatMoney, state, t],
  );

  function showPlaceholder(feature: string) {
    setPlaceholderNotice(t("portHub.placeholder.notice", { feature }));
  }

  const tabs = [
    { id: "overview", label: t("portHub.tabs.overview"), active: true },
    { id: "access", label: t("portHub.tabs.access"), active: false },
    { id: "internet", label: t("portHub.tabs.internet"), active: false },
    { id: "services", label: t("portHub.tabs.services"), active: false },
    { id: "community", label: t("portHub.tabs.community"), active: false },
  ] as const;

  return (
    <div className={styles.page}>
      <PortHubNavigation portSlug={portSlug} onPlaceholder={showPlaceholder} />

      <div className={styles.dashboard}>
        <section className={styles.topSearch} aria-label={t("portHub.search.region")}>
          <SearchBox
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={(query) => {
              setPlaceholderNotice(
                t("portHub.search.placeholderNotice", { query }),
              );
            }}
            label={t("portHub.search.label")}
            placeholder={t("portHub.search.placeholder")}
            submitLabel={t("portHub.search.submit")}
            clearLabel={t("portHub.search.clear")}
            helperText={t("portHub.search.help")}
            id="port-hub-search"
          />
        </section>

        {placeholderNotice ? (
          <output className={styles.pageNotice}>{placeholderNotice}</output>
        ) : null}

        {mode !== "standard" ? (
          <OfflineBanner
            mode={mode}
            title={t("portHub.bandwidth.title")}
            message={
              mode === "ultraLite"
                ? t("portHub.bandwidth.ultraLite")
                : t("portHub.bandwidth.dataSaver")
            }
          />
        ) : null}

        {state.status === "loading" ? (
          <div className={styles.loadingGrid}>
            <Skeleton label={t("portHub.loading")} lines={7} variant="card" />
            <Skeleton label={t("portHub.loadingLogistics")} lines={6} variant="card" />
          </div>
        ) : null}

        {state.status === "empty" ? (
          <EmptyState
            heading={t("portHub.notFound.heading")}
            description={t("portHub.notFound.description", { port: portSlug })}
            action={{ label: t("portHub.backFoundation"), href: "/" }}
            announce
          />
        ) : null}

        {state.status === "error" ? (
          <EmptyState
            heading={t("portHub.error.heading")}
            description={t("portHub.error.description")}
            action={{
              label: t("portHub.retry"),
              onClick: () => setReloadToken((value) => value + 1),
            }}
            announce
          />
        ) : null}

        {state.status === "success" && viewModel ? (
          <div className={styles.hubLayout}>
            <div className={styles.primaryColumn}>
              <PortHeader
                header={viewModel.header}
                mode={mode}
                onPlaceholder={showPlaceholder}
              />

              {state.data.criticalInformation.map((item) => (
                <CriticalInfoStrip
                  key={item.id}
                  title={item.title}
                  severity={item.severity}
                  announce={item.severity === "critical"}
                >
                  {item.summary}
                </CriticalInfoStrip>
              ))}

              <QuickBriefPanel brief={viewModel.quickBrief} />
              <DecisionStrip items={viewModel.decisions} />

              <div className={styles.tabsRegion}>
                <div
                  className={styles.tabs}
                  role="tablist"
                  aria-label={t("portHub.tabs.label")}
                >
                  {tabs.map((tab) => (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={tab.active}
                      aria-controls={tab.active ? "port-overview" : undefined}
                      data-active={tab.active || undefined}
                      key={tab.id}
                      onClick={() => {
                        if (!tab.active) {
                          showPlaceholder(tab.label);
                        }
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <OverviewCardGrid cards={viewModel.overviewCards} />
              <DataTrustBanner model={viewModel.dataTrust} />
            </div>

            <ReturnToShipPanel
              model={viewModel.returnToShip}
              plannerNotice={plannerNotice}
              onPlannerPlaceholder={() => {
                setPlannerNotice(t("portHub.return.plannerNotice"));
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
