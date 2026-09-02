import type { TrustStatusPresentation } from "../../components";
import type { I18nContextValue, TranslationKey } from "../../i18n";
import {
  deriveTrustDisplayStatus,
  type CriticalInformationSeverity,
  type ConnectivityProduct,
  type KnowledgeBlock,
  type NoteTopic,
  type PortHubReadModel,
  type PortNote,
  type StaffRoleTitle,
  type TrustDisplayStatus,
  type TrustEvidence,
  type WelfareCapability,
  type UserRankReadModel,
} from "../../types";
import { resolveUserRank } from "../user-rank";

type Translate = I18nContextValue["t"];
type FormatMoney = I18nContextValue["formatMoney"];

export interface PortSnapshotModel {
  readonly name: string;
  readonly location: string;
  readonly terminal: string;
  readonly gate: string;
}

export type SnapshotFactTarget = "internet" | "taxi" | "community";

export interface SnapshotFactModel {
  readonly id: "shore-leave" | "internet" | "taxi" | "community";
  readonly icon: "shore-leave" | "internet" | "taxi" | "community";
  readonly label: string;
  readonly value: string;
  readonly detail?: string;
  readonly trust: TrustStatusPresentation;
  readonly target?: SnapshotFactTarget;
}

export interface QuickNoteItemModel {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly hint?: string;
  readonly symbol: string;
  readonly trust: TrustStatusPresentation;
}

export interface QuickNotesModel {
  readonly items: readonly QuickNoteItemModel[];
}

export interface SafetyAlertModel {
  readonly id: string;
  readonly severity: CriticalInformationSeverity;
  readonly title: string;
  readonly summary: string;
  readonly trust: TrustStatusPresentation;
}

export interface TaxiPhraseModel {
  readonly contextLabel: string;
  readonly gate: string;
  readonly phrase: string;
  readonly trust: TrustStatusPresentation;
}

export interface WelfareBadgeModel {
  readonly id: string;
  readonly label: string;
  readonly status: "reported" | "unknown";
}

export interface WelfareCardModel {
  readonly id: string;
  readonly name: string;
  readonly badges: readonly WelfareBadgeModel[];
  readonly summary: string;
  readonly trust: TrustStatusPresentation;
  readonly call?: {
    readonly label: string;
    readonly href: `tel:${string}`;
  };
}

export interface InternetDealModel {
  readonly name: string;
  readonly provider: string;
  readonly price: string;
  readonly plan: string;
  readonly hotspot: string;
  readonly signal: string;
  readonly videoCall: string;
  readonly evidence: string;
  readonly trust: TrustStatusPresentation;
}

export interface PortNoteActionModel {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly count?: string;
  readonly tone: "blue" | "green" | "orange" | "teal";
}

export interface PortNoteCardModel {
  readonly id: string;
  readonly topic: string;
  readonly topicKey: NoteTopic;
  readonly title: string;
  readonly summary: string;
  readonly authorLabel: string;
  readonly context?: string;
  readonly confirmations: string;
  readonly usefulness: string;
  readonly confirmationCount: number;
  readonly usefulnessCount: number;
  readonly trust: TrustStatusPresentation;
  readonly authorRank: UserRankReadModel;
  readonly authorStaffTitle?: StaffRoleTitle;
}

export interface TopicPreviewModel {
  readonly id: string;
  readonly symbol: string;
  readonly title: string;
  readonly bullets: readonly string[];
  readonly actionLabel: string;
}

export interface TopicShortcutModel {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly targetId: string;
}

export interface SafetyShortcutModel {
  readonly emergencyName: string;
  readonly emergencyPhone: string;
  readonly emergencyTrust: TrustStatusPresentation;
  readonly returnSummary: string;
  readonly gate: string;
  readonly note: string;
}

export interface PortNotesViewModel {
  readonly snapshot: PortSnapshotModel;
  readonly snapshotFacts: readonly SnapshotFactModel[];
  readonly alerts: readonly SafetyAlertModel[];
  readonly taxiPhrase: TaxiPhraseModel;
  readonly internetDeal: InternetDealModel;
  readonly quickNotes: QuickNotesModel;
  readonly actions: readonly PortNoteActionModel[];
  readonly topNotes: readonly PortNoteCardModel[];
  readonly notes: readonly PortNoteCardModel[];
  readonly recentNotes: readonly PortNoteCardModel[];
  readonly topics: readonly TopicPreviewModel[];
  readonly topicShortcuts: readonly TopicShortcutModel[];
  readonly safety: SafetyShortcutModel;
  readonly welfareCards: readonly WelfareCardModel[];
  readonly dataTrust: {
    readonly message: string;
    readonly detail: string;
    readonly evidence: string;
    readonly trust: TrustStatusPresentation;
    readonly contributionPrompt: string;
  };
}

