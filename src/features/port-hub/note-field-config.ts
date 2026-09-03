export interface NoteFieldDisplayRule {
  readonly softLimit: number;
  readonly hardLimit: number;
  readonly collapsedLines: number;
  readonly inputControl: "input" | "textarea";
}

export const NOTE_FIELD_DISPLAY_CONFIG = {
  mainNote: { softLimit: 180, hardLimit: 800, collapsedLines: 3, inputControl: "textarea" },
  avoid: { softLimit: 90, hardLimit: 180, collapsedLines: 2, inputControl: "textarea" },
  price: { softLimit: 50, hardLimit: 80, collapsedLines: 1, inputControl: "input" },
  pickupPoint: { softLimit: 100, hardLimit: 180, collapsedLines: 2, inputControl: "textarea" },
  rideApp: { softLimit: 50, hardLimit: 80, collapsedLines: 1, inputControl: "input" },
  negotiatePrice: { softLimit: 100, hardLimit: 180, collapsedLines: 2, inputControl: "textarea" },
  detail: { softLimit: 100, hardLimit: 180, collapsedLines: 2, inputControl: "input" },
  descriptive: { softLimit: 100, hardLimit: 180, collapsedLines: 2, inputControl: "textarea" },
} as const satisfies Readonly<Record<string, NoteFieldDisplayRule>>;

const priceFields = new Set(["price", "fairPrice", "goodPrice", "cost"]);
const pickupFields = new Set(["pickup", "place", "location", "where", "supermarket"]);
const descriptiveFields = new Set(["recommendation", "try", "extra"]);

export function resolveNoteFieldDisplayRule(fieldKey: string): NoteFieldDisplayRule {
  if (fieldKey === "mainNote") return NOTE_FIELD_DISPLAY_CONFIG.mainNote;
  const field = fieldKey.split(".").at(-1) ?? fieldKey;
  if (field === "avoid") return NOTE_FIELD_DISPLAY_CONFIG.avoid;
  if (priceFields.has(field)) return NOTE_FIELD_DISPLAY_CONFIG.price;
  if (pickupFields.has(field)) return NOTE_FIELD_DISPLAY_CONFIG.pickupPoint;
  if (field === "rideApp") return NOTE_FIELD_DISPLAY_CONFIG.rideApp;
  if (field === "agreeFare") return NOTE_FIELD_DISPLAY_CONFIG.negotiatePrice;
  if (descriptiveFields.has(field)) return NOTE_FIELD_DISPLAY_CONFIG.descriptive;
  return NOTE_FIELD_DISPLAY_CONFIG.detail;
}

export function noteFieldCharacterCount(value: string): number {
  return Array.from(value).length;
}

export function shouldShowNoteFieldGuidance(value: string, rule: NoteFieldDisplayRule): boolean {
  const length = noteFieldCharacterCount(value);
  return length > rule.softLimit || length >= Math.ceil(rule.hardLimit * 0.8);
}

export function isNoteFieldWithinHardLimit(value: string, rule: NoteFieldDisplayRule): boolean {
  return noteFieldCharacterCount(value) <= rule.hardLimit;
}

export function shouldOfferNoteFieldExpansion(value: string, rule: NoteFieldDisplayRule): boolean {
  const estimatedCollapsedCapacity = rule.collapsedLines * 48;
  return noteFieldCharacterCount(value) > Math.min(rule.softLimit, estimatedCollapsedCapacity);
}
