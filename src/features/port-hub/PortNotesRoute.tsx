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
  BestInternetDeal,
  DataTrustBanner,
  MainActionTiles,
  PortNotesNavigation,
  PortNotesSafetyShortcuts,
  PortSnapshot,
  QuickNotesPanel,
  RecentCommunityNotes,
  TopSeafarerNotes,
  TopicPreviewSections,
} from "./components";
import { buildPortNotesViewModel } from "./port-notes-view-model";
import styles from "./port-notes.module.css";

export function PortNotesRoute() {
  const { portSlug = "" } = useParams();
  const services = useServices();
  const { mode } = useBandwidthMode();
  const { t, formatMoney } = useI18n();
  const [state, setState] = useState<AsyncState<PortHubReadModel>>({
    status: "loading",
  });
  const [reloadToken, setReloadToken] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [notice, setNotice] = useState<string>();

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
            code: "port-notes-load-failed",
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
        ? buildPortNotesViewModel(state.data, t, formatMoney)
        : undefined,
    [formatMoney, state, t],
  );

  function showPlaceholder(feature: string) {
    setNotice(t("portNotes.placeholder", { feature }));
  }

  function renderSearchPanel(id: string, className: string) {
    return (
      <section
        className={className}
        aria-label={t("portNotes.search.region")}
        data-search-placement={id.endsWith("mobile") ? "mobile" : "desktop"}
      >
        <SearchBox
          value={searchQuery}
          onChange={setSearchQuery}
          onSubmit={(query) =>
            setNotice(t("portNotes.search.placeholder", { query }))
          }
          label={t("portNotes.search.label")}
          placeholder={t("portNotes.search.input")}
          submitLabel={t("portNotes.search.submit")}
          clearLabel={t("portNotes.search.clear")}
          helperText={t("portNotes.search.help")}
          id={id}
        />
      </section>
    );
  }

  return (
    <div className={styles.page}>
      <PortNotesNavigation portSlug={portSlug} onPlaceholder={showPlaceholder} />

      <div className={styles.workspace}>
        {renderSearchPanel(
          "port-notes-search-desktop",
          `${styles.searchPanel} ${styles.desktopSearchPanel}`,
        )}

        {notice ? (
          <output className={styles.pageNotice}>
            {notice}
          </output>
        ) : null}

        {mode !== "standard" ? (
          <div className={styles.bandwidthNotice}>
            <OfflineBanner
              compact
              mode={mode}
              title={t("portNotes.bandwidth.title")}
              message={
                mode === "ultraLite"
                  ? t("portNotes.bandwidth.ultraLite")
                  : t("portNotes.bandwidth.dataSaver")
              }
            />
          </div>
        ) : null}

        {state.status === "loading" ? (
          <div className={styles.mainColumn}>
            <Skeleton label={t("portNotes.loading")} lines={8} variant="card" />
            <Skeleton label={t("portNotes.loadingNotes")} lines={6} variant="list" />
          </div>
        ) : null}

        {state.status === "empty" ? (
          <EmptyState
            heading={t("portNotes.notFound.heading")}
            description={t("portNotes.notFound.description", { port: portSlug })}
            action={{ label: t("portNotes.backFoundation"), href: "/foundation" }}
            announce
          />
        ) : null}

        {state.status === "error" ? (
          <EmptyState
            heading={t("portNotes.error.heading")}
            description={t("portNotes.error.description")}
            action={{
              label: t("portNotes.retry"),
              onClick: () => setReloadToken((value) => value + 1),
            }}
            announce
          />
        ) : null}

        {state.status === "success" && viewModel ? (
          <div className={styles.mainColumn}>
            <div className={styles.heroGrid}>
              <PortSnapshot
                model={viewModel.snapshot}
                deal={viewModel.internetDeal}
                onPlaceholder={showPlaceholder}
                showMedia={mode === "standard"}
              />
              <QuickNotesPanel
                model={viewModel.quickNotes}
                onPlaceholder={showPlaceholder}
              />
            </div>

            <QuickNotesPanel
              compact
              model={viewModel.quickNotes}
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

            <MainActionTiles
              actions={viewModel.actions}
              onPlaceholder={showPlaceholder}
            />
            <TopSeafarerNotes
              notes={viewModel.topNotes}
              onPlaceholder={showPlaceholder}
            />
            {renderSearchPanel(
              "port-notes-search-mobile",
              `${styles.searchPanel} ${styles.mobileSearchPanel}`,
            )}
            <TopicPreviewSections
              topics={viewModel.topics}
              onPlaceholder={showPlaceholder}
            />
            <RecentCommunityNotes
              notes={viewModel.recentNotes}
              onPlaceholder={showPlaceholder}
            />
            <BestInternetDeal
              model={viewModel.internetDeal}
              onPlaceholder={showPlaceholder}
            />
            <DataTrustBanner model={viewModel.dataTrust} />
            <PortNotesSafetyShortcuts
              model={viewModel.safety}
              onPlaceholder={showPlaceholder}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
