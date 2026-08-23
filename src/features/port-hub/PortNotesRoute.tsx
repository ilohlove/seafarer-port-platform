import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";

import { useBandwidthMode, useServices } from "../../app/providers";
import {
  EmptyState,
  OfflineBanner,
  Skeleton,
} from "../../components";
import { useI18n } from "../../i18n";
import type { AsyncState, PortHubReadModel } from "../../types";
import { SiteNavigation } from "../navigation";
import {
  MainActionTiles,
  NoteCaptureDialog,
  PortSnapshot,
  TaxiHangulDialog,
} from "./components";
import {
  buildPortNotesViewModel,
  type PortNoteActionModel,
  type SnapshotFactTarget,
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
  const [notice, setNotice] = useState<string>();
  const [isTaxiDialogOpen, setIsTaxiDialogOpen] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);

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
        setIsTaxiDialogOpen(false);
        setIsNoteDialogOpen(false);
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
          )
        : undefined,
    [formatMoney, state, t],
  );

  const closeTaxiDialog = useCallback(() => setIsTaxiDialogOpen(false), []);

  function showPlaceholder(feature: string) {
    setNotice(t("portNotes.placeholder", { feature }));
  }

  function handleAction(action: PortNoteActionModel) {
    if (action.id === "write-note") {
      setIsNoteDialogOpen(true);
      return;
    }

    showPlaceholder(action.label);
  }

  function handleSnapshotFact(target: SnapshotFactTarget) {
    if (target === "taxi") {
      setIsTaxiDialogOpen(true);
      return;
    }

    const targetIds = {
      internet: "quick-action-compare-esim",
      community: "quick-action-write-note",
    } as const;
    document.getElementById(targetIds[target])?.scrollIntoView?.({
      block: "start",
    });
  }

  return (
    <div className={styles.page}>
      <SiteNavigation
        current="port"
        portSlug={portSlug}
        onPlaceholder={showPlaceholder}
      />

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
            action={{
              label: t("home.notFound.action"),
              href: `/?q=${encodeURIComponent(portSlug)}`,
            }}
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
            <div className={styles.contextPanel}>
              <PortSnapshot
                model={viewModel.snapshot}
                facts={viewModel.snapshotFacts}
                onFactSelect={handleSnapshotFact}
                onPlaceholder={showPlaceholder}
                showMedia={mode === "standard"}
              />
              <MainActionTiles
                actions={viewModel.actions}
                onAction={handleAction}
              />
            </div>
            <TaxiHangulDialog
              model={viewModel.taxiPhrase}
              open={isTaxiDialogOpen}
              onClose={closeTaxiDialog}
            />
            <NoteCaptureDialog
              open={isNoteDialogOpen}
              portName={viewModel.snapshot.name}
              terminal={viewModel.snapshot.terminal}
              gate={viewModel.snapshot.gate}
              onClose={() => setIsNoteDialogOpen(false)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
