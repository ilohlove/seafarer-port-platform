import type { TrustStatusPresentation } from "../../components";
import type { I18nContextValue } from "../../i18n";
import {
  deriveTrustDisplayStatus,
  type KnowledgeBlock,
  type KnowledgeMeta,
  type PlaceRecommendation,
  type PortHubReadModel,
  type TrustDisplayStatus,
  type TrustEvidence,
} from "../../types";

type Translate = I18nContextValue["t"];
type FormatMoney = I18nContextValue["formatMoney"];

export interface PortHubHeaderModel {
  readonly name: string;
  readonly location: string;
  readonly unLocode?: string;
  readonly selectedTerminal: string;
  readonly gateNames: readonly string[];
  readonly terminalNames: readonly string[];
  readonly trust: TrustStatusPresentation;
  readonly dataQuality: string;
  readonly dataQualityTrust: TrustStatusPresentation;
}

export interface QuickBriefModel {
  readonly bullets: readonly string[];
  readonly sourceSummary: string;
  readonly trust: TrustStatusPresentation;
}

export interface DecisionItemModel {
  readonly id: string;
  readonly symbol: string;
  readonly label: string;
  readonly value: string;
  readonly detail: string;
  readonly trust: TrustStatusPresentation;
  readonly tone?: "default" | "caution" | "critical";
}

export interface OverviewCardModel {
  readonly id: string;
  readonly symbol: string;
  readonly title: string;
  readonly facts: readonly string[];
  readonly reason: string;
  readonly trust: TrustStatusPresentation;
  readonly tone: "blue" | "green" | "orange" | "red" | "neutral";
}

export interface ReturnToShipModel {
  readonly allAboard: string;
  readonly recommendedReturn: string;
  readonly buffer: string;
  readonly gate: string;
  readonly address: string;
  readonly contact: string;
  readonly guidance: string;
  readonly emergencyContacts: readonly {
    readonly id: string;
    readonly name: string;
    readonly phone: string;
    readonly instruction?: string;
    readonly trust: TrustStatusPresentation;
  }[];
}

export interface DataTrustModel {
  readonly message: string;
  readonly detail: string;
  readonly trust: TrustStatusPresentation;
}

export interface PortHubViewModel {
  readonly header: PortHubHeaderModel;
  readonly quickBrief: QuickBriefModel;
  readonly decisions: readonly DecisionItemModel[];
  readonly overviewCards: readonly OverviewCardModel[];
  readonly returnToShip: ReturnToShipModel;
  readonly dataTrust: DataTrustModel;
}

const trustTranslationKeys = {
  officialSource: "trust.officialSource",
  communityConfirmed: "trust.communityConfirmed",
  needsConfirmation: "trust.needsConfirmation",
  conflictingReports: "trust.conflictingReports",
  unknown: "trust.unknown",
} as const;

const statusPriority: Readonly<Record<TrustDisplayStatus, number>> = {
  officialSource: 0,
  communityConfirmed: 1,
  needsConfirmation: 2,
  unknown: 3,
  conflictingReports: 4,
};

function evidenceFromMeta(meta: KnowledgeMeta): TrustEvidence {
  return {
    basis: meta.trustBasis,
    conflictState: meta.conflictState,
    confirmationCount: meta.confirmationCount,
  };
}

function trustPresentation(
  evidence: TrustEvidence,
  t: Translate,
): TrustStatusPresentation {
  const status = deriveTrustDisplayStatus(evidence);
  return { status, label: t(trustTranslationKeys[status]) };
}

function cautiousTrust(
  evidences: readonly TrustEvidence[],
  t: Translate,
): TrustStatusPresentation {
  const statuses = evidences.map(deriveTrustDisplayStatus);
  const status = statuses.reduce<TrustDisplayStatus>(
    (current, candidate) =>
      statusPriority[candidate] > statusPriority[current]
        ? candidate
        : current,
    "officialSource",
  );
  return { status, label: t(trustTranslationKeys[status]) };
}