const trustTranslationKeys = {
  officialSource: "trust.officialSource",
  communityConfirmed: "trust.communityConfirmed",
  needsConfirmation: "trust.needsConfirmation",
  conflictingReports: "trust.conflictingReports",
  unknown: "trust.unknown",
} as const;

const trustPriority: Readonly<Record<TrustDisplayStatus, number>> = {
  officialSource: 0,
  communityConfirmed: 1,
  needsConfirmation: 2,
  unknown: 3,
  conflictingReports: 4,
};

const topicTranslationKeys: Readonly<Record<NoteTopic, TranslationKey>> = {
  esim: "portNotes.topic.esim",
  physicalSim: "portNotes.topic.physicalSim",
  taxi: "portNotes.topic.taxi",
  rideHailing: "portNotes.topic.rideHailing",
  foodOrder: "portNotes.topic.foodOrder",
  supplies: "portNotes.topic.supplies",
  shopping: "portNotes.topic.shopping",
  placesToVisit: "portNotes.topic.placesToVisit",
  seamanClub: "portNotes.topic.seamanClub",
  shoreLeave: "portNotes.topic.shoreLeave",
  warning: "portNotes.topic.warning",
  generalTip: "portNotes.topic.generalTip",
};

const signalTranslationKeys = {
  limited: "portNotes.internet.signal.limited",
  usable: "portNotes.internet.signal.usable",
  good: "portNotes.internet.signal.good",
  excellent: "portNotes.internet.signal.excellent",
} as const satisfies Record<"limited" | "usable" | "good" | "excellent", TranslationKey>;

const videoTranslationKeys = {
  limited: "portNotes.internet.video.limited",
  usable: "portNotes.internet.video.usable",
  good: "portNotes.internet.video.good",
  unknown: "portNotes.internet.video.unknown",
} as const satisfies Record<"limited" | "usable" | "good" | "unknown", TranslationKey>;

const welfareCapabilityKeys: Partial<
  Readonly<Record<WelfareCapability, TranslationKey>>
> = {
  wifi: "portNotes.welfare.badge.wifi",
  crewShuttle: "portNotes.welfare.badge.shuttle",
  simAssistance: "portNotes.welfare.badge.sim",
  currencyExchange: "portNotes.welfare.badge.currency",
  remoteSupport: "portNotes.welfare.badge.support",
};

const contextSummaryTranslationKeys: Readonly<
  Record<string, { shoreLeave: TranslationKey; taxi: TranslationKey }>
> = {
  "busan-context-new-port": {
    shoreLeave: "portNotes.contextSummary.busanNewPort.shoreLeave",
    taxi: "portNotes.contextSummary.busanNewPort.taxi",
  },
  "busan-context-north-port": {
    shoreLeave: "portNotes.contextSummary.busanNorthPort.shoreLeave",
    taxi: "portNotes.contextSummary.busanNorthPort.taxi",
  },
  "busan-context-yeongdo": {
    shoreLeave: "portNotes.contextSummary.busanYeongdo.shoreLeave",
    taxi: "portNotes.contextSummary.busanYeongdo.taxi",
  },
  "busan-context-gamcheon": {
    shoreLeave: "portNotes.contextSummary.busanGamcheon.shoreLeave",
    taxi: "portNotes.contextSummary.busanGamcheon.taxi",
  },
};

function contextSummary(
  contextId: string,
  kind: "shoreLeave" | "taxi",
  t: Translate,
): string {
  const key = contextSummaryTranslationKeys[contextId]?.[kind];
  return key
    ? t(key)
    : t(
        kind === "shoreLeave"
          ? "portNotes.snapshot.shoreLeaveFallback"
          : "portNotes.snapshot.taxiFallback",
      );
}

function trustPresentation(
  evidence: TrustEvidence,
  t: Translate,
): TrustStatusPresentation {
  const status = deriveTrustDisplayStatus(evidence);
  return { status, label: t(trustTranslationKeys[status]) };
}

