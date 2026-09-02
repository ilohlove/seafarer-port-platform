import type { TrustStatusPresentation } from "../../components";
import type { I18nContextValue, TranslationKey } from "../../i18n";
import {
  deriveTrustDisplayStatus,
  type NoteTopic,
  type PublishedPortNoteReadModel,
  type TrustDisplayStatus,
} from "../../types";

type Translate = I18nContextValue["t"];

export type CommunityTopicFilter =
  | "all"
  | "connectivity"
  | "transport"
  | "food"
  | "shopping"
  | "welfare"
  | "other";

export interface CommunityPortOption {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly location: string;
}

export interface CommunityNoteModel {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly topic: CommunityTopicFilter;
  readonly topicLabel: string;
  readonly portId: string;
  readonly portSlug: string;
  readonly portName: string;
  readonly context: string;
  readonly confirmations: string;
  readonly usefulness: string;
  readonly evidence: string;
  readonly trust: TrustStatusPresentation;
  readonly needsAttention: boolean;
  readonly searchText: string;
  readonly rank: number;
}

export interface CommunityLibraryModel {
  readonly ports: readonly CommunityPortOption[];
  readonly notes: readonly CommunityNoteModel[];
}

const trustTranslationKeys = {
  officialSource: "trust.officialSource",
  communityConfirmed: "trust.communityConfirmed",
  needsConfirmation: "trust.needsConfirmation",
  conflictingReports: "trust.conflictingReports",
  unknown: "trust.unknown",
} as const satisfies Record<TrustDisplayStatus, TranslationKey>;

const topicTranslationKeys = {
  all: "community.filter.all",
  connectivity: "community.filter.connectivity",
  transport: "community.filter.transport",
  food: "community.filter.food",
  shopping: "community.filter.shopping",
  welfare: "community.filter.welfare",
  other: "community.filter.other",
} as const satisfies Record<CommunityTopicFilter, TranslationKey>;

const topicGroups = {
  esim: "connectivity",
  physicalSim: "connectivity",
  taxi: "transport",
  rideHailing: "transport",
  foodOrder: "food",
  supplies: "shopping",
  shopping: "shopping",
  placesToVisit: "other",
  seamanClub: "welfare",
  shoreLeave: "transport",
  warning: "other",
  generalTip: "other",
} as const satisfies Record<NoteTopic, Exclude<CommunityTopicFilter, "all">>;

const noteCopyKeys: Readonly<
  Record<string, { readonly title: TranslationKey; readonly summary: TranslationKey }>
> = {
  "note-busan-esim": {
    title: "community.note.busanEsim.title",
    summary: "community.note.busanEsim.summary",
  },
  "note-busan-physical-sim": {
    title: "community.note.busanPhysicalSim.title",
    summary: "community.note.busanPhysicalSim.summary",
  },
  "note-busan-taxi": {
    title: "community.note.busanTaxi.title",
    summary: "community.note.busanTaxi.summary",
  },
  "note-busan-food": {
    title: "community.note.busanFood.title",
    summary: "community.note.busanFood.summary",
  },
  "note-busan-supplies": {
    title: "community.note.busanSupplies.title",
    summary: "community.note.busanSupplies.summary",
  },
  "note-busan-north-taxi": {
    title: "community.note.busanNorthTaxi.title",
    summary: "community.note.busanNorthTaxi.summary",
  },
  "note-busan-yeongdo-taxi": {
    title: "community.note.busanYeongdoTaxi.title",
    summary: "community.note.busanYeongdoTaxi.summary",
  },
  "note-busan-gamcheon-taxi": {
    title: "community.note.busanGamcheonTaxi.title",
    summary: "community.note.busanGamcheonTaxi.summary",
  },
  "note-sg-esim": {
    title: "community.note.singaporeEsim.title",
    summary: "community.note.singaporeEsim.summary",
  },
  "note-sg-physical-sim": {
    title: "community.note.singaporePhysicalSim.title",
    summary: "community.note.singaporePhysicalSim.summary",
  },
  "note-sg-transport": {
    title: "community.note.singaporeTransport.title",
    summary: "community.note.singaporeTransport.summary",
  },
  "note-sg-food": {
    title: "community.note.singaporeFood.title",
    summary: "community.note.singaporeFood.summary",
  },
  "note-sg-seaman-club": {
    title: "community.note.singaporeWelfare.title",
    summary: "community.note.singaporeWelfare.summary",
  },
  "note-klang-esim": {
    title: "community.note.klangEsim.title",
    summary: "community.note.klangEsim.summary",
  },
  "note-klang-shuttle-1": {
    title: "community.note.klangShuttleA.title",
    summary: "community.note.klangShuttleA.summary",
  },
  "note-klang-shuttle-2": {
    title: "community.note.klangShuttleB.title",
    summary: "community.note.klangShuttleB.summary",
  },
  "note-klang-places": {
    title: "community.note.klangPlaces.title",
    summary: "community.note.klangPlaces.summary",
  },
};

const featuredOrder = new Map([
  ["note-busan-esim", 0],
  ["note-sg-esim", 1],
  ["note-klang-esim", 2],
]);

function localizedNoteCopy(
  source: PublishedPortNoteReadModel,
  t: Translate,
): { readonly title: string; readonly summary: string } {
  const keys = noteCopyKeys[source.note.id];
  return keys
    ? { title: t(keys.title), summary: t(keys.summary) }
    : { title: source.note.title, summary: source.note.summary };
}

function uniqueParts(values: readonly (string | undefined)[]): readonly string[] {
  return values.filter(
    (value, index): value is string =>
      Boolean(value) && values.indexOf(value) === index,
  );
}

export function normalizeCommunitySearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function buildCommunityLibraryModel(
  sources: readonly PublishedPortNoteReadModel[],
  t: Translate,
): CommunityLibraryModel {
  const portOptions = new Map<string, CommunityPortOption>();

  const notes = sources.map((source) => {
    const { note, port, terminals } = source;
    const copy = localizedNoteCopy(source, t);
    const terminal = terminals.find((candidate) => candidate.id === note.terminalId);
    const portName = port.name.replace(/^Port of\s+/i, "");
    const context = uniqueParts([portName, terminal?.name, note.gateName]).join(" · ");
    const status = deriveTrustDisplayStatus(note.trust);
    const topic = topicGroups[note.topic];
    const confirmations = t("community.note.confirmations", {
      count: note.confirmationCount,
    });
    const usefulness = "";

    portOptions.set(port.id, {
      id: port.id,
      slug: port.slug,
      name: port.name,
      location: uniqueParts([port.city, port.country.name]).join(", "),
    });

    return {
      id: note.id,
      title: copy.title,
      summary: copy.summary,
      topic,
      topicLabel: t(topicTranslationKeys[topic]),
      portId: port.id,
      portSlug: port.slug,
      portName,
      context,
      confirmations,
      usefulness,
      evidence: confirmations,
      trust: { status, label: t(trustTranslationKeys[status]) },
      needsAttention:
        status !== "officialSource" && status !== "communityConfirmed",
      searchText: normalizeCommunitySearch(
        [copy.title, copy.summary, context, port.name, port.unLocode]
          .filter(Boolean)
          .join(" "),
      ),
      rank: featuredOrder.has(note.id)
        ? 10_000 - (featuredOrder.get(note.id) ?? 0)
        : note.confirmationCount,
    } satisfies CommunityNoteModel;
  });

  return {
    ports: [...portOptions.values()].sort((left, right) =>
      left.name.localeCompare(right.name),
    ),
    notes: notes.sort(
      (left, right) => right.rank - left.rank || left.title.localeCompare(right.title),
    ),
  };
}