function decisionValue(
  trust: TrustStatusPresentation,
  t: Translate,
): string {
  if (trust.status === "officialSource") {
    return t("portHub.decision.confirmed");
  }
  if (trust.status === "communityConfirmed") {
    return t("portHub.decision.communityReported");
  }
  return t("portHub.decision.verify");
}

function findCategory(
  hub: PortHubReadModel,
  suffix: "atm" | "food" | "medical" | "welfare",
) {
  return hub.services.categories.find((category) =>
    category.id.endsWith(`-${suffix}`),
  );
}

function firstRecommendation(
  hub: PortHubReadModel,
  suffix: "atm" | "food" | "medical" | "welfare",
): PlaceRecommendation | undefined {
  return findCategory(hub, suffix)?.recommendations[0];
}

function accessSummary(
  recommendation: PlaceRecommendation | undefined,
  t: Translate,
): string {
  const access = recommendation?.access;
  if (!access) {
    return t("portHub.fact.noAccessData");
  }

  const parts = [
    access.gateName
      ? t("portHub.fact.gateValue", { value: access.gateName })
      : undefined,
    access.walkingDurationMin !== undefined
      ? t("portHub.fact.walkMinutes", { value: access.walkingDurationMin })
      : undefined,
    access.drivingDurationMin !== undefined
      ? t("portHub.fact.driveMinutes", { value: access.drivingDurationMin })
      : undefined,
  ].filter((value): value is string => Boolean(value));

  return parts.length > 0
    ? parts.join(" · ")
    : t("portHub.fact.noAccessData");
}

function costSummary(
  recommendation: PlaceRecommendation | undefined,
  formatMoney: FormatMoney,
  t: Translate,
): string | undefined {
  const minimum =
    recommendation?.access?.estimatedTaxiFareMin ??
    recommendation?.estimatedCost?.[0];
  const maximum = recommendation?.access?.estimatedTaxiFareMax;
  if (!minimum) {
    return undefined;
  }

  const value = maximum
    ? `${formatMoney(minimum.amount, minimum.currency)}–${formatMoney(
        maximum.amount,
        maximum.currency,
      )}`
    : formatMoney(minimum.amount, minimum.currency);
  return t("portHub.fact.costValue", { value });
}

function knowledgeTrust(block: KnowledgeBlock): TrustEvidence {
  return evidenceFromMeta(block.meta);
}