function combinedTrust(
  evidences: readonly TrustEvidence[],
  t: Translate,
): TrustStatusPresentation {
  const status = evidences
    .map(deriveTrustDisplayStatus)
    .reduce<TrustDisplayStatus>(
      (current, candidate) =>
        trustPriority[candidate] > trustPriority[current] ? candidate : current,
      "officialSource",
    );
  return { status, label: t(trustTranslationKeys[status]) };
}

function categorySummary(
  hub: PortHubReadModel,
  suffix: "food" | "shopping" | "welfare",
  t: Translate,
  terminalId?: string,
): string {
  const category = hub.services.categories.find((candidate) =>
    candidate.id.endsWith(`-${suffix}`),
  );
  const recommendation = category?.recommendations.find(
    (candidate) => !terminalId || candidate.access?.terminalId === terminalId,
  );
  return recommendation
    ? recommendation.place.name
    : category && category.totalAvailable > 0 && !terminalId
      ? t("portNotes.topic.availableCount", { count: category.totalAvailable })
      : t("portNotes.value.noData");
}

function quickInfoSymbol(block: KnowledgeBlock): string {
  const value = `${block.id} ${block.label}`.toLowerCase();
  if (/gate|terminal|berth/.test(value)) {
    return "G";
  }
  if (/shuttle|taxi|transport|di chuyển/.test(value)) {
    return "T";
  }
  if (/return|quay lại|safety|an toàn/.test(value)) {
    return "!";
  }
  return "i";
}

function quickInfoTitle(
  block: KnowledgeBlock,
  gate: string,
  t: Translate,
): string {
  const value = `${block.id} ${block.label}`.toLowerCase();
  if (/gate|terminal|berth/.test(value)) {
    return gate;
  }
  if (/shuttle/.test(value)) {
    return t("portNotes.quickNotes.shuttleTitle");
  }
  if (/return|quay lại|safety|an toàn/.test(value)) {
    return t("portNotes.quickNotes.safetyTitle");
  }
  return block.label;
}

function productLabel(
  product: ConnectivityProduct | undefined,
  formatMoney: FormatMoney,
  t: Translate,
): string {
  if (!product) {
    return t("portNotes.internet.noDeal");
  }
  const data =
    product.dataAllowanceGb === "unlimited"
      ? t("portNotes.internet.unlimited")
      : `${product.dataAllowanceGb} GB`;
  return `${product.name} · ${formatMoney(product.price.amount, product.price.currency)} · ${data} / ${product.validityDays} ${t("portNotes.internet.days")}`;
}

function noteTopicLabel(topic: NoteTopic, t: Translate): string {
  return t(topicTranslationKeys[topic]);
}

function notePriority(topic: NoteTopic): number {
  const priorities: Partial<Record<NoteTopic, number>> = {
    warning: 10,
    shoreLeave: 9,
    esim: 8,
    physicalSim: 7,
    taxi: 6,
    rideHailing: 6,
    foodOrder: 5,
    supplies: 4,
    shopping: 4,
    placesToVisit: 3,
    seamanClub: 2,
    generalTip: 1,
  };
  return priorities[topic] ?? 0;
}

function publishedNotes(hub: PortHubReadModel): readonly PortNote[] {
  return hub.community.notes.filter(
    (note) =>
      note.visibility === "public" && note.moderationState === "approved",
  );
}

function bestProduct(
  products: readonly ConnectivityProduct[],
): ConnectivityProduct | undefined {
  return products.reduce<ConnectivityProduct | undefined>((best, product) => {
    if (!best || product.price.amount < best.price.amount) {
      return product;
    }
    return best;
  }, undefined);
}

function firstTopicNote(
  notes: readonly PortNote[],
  topics: readonly NoteTopic[],
): PortNote | undefined {
  return notes
    .filter((note) => topics.includes(note.topic))
    .sort(
      (left, right) => right.confirmationCount - left.confirmationCount,
    )[0];
}

