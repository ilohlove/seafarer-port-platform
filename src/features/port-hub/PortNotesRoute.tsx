import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router";

import { useBandwidthMode, useServices, useSession } from "../../app/providers";
import {
  EmptyState,
  OfflineBanner,
  Skeleton,
} from "../../components";
import { useI18n } from "../../i18n";
import type {
  AsyncState,
  PortHeroMediaReadModel,
  PortHubReadModel,
  PortNoteSummary,
} from "../../types";
import {
  MainActionTiles,
  NoteCaptureDialog,
  PortSnapshot,
  TaxiHangulDialog,
  TopicNotesPanel,
} from "./components";
import {
  buildPortNotesViewModel,
  type PortNoteActionModel,
  type SnapshotFactTarget,
} from "./port-notes-view-model";
import type { PortNoteTopic } from "../../types";
import type { NoteCapturePreview } from "./components/NoteCaptureDialog";
import styles from "./port-notes.module.css";

export function PortNotesRoute() {
  const { portSlug = "" } = useParams();
  const location = useLocation();
  const services = useServices();
  const session = useSession();
  const { mode } = useBandwidthMode();
  const { t, formatMoney } = useI18n();
  const [state, setState] = useState<AsyncState<PortHubReadModel>>({
    status: "loading",
  });
  const [reloadToken, setReloadToken] = useState(0);
  const [notice, setNotice] = useState<string>();
  const [heroMedia, setHeroMedia] = useState<PortHeroMediaReadModel>();
  const [isTaxiDialogOpen, setIsTaxiDialogOpen] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<PortNoteTopic>();
  const [noteRefreshToken, setNoteRefreshToken] = useState(0);
  const [noteSummary, setNoteSummary] = useState<PortNoteSummary>();
  const writeNoteRequested =
    new URLSearchParams(location.search).get("writeNote") === "1";

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
  }, [portSlug, reloadToken, services, writeNoteRequested]);

  useEffect(() => {
    if (state.status === "success" && writeNoteRequested && session.status === "authenticated") {
      setIsNoteDialogOpen(true);
    }
  }, [session.status, state, writeNoteRequested]);

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

  useEffect(() => {
    if (state.status !== "success" || !services.portNotes.isConfigured()) {
      setNoteSummary(undefined);
      return;
    }
    const controller = new AbortController();
    setNoteSummary(undefined);
    void services.portNotes
      .getSummary(
        state.data.port.unLocode ?? state.data.port.id,
        state.data.selectedPortNotesContextId,
        { signal: controller.signal },
      )
      .then((summary) => {
        if (!controller.signal.aborted) setNoteSummary(summary);
      })
      .catch(() => {
        if (!controller.signal.aborted) setNoteSummary(undefined);
      });
    return () => controller.abort();
  }, [noteRefreshToken, services, state]);

  const displayViewModel = useMemo(() => {
    if (!viewModel || !noteSummary) {
      return viewModel;
    }

    const actionTopicMap: Readonly<Record<string, PortNoteTopic>> = {
      "compare-esim": "esim",
      "physical-sim": "physicalSim",
      "shore-leave": "shoreLeave",
      "food-fruit": "food",
      "shopping-gifts": "shopping",
      "seaman-club": "welfare",
      "other-notes": "general",
    };
    return {
      ...viewModel,
      snapshotFacts: viewModel.snapshotFacts.map((fact) =>
        fact.id === "community"
          ? {
              ...fact,
              value: t("portNotes.snapshot.notesSummary", {
                count: noteSummary.communityCount,
              }),
            }
          : fact,
      ),
      actions: viewModel.actions.map((action) => {
        const topic = actionTopicMap[action.id];
        const summary = topic
          ? noteSummary.topics.find((item) => item.topic === topic)
          : undefined;
        return summary && summary.approvedCount > 0
          ? {
              ...action,
              count: t("portNotes.action.count", { count: summary.approvedCount }),
            }
          : action;
      }),
    };
  }, [noteSummary, t, viewModel]);

  useEffect(() => {
    setHeroMedia(undefined);
    if (mode !== "standard" || state.status !== "success") {
      return;
    }

    const controller = new AbortController();
    const activeContext = state.data.portNotesContexts?.find(
      (context) => context.id === state.data.selectedPortNotesContextId,
    );
    void services.portMedia
      .getHero(
        {
          portId: state.data.port.id,
          portSlug: state.data.port.slug,
          portUnLocode: state.data.port.unLocode,
          contextSlug: activeContext?.slug,
        },
        { signal: controller.signal },
      )
      .then((media) => {
        if (!controller.signal.aborted) {
          setHeroMedia(media);
        }
      })
      .catch(() => {
        // A licensed image is optional; the snapshot keeps its CSS fallback.
      });

    return () => controller.abort();
  }, [mode, services, state]);

  const closeTaxiDialog = useCallback(() => setIsTaxiDialogOpen(false), []);

  function showPlaceholder(feature: string) {
    setNotice(t("portNotes.placeholder", { feature }));
  }

  function requestWriteNote() {
    if (session.status === "authenticated") {
      setIsNoteDialogOpen(true);
      return;
    }
    if (!session.isConfigured || session.status === "unavailable") {
      setNotice(t("settings.loginPlaceholder"));
      setIsNoteDialogOpen(true);
      return;
    }
    void services.auth
      .signInWithGoogle(`${location.pathname}?writeNote=1`)
      .catch(() => setNotice(t("settings.authError")));
  }

  const actionTopics: Readonly<Record<string, PortNoteTopic>> = {
    "compare-esim": "esim",
    "physical-sim": "physicalSim",
    "shore-leave": "shoreLeave",
    "food-fruit": "food",
    "shopping-gifts": "shopping",
    "seaman-club": "welfare",
    "other-notes": "general",
  };

  function handleAction(action: PortNoteActionModel) {
    if (action.id === "write-note") {
      requestWriteNote();
      return;
    }

    const topic = actionTopics[action.id];
    if (topic) {
      setSelectedTopic(topic);
      return;
    }

    showPlaceholder(action.label);
  }

  function handleSnapshotFact(target: SnapshotFactTarget) {
    if (target === "taxi") {
      setIsTaxiDialogOpen(true);
      return;
    }

    if (target === "internet") {
      setSelectedTopic("esim");
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

  async function submitNote(preview: NoteCapturePreview) {
    if (state.status !== "success") {
      throw new Error("Port context is not loaded.");
    }
    const details = Object.fromEntries(
      preview.details.map((detail) => [detail.key, detail.value]),
    );
    await services.portNotes.submitNote({
      portKey: state.data.port.unLocode ?? state.data.port.id,
      contextKey: state.data.selectedPortNotesContextId,
      topic: preview.topic,
      visibility: preview.visibility,
      takeaway: preview.takeaway,
      details,
      contact: preview.contact,
      contactIsPublicBusiness: preview.visibility === "public" && Boolean(preview.contact),
      idempotencyKey:
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `note-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    });
    setSelectedTopic(preview.topic);
    setNoteRefreshToken((current) => current + 1);
  }

  return (
    <div className={styles.page}>
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

        {state.status === "success" && displayViewModel ? (
          <div className={styles.mainColumn}>
            <div className={styles.contextPanel}>
              <PortSnapshot
                model={displayViewModel.snapshot}
                facts={displayViewModel.snapshotFacts}
                onFactSelect={handleSnapshotFact}
                onPlaceholder={showPlaceholder}
                showMedia={mode === "standard"}
                media={heroMedia}
              />
              <MainActionTiles
                actions={displayViewModel.actions}
                onAction={handleAction}
              />
              {selectedTopic ? (
                <TopicNotesPanel
                  key={`${selectedTopic}-${noteRefreshToken}`}
                  topic={selectedTopic}
                  portKey={state.data.port.unLocode ?? state.data.port.id}
                  contextKey={state.data.selectedPortNotesContextId}
                  fallbackNotes={displayViewModel.notes}
                  onWriteNote={requestWriteNote}
                />
              ) : null}
            </div>
            <TaxiHangulDialog
              model={displayViewModel.taxiPhrase}
              open={isTaxiDialogOpen}
              onClose={closeTaxiDialog}
            />
            <NoteCaptureDialog
              open={isNoteDialogOpen}
              portName={displayViewModel.snapshot.name}
              terminal={displayViewModel.snapshot.terminal}
              gate={displayViewModel.snapshot.gate}
              onSubmit={(preview) => submitNote(preview)}
              onClose={() => setIsNoteDialogOpen(false)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