export function buildPortHubViewModel(
  hub: PortHubReadModel,
  t: Translate,
  formatMoney: FormatMoney,
): PortHubViewModel {
  const selectedTerminal =
    hub.terminals.find((terminal) => terminal.id === hub.selectedTerminalId) ??
    hub.terminals[0];
  const terminalName = selectedTerminal?.name ?? t("portHub.value.noData");
  const gateNames = selectedTerminal?.gateNames ?? [];
  const dataQuality = t(`portHub.dataQuality.${hub.dataHealth.coverage}`);
  const atm = firstRecommendation(hub, "atm");
  const food = firstRecommendation(hub, "food");
  const medical = firstRecommendation(hub, "medical");
  const welfare = firstRecommendation(hub, "welfare");
  const emergency = hub.emergencyContacts[0];
  const languageItem = hub.overview.items.find(
    (item) =>
      item.id.toLocaleLowerCase("en").includes("language") ||
      item.label.toLocaleLowerCase("vi").includes("ngôn ngữ"),
  );
  const firstTransport = hub.access.transport[0];
  const observedMoney =
    atm?.estimatedCost?.[0] ??
    food?.estimatedCost?.[0] ??
    hub.internet.esimProducts[0]?.price;
  const currency = observedMoney?.currency ?? t("portHub.value.noData");
  const returnBrief = hub.quickBrief.find(
    (item) =>
      item.id.toLocaleLowerCase("en").includes("return") ||
      item.label.toLocaleLowerCase("vi").includes("buffer"),
  );
  const sourceSummary = Array.from(
    new Set([
      ...hub.quickBrief.map((item) => item.meta.source.name),
      ...hub.overview.items.map((item) => item.meta.source.name),
      hub.access.shoreLeave.meta.source.name,
      hub.internet.bestOption.meta.source.name,
    ]),
  )
    .slice(0, 3)
    .join(" + ");

  const shoreTrust = cautiousTrust(
    [
      knowledgeTrust(hub.access.shoreLeave),
      knowledgeTrust(hub.access.requiredDocuments),
      knowledgeTrust(hub.access.terminalAccess),
      knowledgeTrust(hub.access.returnToShip),
    ],
    t,
  );
  const connectivityTrust = cautiousTrust(
    [
      knowledgeTrust(hub.internet.bestOption),
      ...(hub.internet.wifi[0]
        ? [knowledgeTrust(hub.internet.wifi[0])]
        : [hub.dataHealth.trust]),
    ],
    t,
  );
  const transportTrust = firstTransport
    ? trustPresentation(knowledgeTrust(firstTransport), t)
    : trustPresentation(hub.dataHealth.trust, t);
  const atmTrust = trustPresentation(
    atm?.place.trust ?? hub.dataHealth.trust,
    t,
  );
  const foodTrust = trustPresentation(
    food?.place.trust ?? hub.dataHealth.trust,
    t,
  );
  const medicalTrust = trustPresentation(
    medical?.place.trust ?? hub.dataHealth.trust,
    t,
  );
  const welfareTrust = trustPresentation(
    hub.welfareProviders[0]?.trust ??
      welfare?.place.trust ??
      hub.dataHealth.trust,
    t,
  );

  const lowestEsimPrice = hub.internet.esimProducts.reduce<
    (typeof hub.internet.esimProducts)[number] | undefined
  >((lowest, product) => {
    if (!lowest || product.price.amount < lowest.price.amount) {
      return product;
    }
    return lowest;
  }, undefined);

  const atmCost = costSummary(atm, formatMoney, t);
  const foodCost = costSummary(food, formatMoney, t);
  const communityTags = Array.from(
    new Set(hub.community.reviews.flatMap((review) => review.tags)),
  );

  return {
    header: {
      name: hub.port.name,
      location: [hub.port.city, hub.port.country.name]
        .filter(Boolean)
        .join(", "),
      unLocode: hub.port.unLocode,
      selectedTerminal: terminalName,
      gateNames,
      terminalNames: hub.terminals.map((terminal) => terminal.name),
      trust: trustPresentation(hub.port.trust, t),
      dataQuality,
      dataQualityTrust: trustPresentation(hub.dataHealth.trust, t),
    },
    quickBrief: {
      bullets: [
        hub.overview.decisionSummary,
        t("portHub.quick.terminalFact", {
          terminal: terminalName,
          detail: hub.access.terminalAccess.summary,
        }),
        hub.internet.bestOption.summary,
        hub.welfareProviders[0]
          ? t("portHub.quick.welfareFact", {
              value: hub.welfareProviders[0].name,
            })
          : t("portHub.quick.noWelfare"),
        hub.criticalInformation[0]?.summary ?? hub.access.returnToShip.summary,
      ],
      sourceSummary,
      trust: cautiousTrust(
        [
          hub.dataHealth.trust,
          ...hub.quickBrief.map((item) => evidenceFromMeta(item.meta)),
        ],
        t,
      ),
    },
    decisions: [
      {
        id: "shore-leave",
        symbol: "S",
        label: t("portHub.decision.shoreLeave"),
        value: decisionValue(
          trustPresentation(knowledgeTrust(hub.access.shoreLeave), t),
          t,
        ),
        detail: hub.access.shoreLeave.summary,
        trust: trustPresentation(knowledgeTrust(hub.access.shoreLeave), t),
        tone: "caution",
      },
      {
        id: "documents",
        symbol: "D",
        label: t("portHub.decision.documents"),
        value: decisionValue(
          trustPresentation(knowledgeTrust(hub.access.requiredDocuments), t),
          t,
        ),
        detail: hub.access.requiredDocuments.summary,
        trust: trustPresentation(
          knowledgeTrust(hub.access.requiredDocuments),
          t,
        ),
      },
      {
        id: "transport",
        symbol: "T",
        label: t("portHub.decision.transport"),
        value: firstTransport?.label ?? t("portHub.value.noData"),
        detail:
          firstTransport?.summary ?? t("portHub.fact.noRecommendation"),
        trust: transportTrust,
        tone: "caution",
      },
      {
        id: "currency",
        symbol: "$",
        label: t("portHub.decision.currency"),
        value: currency,
        detail: atm
          ? t("portHub.fact.currencyObserved")
          : t("portHub.fact.noRecommendation"),
        trust: atmTrust,
      },
      {
        id: "language",
        symbol: "A",
        label: t("portHub.decision.language"),
        value: languageItem
          ? t("portHub.decision.guidanceAvailable")
          : t("portHub.value.noData"),
        detail: languageItem?.summary ?? t("portHub.fact.noRecommendation"),
        trust: languageItem
          ? trustPresentation(knowledgeTrust(languageItem), t)
          : trustPresentation(hub.dataHealth.trust, t),
      },
      {
        id: "emergency",
        symbol: "!",
        label: t("portHub.decision.emergency"),
        value:
          emergency?.phoneShortCode ??
          emergency?.phoneLocalFormat ??
          t("portHub.value.noData"),
        detail:
          emergency?.displayName ?? t("portHub.fact.noRecommendation"),
        trust: trustPresentation(emergency?.trust ?? hub.dataHealth.trust, t),
        tone: "critical",
      },
    ],
    overviewCards: [
      {
        id: "shore-access",
        symbol: "A",
        title: t("portHub.card.shoreAccess"),
        facts: [
          hub.access.shoreLeave.summary,
          hub.access.requiredDocuments.summary,
          t("portHub.fact.terminalValue", { value: terminalName }),
          hub.access.returnToShip.summary,
        ],
        reason: t("portHub.reason.terminal"),
        trust: shoreTrust,
        tone: "blue",
      },
      {
        id: "connectivity",
        symbol: "C",
        title: t("portHub.card.connectivity"),
        facts: [
          hub.internet.bestOption.summary,
          lowestEsimPrice
            ? t("portHub.fact.esimFrom", {
                value: formatMoney(
                  lowestEsimPrice.price.amount,
                  lowestEsimPrice.price.currency,
                ),
              })
            : t("portHub.fact.noRecommendation"),
          hub.internet.wifi[0]?.summary ?? t("portHub.fact.noWifiData"),
          hub.internet.esimProducts.some((product) => product.hotspotAllowed)
            ? t("portHub.fact.hotspotReported")
            : t("portHub.fact.hotspotUnknown"),
        ],
        reason: t("portHub.reason.connectivity"),
        trust: connectivityTrust,
        tone: "green",
      },
      {
        id: "atm-currency",
        symbol: "$",
        title: t("portHub.card.atmCurrency"),
        facts: [
          atm
            ? t("portHub.fact.placeValue", { value: atm.place.name })
            : t("portHub.fact.noRecommendation"),
          atm?.place.address ?? t("portHub.value.noData"),
          accessSummary(atm, t),
          atm?.statusTags.includes("foreign-card-confirmed")
            ? t("portHub.fact.cardsConfirmed")
            : t("portHub.fact.cardsUnconfirmed"),
          ...(atmCost ? [atmCost] : []),
        ],
        reason: t("portHub.reason.currency"),
        trust: atmTrust,
        tone: "blue",
      },
      {
        id: "food-dining",
        symbol: "F",
        title: t("portHub.card.foodDining"),
        facts: [
          food
            ? t("portHub.fact.placeValue", { value: food.place.name })
            : t("portHub.fact.noRecommendation"),
          food?.place.address ?? t("portHub.value.noData"),
          accessSummary(food, t),
          ...(food?.place.attributes.includes("halal-options")
            ? [t("portHub.fact.dietaryConfirmed")]
            : []),
          ...(foodCost ? [foodCost] : []),
        ],
        reason: t("portHub.reason.food"),
        trust: foodTrust,
        tone: "orange",
      },
      {
        id: "medical-emergency",
        symbol: "+",
        title: t("portHub.card.medicalEmergency"),
        facts: [
          medical
            ? t("portHub.fact.placeValue", { value: medical.place.name })
            : t("portHub.fact.noMedicalData"),
          ...(medical ? [accessSummary(medical, t)] : []),
          emergency
            ? t("portHub.fact.emergencyValue", {
                name: emergency.displayName,
                phone:
                  emergency.phoneShortCode ??
                  emergency.phoneLocalFormat ??
                  t("portHub.value.noData"),
              })
            : t("portHub.fact.noEmergencyData"),
          emergency?.languageSupport.includes("en")
            ? t("portHub.fact.englishReported")
            : t("portHub.fact.languageSupportUnknown"),
        ],
        reason: t("portHub.reason.medical"),
        trust: medicalTrust,
        tone: "red",
      },
      {
        id: "seafarers-center",
        symbol: "W",
        title: t("portHub.card.seafarersCenter"),
        facts:
          hub.welfareProviders.length > 0
            ? [
                t("portHub.fact.providerValue", {
                  value: hub.welfareProviders[0].name,
                }),
                hub.welfareServices[0]?.scheduleSummary ??
                  t("portHub.fact.scheduleUnknown"),
                t("portHub.fact.welfareServices", {
                  value: hub.welfareServices.length,
                }),
                welfare ? accessSummary(welfare, t) : t("portHub.fact.remotePossible"),
              ]
            : [
                t("portHub.fact.noWelfareData"),
                t("portHub.fact.confirmWithAgent"),
              ],
        reason: t("portHub.reason.welfare"),
        trust: welfareTrust,
        tone: "green",
      },
      {
        id: "transport-options",
        symbol: "T",
        title: t("portHub.card.transport"),
        facts: [
          t("portHub.fact.terminalValue", { value: terminalName }),
          gateNames.length > 0
            ? t("portHub.fact.gateValue", { value: gateNames.join(" · ") })
            : t("portHub.fact.gateUnknown"),
          ...(hub.access.transport.length > 0
            ? hub.access.transport.slice(0, 2).map((item) => item.summary)
            : [t("portHub.fact.noTransportData")]),
        ],
        reason: t("portHub.reason.transport"),
        trust: transportTrust,
        tone: "orange",
      },
      {
        id: "community-knowledge",
        symbol: "K",
        title: t("portHub.card.community"),
        facts: [
          t("portHub.fact.communityConfidence", {
            value: trustPresentation(hub.dataHealth.trust, t).label,
          }),
          t("portHub.fact.reports", { value: hub.community.reviews.length }),
          t("portHub.fact.openConfirmations", {
            value: hub.community.openConfirmationCount,
          }),
          communityTags.length > 0
            ? t("portHub.fact.communityFocus", {
                value: communityTags.slice(0, 3).join(" · "),
              })
            : t("portHub.fact.noCommunityFocus"),
        ],
        reason: t("portHub.reason.community"),
        trust: trustPresentation(hub.dataHealth.trust, t),
        tone: "neutral",
      },
    ],
    returnToShip: {
      allAboard: t("portHub.return.notProvided"),
      recommendedReturn: t("portHub.return.notCalculated"),
      buffer: returnBrief?.value ?? t("portHub.return.notProvided"),
      gate:
        gateNames.length > 0
          ? gateNames.join(" · ")
          : t("portHub.fact.gateUnknown"),
      address: t("portHub.return.addressPlaceholder"),
      contact: t("portHub.return.contactPlaceholder"),
      guidance: hub.access.returnToShip.summary,
      emergencyContacts: hub.emergencyContacts.map((contact) => ({
        id: contact.id,
        name: contact.displayName,
        phone:
          contact.phoneShortCode ??
          contact.phoneLocalFormat ??
          contact.phoneE164 ??
          t("portHub.value.noData"),
        instruction: contact.callingInstruction,
        trust: trustPresentation(contact.trust, t),
      })),
    },
    dataTrust: {
      message: t("portHub.trustBanner.message", { quality: dataQuality }),
      detail: t("portHub.trustBanner.detail", {
        missing: hub.dataHealth.missingAreas.length,
        conflicts: hub.dataHealth.conflictingAreas.length,
      }),
      trust: trustPresentation(hub.dataHealth.trust, t),
    },
  };
}
