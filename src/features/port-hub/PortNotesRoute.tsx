import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";

import { useBandwidthMode, useServices } from "../../app/providers";
import {
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
  PortContextTabs,
  PortNotesNavigation,
  PortNotesSafetyShortcuts,
  PortSafetyAlert,
  PortSnapshot,
  QuickNotesPanel,
  RecentCommunityNotes,
  TopSeafarerNotes,
  TopicPreviewSections,
  TaxiHangulDialog,
  WelfareCards,
} from "./components";
import {
  buildPortNotesViewModel,
  type PortNoteActionModel,
} from "./port-notes-view-model";
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
  const [selectedContextId, setSelectedContextId] = useState<string>();
  const [isTaxiDialogOpen, setIsTaxiDialogOpen] = useState(false);

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
        setSelectedContextId(hub?.selectedPortNotesContextId);
        setIsTaxiDialogOpen(false);
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
        ? buildPortNotesViewModel(
            state.data,
            t,
            formatMoney,
            selectedContextId,
          )
        : undefined,
    [formatMoney, selectedContextId, state, t],
  );

  const closeTaxiDialog = useCallback(() => setIsTaxiDialogOpen(false), []);

  function showPlaceholder(feature: string) {
    setNotice(t("portNotes.placeholder", { feature }));
  }

  function handleAction(action: PortNoteActionModel) {
    if (action.id === "taxi") {
      setIsTaxiDialogOpen(true);
      return;
    }

    const targetIds: Readonly<Record<string, string | undefined>> = {
      "compare-esim": "best-internet-heading",
      "physical-sim": "topic-internet-sim",
      "food-supplies": "topic-food-supplies",
      "seaman-club": "welfare-section",
      "write-note": undefined,
    };
    const targetId = targetIds[action.id];
    if (targetId) {
      document.getElementById(targetId)?.scrollIntoView({ block: "start" });
      return;
    }
    showPlaceholder(action.label);
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
            <PortContextTabs
              contexts={viewModel.contexts}
              onSelect={(contextId) => {
                setSelectedContextId(contextId);
                setNotice(undefined);
                setIsTaxiDialogOpen(false);
              }}
            />

            <div className={styles.topGrid}>
              <div
                className={styles.topPrimary}
                id="port-context-panel"
                role="tabpanel"
                aria-labelledby={
                  viewModel.activeContextId
                    ? `port-context-tab-${viewModel.activeContextId}`
                    : undefined
                }
              >
                <PortSnapshot
                  model={viewModel.snapshot}
                  deal={viewModel.internetDeal}
                  onPlaceholder={showPlaceholder}
                  showMedia={mode === "standard"}
                />
                {viewModel.alerts.map((alert) => (
                  <PortSafetyAlert model={alert} key={alert.id} />
                ))}
              </div>
              <QuickNotesPanel
                model={viewModel.quickNotes}
                onPlaceholder={showPlaceholder}
              />
            </div>

            <MainActionTiles
              actions={viewModel.actions}
              onAction={handleAction}
            />
            <TopSeafarerNotes
              notes={viewModel.topNotes}
              onPlaceholder={showPlaceholder}
            />
            {renderSearchPanel(
              "port-notes-search-mobile",
              styles.searchPanel,
            )}
            <WelfareCards cards={viewModel.welfareCards} />
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
            <TaxiHangulDialog
              model={viewModel.taxiPhrase}
              open={isTaxiDialogOpen}
              onClose={closeTaxiDialog}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
