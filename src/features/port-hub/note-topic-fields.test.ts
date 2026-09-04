import { describe, expect, test } from "vitest";

import { enDictionary } from "../../i18n/en";
import { viDictionary } from "../../i18n/vi";
import { getNoteFieldLabelKey, getNoteTopicDefinition, NOTE_TOPIC_DEFINITIONS } from "./note-topic-fields";

describe("Port Note topic field definitions", () => {
  test("defines the exact fields for all seven quick topics", () => {
    expect(Object.fromEntries(NOTE_TOPIC_DEFINITIONS.map((topic) => [topic.id, topic.fields.map((field) => field.id)]))).toEqual({
      esim: ["price", "data", "days", "hotspot", "signal", "website"],
      physicalSim: ["seller", "fairPrice", "passport", "delivery", "contact"],
      shoreLeave: ["pickup", "rideApp", "price", "agreeFare", "avoid"],
      food: ["seller", "where", "price", "shipDelivery", "recommendation"],
      shopping: ["supermarket", "cosmetics", "supplements", "gift", "goodPrice"],
      welfare: ["wifi", "shuttle", "sim", "currency", "contact", "hours"],
      general: ["try", "avoid", "cost", "location", "contact"],
    });
  });

  test("keeps every field localized in Vietnamese and English", () => {
    for (const topic of NOTE_TOPIC_DEFINITIONS) {
      expect(viDictionary[topic.label]).toBeTruthy();
      expect(enDictionary[topic.label]).toBeTruthy();
      for (const field of topic.fields) {
        expect(viDictionary[field.label]).toBeTruthy();
        expect(enDictionary[field.label]).toBeTruthy();
      }
    }
  });

  test("does not expose fields from another topic as selectable fields", () => {
    expect(getNoteTopicDefinition("shopping").fields.some((field) => field.key === "shoreLeave.avoid")).toBe(false);
    expect(getNoteFieldLabelKey("shoreLeave", "shoreLeave.avoid")).toBe("portNotes.capture.chip.shoreLeave.avoid");
    expect(getNoteFieldLabelKey("shoreLeave", "shopping.gift")).toBeUndefined();
  });
});