function toNoteCardModel(
  note: PortNote,
  hub: PortHubReadModel,
  t: Translate,
): PortNoteCardModel {
  const noteTerminal = hub.terminals.find(
    (terminal) => terminal.id === note.terminalId,
  );
  const context = [
    noteTerminal?.name,
    note.gateName ? t("portNotes.note.gate", { gate: note.gateName }) : undefined,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" · ");

  return {
    id: note.id,
    topic: noteTopicLabel(note.topic, t),
    topicKey: note.topic,
    title: note.title,
    summary: note.summary,
    authorLabel: note.publicAlias ?? t("portNotes.notes.defaultAuthor"),
    authorRank: resolveUserRank(note.authorRankScore ?? 0),
    authorStaffTitle: note.authorStaffTitle,
    context: context || undefined,
    confirmations: t("portNotes.note.confirmations", {
      count: note.confirmationCount,
    }),
    confirmationCount: note.confirmationCount,
    usefulness: t("portNotes.note.usefulness", {
      count: note.usefulnessCount,
    }),
    usefulnessCount: note.usefulnessCount,
    trust: trustPresentation(note.trust, t),
  };
}

export function buildPortNotesViewModel(
  hub: PortHubReadModel,
  t: Translate,
  formatMoney: FormatMoney,
): PortNotesViewModel {
  const activeContext =
    hub.portNotesContexts?.find(
      (context) => context.id === hub.selectedPortNotesContextId,
    ) ??
    hub.portNotesContexts?.[0];
  const selectedTerminal =
    hub.terminals.find(
      (terminal) =>
        terminal.id === (activeContext?.terminalId ?? hub.selectedTerminalId),
    ) ??
    hub.terminals[0];
  const terminalName =
    activeContext?.terminalLabel ??
    selectedTerminal?.name ??
    t("portNotes.value.noData");
  const gate =
    activeContext?.gateName ??
    (selectedTerminal?.gateNames.join(" · ") ||
      t("portNotes.value.noData"));
  const allNotes = publishedNotes(hub);
  const notes = activeContext
    ? allNotes.filter((note) => activeContext.noteIds.includes(note.id))
    : allNotes;
  const product = bestProduct(hub.internet.esimProducts);
  const esimNote = firstTopicNote(notes, ["esim"]);
  const fallbackEsimNote = firstTopicNote(allNotes, ["esim"]);
  const internetEvidenceNote = esimNote ?? fallbackEsimNote;
  const esimPayload =
    internetEvidenceNote?.payload.topic === "esim"
      ? internetEvidenceNote.payload
      : undefined;
  const taxiNote = firstTopicNote(notes, ["taxi", "rideHailing"]);
  const taxiSummary = activeContext
    ? contextSummary(activeContext.id, "taxi", t)
    : t("portNotes.snapshot.taxiFallback");
  const internetSummary = product
    ? productLabel(product, formatMoney, t)
    : t("portNotes.internet.noDeal");
  const shoreLeaveSummary = activeContext
    ? contextSummary(activeContext.id, "shoreLeave", t)
    : t("portNotes.snapshot.shoreLeaveFallback");
  const topicCount = (topics: readonly NoteTopic[]) =>
    notes.filter((note) => topics.includes(note.topic)).length;
  const confidence = combinedTrust(
    [
      hub.port.trust,
      hub.dataHealth.trust,
      ...(activeContext
        ? [
            knowledgeTrust(activeContext.shoreLeave),
            knowledgeTrust(activeContext.taxiPickup),
          ]
        : []),
    ],
    t,
  );
  const shoreLeaveTrust = trustPresentation(
    activeContext
      ? knowledgeTrust(activeContext.shoreLeave)
      : knowledgeTrust(hub.access.shoreLeave),
    t,
  );
  const communityTrust = combinedTrust(
    notes.length > 0
      ? notes.map((note) => note.trust)
      : [hub.dataHealth.trust],
    t,
  );
  const foodSummary = categorySummary(hub, "food", t, selectedTerminal?.id);
  const internetTrust = combinedTrust(
    [
      product?.trust ?? hub.dataHealth.trust,
      knowledgeTrust(hub.internet.bestOption),
    ],
    t,
  );
  const taxiTrust = trustPresentation(
    activeContext
      ? knowledgeTrust(activeContext.taxiPickup)
      : taxiNote?.trust ?? hub.dataHealth.trust,
    t,
  );

  const selectedWelfareProviders = activeContext
    ? hub.welfareProviders.filter((provider) =>
        activeContext.welfareProviderIds.includes(provider.id),
      )
    : hub.welfareProviders;
  const welfareCards: readonly WelfareCardModel[] = selectedWelfareProviders.map(
    (provider) => {
      const services = hub.welfareServices.filter(
        (service) => service.providerId === provider.id,
      );
      return {
        id: provider.id,
        name: provider.name,
        badges: services
          .map((service) => {
            const key = welfareCapabilityKeys[service.capability];
            return key
              ? {
                  id: service.id,
                  label: t(key),
                  status:
                    service.status === "unknown" ? "unknown" : "reported",
                }
              : undefined;
          })
          .filter((badge): badge is WelfareBadgeModel => Boolean(badge))
          .slice(0, 5),
        summary:
          services.find((service) => service.scheduleSummary)?.scheduleSummary ??
          t("portNotes.welfare.demoSummary"),
        trust: combinedTrust(
          [provider.trust, ...services.map((service) => service.trust)],
          t,
        ),
      };
    },
  );
  const quickInfoBlocks = activeContext?.quickNotes ??
    [
      hub.access.terminalAccess,
      hub.access.transport[0],
      hub.access.returnToShip,
    ].filter((item): item is KnowledgeBlock => Boolean(item));
  const welfareQuickInfo = welfareCards[0];
  const quickInfoItems: readonly QuickNoteItemModel[] = [
    ...quickInfoBlocks.slice(0, 3).map((item) => ({
      id: item.id,
      title: quickInfoTitle(item, gate, t),
      summary: item.summary,
      ...(item.details[0] ? { hint: item.details[0] } : {}),
      symbol: quickInfoSymbol(item),
      trust: trustPresentation(knowledgeTrust(item), t),
    })),
    {
      id: welfareQuickInfo?.id ?? "welfare-no-data",
      title: t("portNotes.quickNotes.welfareTitle"),
      summary:
        welfareQuickInfo?.badges.map((badge) => badge.label).join(" · ") ||
        t("portNotes.quickNotes.noWelfare"),
      ...(welfareQuickInfo ? { hint: welfareQuickInfo.name } : {}),
      symbol: "W",
      trust:
        welfareQuickInfo?.trust ?? {
          status: "unknown",
          label: t("trust.unknown"),
        },
    },
  ];

  const rankedNotes = [...notes]
    .sort(
      (left, right) =>
        notePriority(right.topic) - notePriority(left.topic) ||
        right.confirmationCount - left.confirmationCount,
    )
    .slice(0, 5)
    .map((note) => toNoteCardModel(note, hub, t));
  const recentNotes = [...notes]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 3)
    .map((note) => toNoteCardModel(note, hub, t));

  const actionCount = (topics: readonly NoteTopic[]) => {
    const count = topicCount(topics);
    return count > 0 ? t("portNotes.action.count", { count }) : undefined;
  };
  const topics: readonly TopicPreviewModel[] = [
    {
      id: "internet-sim",
      symbol: "e",
      title: t("portNotes.topicSection.internet"),
      bullets: [
        internetSummary,
        hub.internet.physicalSim[0]?.summary ??
          t("portNotes.topicSection.noPhysicalSim"),
        hub.internet.wifi[0]?.summary ?? t("portNotes.topicSection.noWifi"),
      ],
      actionLabel: t("portNotes.topicSection.seeInternet"),
    },
    {
      id: "shore-transport",
      symbol: "T",
      title: t("portNotes.topicSection.shoreLeave"),
      bullets: [
        shoreLeaveSummary,
        taxiSummary,
        t("portNotes.safety.returnSummaryFallback"),
      ],
      actionLabel: t("portNotes.topicSection.seeTransport"),
    },
    {
      id: "food-supplies",
      symbol: "F",
      title: t("portNotes.topicSection.food"),
      bullets: [
        foodSummary,
        categorySummary(hub, "shopping", t, selectedTerminal?.id),
        ...notes
          .filter((note) =>
            ["foodOrder", "supplies", "shopping"].includes(note.topic),
          )
          .slice(0, 1)
          .map((note) => note.summary),
      ].slice(0, 3),
      actionLabel: t("portNotes.topicSection.seeFood"),
    },
    {
      id: "places",
      symbol: "P",
      title: t("portNotes.topicSection.places"),
      bullets: notes
        .filter((note) => note.topic === "placesToVisit")
        .slice(0, 3)
        .map((note) => note.summary)
        .concat(
          notes.some((note) => note.topic === "placesToVisit")
            ? []
            : [t("portNotes.topicSection.noPlaces")],
        )
        .slice(0, 3),
      actionLabel: t("portNotes.topicSection.seePlaces"),
    },
    {
      id: "seaman-club",
      symbol: "C",
      title: t("portNotes.topicSection.seamanClub"),
      bullets: [
        selectedWelfareProviders[0]?.name ??
          t("portNotes.topicSection.noClub"),
        hub.welfareServices.find((service) =>
          selectedWelfareProviders.some(
            (provider) => provider.id === service.providerId,
          ),
        )?.scheduleSummary ?? t("portNotes.topicSection.noWelfareData"),
        notes.find((note) => note.topic === "seamanClub")?.summary ??
          t("portNotes.topicSection.confirmClub"),
      ],
      actionLabel: t("portNotes.topicSection.seeClub"),
    },
    {
      id: "help",
      symbol: "?",
      title: t("portNotes.topicSection.help"),
      bullets: [
        t("portNotes.topicSection.pending", {
          count: hub.community.openConfirmationCount,
        }),
        hub.dataHealth.missingAreas.length > 0
          ? t("portNotes.topicSection.missing", {
              value: hub.dataHealth.missingAreas.join(" · "),
            })
          : t("portNotes.topicSection.noMissing"),
        hub.community.contributionPrompt,
      ],
      actionLabel: t("portNotes.topicSection.writeNote"),
    },
  ];
  const topicShortcutIds = new Set([
    "internet-sim",
    "shore-transport",
    "food-supplies",
    "seaman-club",
  ]);
  const topicShortcuts: readonly TopicShortcutModel[] = topics
    .filter((topic) => topicShortcutIds.has(topic.id))
    .map((topic) => ({
      id: topic.id,
      title: topic.title,
      summary: topic.bullets[0] ?? t("portNotes.value.noData"),
      targetId: `topic-${topic.id}`,
    }));

  return {
    snapshot: {
      name: activeContext?.displayName ?? selectedTerminal?.name ?? hub.port.name,
      location: [hub.port.city, hub.port.country.name].filter(Boolean).join(", "),
      terminal: terminalName,
      gate,
    },
    snapshotFacts: [
      {
        id: "shore-leave",
        icon: "shore-leave",
        label: t("portNotes.snapshot.shoreLeave"),
        value: shoreLeaveSummary,
        detail: `${terminalName} · ${gate}`,
        trust: shoreLeaveTrust,
      },
      {
        id: "internet",
        icon: "internet",
        label: t("portNotes.snapshot.bestInternet"),
        value: product?.name ?? internetSummary,
        detail: product
          ? `${product.dataAllowanceGb === "unlimited" ? t("portNotes.internet.unlimited") : `${product.dataAllowanceGb} GB`} / ${product.validityDays} ${t("portNotes.internet.days")} · ${formatMoney(product.price.amount, product.price.currency)}`
          : undefined,
        trust: internetTrust,
        target: "internet",
      },
      {
        id: "taxi",
        icon: "taxi",
        label: t("portNotes.snapshot.taxi"),
        value: taxiSummary,
        detail: gate,
        trust: taxiTrust,
        target: activeContext || taxiNote ? "taxi" : undefined,
      },
      {
        id: "community",
        icon: "community",
        label: t("portNotes.snapshot.community"),
        value: t("portNotes.snapshot.notesSummary", { count: notes.length }),
        detail: t("portNotes.snapshot.pendingSummary", {
          count: hub.community.openConfirmationCount,
        }),
        trust: communityTrust,
        target: "community",
      },
    ],
    alerts: (activeContext?.criticalInformation ?? hub.criticalInformation).map(
      (item) => ({
        id: item.id,
        severity: item.severity,
        title: item.title,
        summary: item.summary,
        trust: trustPresentation(
          {
            basis: item.meta.trustBasis,
            conflictState: item.meta.conflictState,
            confirmationCount: item.meta.confirmationCount,
          },
          t,
        ),
      }),
    ),
    taxiPhrase: {
      contextLabel: activeContext?.label ?? terminalName,
      gate,
      phrase:
        activeContext?.taxiHangulPhrase ??
        t("portNotes.taxiDialog.fallbackPhrase"),
      trust: activeContext
        ? trustPresentation(knowledgeTrust(activeContext.taxiPickup), t)
        : confidence,
    },
    internetDeal: {
      name: product?.name ?? t("portNotes.internet.noDeal"),
      provider: product?.provider ?? t("portNotes.value.noData"),
      price: product
        ? formatMoney(product.price.amount, product.price.currency)
        : t("portNotes.value.noData"),
      plan: product
        ? `${product.dataAllowanceGb === "unlimited" ? t("portNotes.internet.unlimited") : `${product.dataAllowanceGb} GB`} / ${product.validityDays} ${t("portNotes.internet.days")}`
        : hub.internet.bestOption.summary,
      hotspot: product
        ? product.hotspotAllowed
          ? t("portNotes.internet.hotspotYes")
          : t("portNotes.internet.hotspotNo")
        : t("portNotes.internet.hotspotUnknown"),
      signal: esimPayload?.signalQuality
        ? t(signalTranslationKeys[esimPayload.signalQuality])
        : hub.internet.bestOption.summary,
      videoCall: esimPayload?.videoCallQuality
        ? t(videoTranslationKeys[esimPayload.videoCallQuality])
        : t("portNotes.internet.videoUnknown"),
      evidence: internetEvidenceNote
        ? `${internetEvidenceNote.confirmationCount} ${t("portNotes.internet.seafarers")}`
        : t("portNotes.internet.prototypeEvidence"),
      trust: internetTrust,
    },
    quickNotes: {
      items: quickInfoItems,
    },
    actions: [
      {
        id: "compare-esim",
        label: t("portNotes.action.compareEsim"),
        description: t("portNotes.action.compareEsimDescription"),
        count: actionCount(["esim"]),
        tone: "blue",
      },
      {
        id: "physical-sim",
        label: t("portNotes.action.physicalSim"),
        description: t("portNotes.action.physicalSimDescription"),
        count: actionCount(["physicalSim"]),
        tone: "teal",
      },
      {
        id: "shore-leave",
        label: t("portNotes.action.shoreLeave"),
        description: t("portNotes.action.shoreLeaveDescription"),
        count: actionCount(["taxi", "rideHailing", "placesToVisit"]),
        tone: "orange",
      },
      {
        id: "food-fruit",
        label: t("portNotes.action.foodFruit"),
        description: t("portNotes.action.foodFruitDescription"),
        count: actionCount(["foodOrder", "supplies", "shopping"]),
        tone: "orange",
      },
      {
        id: "shopping-gifts",
        label: t("portNotes.action.shoppingGifts"),
        description: t("portNotes.action.shoppingGiftsDescription"),
        count: actionCount(["shopping", "supplies"]),
        tone: "teal",
      },
      {
        id: "seaman-club",
        label: t("portNotes.action.seamanClub"),
        description: t("portNotes.action.seamanClubDescription"),
        count:
          selectedWelfareProviders.length > 0
            ? t("portNotes.action.providerCount", {
                count: selectedWelfareProviders.length,
              })
          : actionCount(["seamanClub"]),
        tone: "teal",
      },
      {
        id: "other-notes",
        label: t("portNotes.action.otherNotes"),
        description: t("portNotes.action.otherNotesDescription"),
        count: actionCount(["warning", "generalTip"]),
        tone: "teal",
      },
      {
        id: "write-note",
        label: t("portNotes.action.writeNote"),
        description: t("portNotes.action.writeNoteDescription"),
        tone: "blue",
      },
    ],
    topNotes: rankedNotes,
    notes: notes.map((note) => toNoteCardModel(note, hub, t)),
    recentNotes,
    topics,
    topicShortcuts,
    safety: {
      emergencyName:
        hub.emergencyContacts[0]?.displayName ?? t("portNotes.safety.noEmergency"),
      emergencyPhone:
        hub.emergencyContacts[0]?.phoneShortCode ??
        hub.emergencyContacts[0]?.phoneLocalFormat ??
        t("portNotes.value.noData"),
      emergencyTrust: trustPresentation(
        hub.emergencyContacts[0]?.trust ?? hub.dataHealth.trust,
        t,
      ),
      returnSummary: t("portNotes.safety.returnSummaryFallback"),
      gate,
      note: t("portNotes.safety.note"),
    },
    welfareCards,
    dataTrust: {
      message: t("portNotes.trust.message"),
      detail: t("portNotes.trust.detail"),
      evidence: t("portNotes.trust.evidence", {
        notes: notes.length,
        pending: hub.community.openConfirmationCount,
        missing: hub.dataHealth.missingAreas.length,
        conflicts: hub.dataHealth.conflictingAreas.length,
      }),
      trust: combinedTrust([hub.dataHealth.trust], t),
      contributionPrompt: hub.community.contributionPrompt,
    },
  };
}

function knowledgeTrust(block: KnowledgeBlock): TrustEvidence {
  return {
    basis: block.meta.trustBasis,
    conflictState: block.meta.conflictState,
    confirmationCount: block.meta.confirmationCount,
  };
}
