import type { TranslationKey } from "../../i18n";
import type { PortNoteTopic } from "../../types";

export interface NoteTopicFieldDefinition {
  readonly id: string;
  readonly key: string;
  readonly label: TranslationKey;
  readonly requiresContactPermission?: boolean;
}

export interface NoteTopicDefinition {
  readonly id: PortNoteTopic;
  readonly label: TranslationKey;
  readonly fields: readonly NoteTopicFieldDefinition[];
}

function field(topic: PortNoteTopic, id: string, label: TranslationKey, requiresContactPermission = false): NoteTopicFieldDefinition {
  return { id, key: `${topic}.${id}`, label, ...(requiresContactPermission ? { requiresContactPermission: true } : {}) };
}

export const NOTE_TOPIC_DEFINITIONS: readonly NoteTopicDefinition[] = [
  {
    id: "esim",
    label: "portNotes.capture.topic.esim",
    fields: [
      field("esim", "price", "portNotes.capture.chip.esim.price"),
      field("esim", "data", "portNotes.capture.chip.esim.data"),
      field("esim", "days", "portNotes.capture.chip.esim.days"),
      field("esim", "hotspot", "portNotes.capture.chip.esim.hotspot"),
      field("esim", "signal", "portNotes.capture.chip.esim.signal"),
      field("esim", "website", "portNotes.capture.chip.esim.website"),
    ],
  },
  {
    id: "physicalSim",
    label: "portNotes.capture.topic.physicalSim",
    fields: [
      field("physicalSim", "seller", "portNotes.capture.chip.physicalSim.seller"),
      field("physicalSim", "fairPrice", "portNotes.capture.chip.physicalSim.fairPrice"),
      field("physicalSim", "passport", "portNotes.capture.chip.physicalSim.passport"),
      field("physicalSim", "delivery", "portNotes.capture.chip.physicalSim.delivery"),
      field("physicalSim", "contact", "portNotes.capture.chip.physicalSim.contact", true),
    ],
  },
  {
    id: "shoreLeave",
    label: "portNotes.capture.topic.shoreLeave",
    fields: [
      field("shoreLeave", "pickup", "portNotes.capture.chip.shoreLeave.pickup"),
      field("shoreLeave", "rideApp", "portNotes.capture.chip.shoreLeave.rideApp"),
      field("shoreLeave", "price", "portNotes.capture.chip.shoreLeave.price"),
      field("shoreLeave", "agreeFare", "portNotes.capture.chip.shoreLeave.agreeFare"),
      field("shoreLeave", "avoid", "portNotes.capture.chip.shoreLeave.avoid"),
    ],
  },
  {
    id: "food",
    label: "portNotes.capture.topic.food",
    fields: [
      field("food", "seller", "portNotes.capture.chip.food.seller"),
      field("food", "where", "portNotes.capture.chip.food.where"),
      field("food", "price", "portNotes.capture.chip.food.price"),
      field("food", "shipDelivery", "portNotes.capture.chip.food.shipDelivery"),
      field("food", "recommendation", "portNotes.capture.chip.food.recommendation"),
    ],
  },
  {
    id: "shopping",
    label: "portNotes.capture.topic.shopping",
    fields: [
      field("shopping", "supermarket", "portNotes.capture.chip.shopping.supermarket"),
      field("shopping", "cosmetics", "portNotes.capture.chip.shopping.cosmetics"),
      field("shopping", "supplements", "portNotes.capture.chip.shopping.supplements"),
      field("shopping", "gift", "portNotes.capture.chip.shopping.gift"),
      field("shopping", "goodPrice", "portNotes.capture.chip.shopping.goodPrice"),
    ],
  },
  {
    id: "welfare",
    label: "portNotes.capture.topic.welfare",
    fields: [
      field("welfare", "wifi", "portNotes.capture.chip.welfare.wifi"),
      field("welfare", "shuttle", "portNotes.capture.chip.welfare.shuttle"),
      field("welfare", "sim", "portNotes.capture.chip.welfare.sim"),
      field("welfare", "currency", "portNotes.capture.chip.welfare.currency"),
      field("welfare", "contact", "portNotes.capture.chip.welfare.contact", true),
      field("welfare", "hours", "portNotes.capture.chip.welfare.hours"),
    ],
  },
  {
    id: "general",
    label: "portNotes.capture.topic.general",
    fields: [
      field("general", "try", "portNotes.capture.chip.general.try"),
      field("general", "avoid", "portNotes.capture.chip.general.avoid"),
      field("general", "cost", "portNotes.capture.chip.general.cost"),
      field("general", "location", "portNotes.capture.chip.general.location"),
      field("general", "contact", "portNotes.capture.chip.general.contact", true),
    ],
  },
];

const COMMON_FIELD_LABELS: Readonly<Record<string, TranslationKey>> = {
  "common.price": "portNotes.capture.price",
  "common.place": "portNotes.capture.place",
  "common.extra": "portNotes.capture.extra",
};

export function getNoteTopicDefinition(topic: PortNoteTopic): NoteTopicDefinition {
  return NOTE_TOPIC_DEFINITIONS.find((definition) => definition.id === topic) ?? NOTE_TOPIC_DEFINITIONS.at(-1)!;
}

export function getNoteFieldLabelKey(topic: PortNoteTopic, key: string): TranslationKey | undefined {
  if (key === "summary") return "portNotes.topicPanel.takeaway";
  if (COMMON_FIELD_LABELS[key]) return COMMON_FIELD_LABELS[key];
  return getNoteTopicDefinition(topic).fields.find((candidate) => candidate.key === key)?.label;
}

export function isContactNoteField(topic: PortNoteTopic, key: string): boolean {
  return Boolean(getNoteTopicDefinition(topic).fields.find((candidate) => candidate.key === key)?.requiresContactPermission);
}
