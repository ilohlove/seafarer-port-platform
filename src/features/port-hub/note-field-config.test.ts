import { describe, expect, test } from "vitest";

import {
  isNoteFieldWithinHardLimit,
  NOTE_FIELD_DISPLAY_CONFIG,
  noteFieldCharacterCount,
  resolveNoteFieldDisplayRule,
  shouldOfferNoteFieldExpansion,
  shouldShowNoteFieldGuidance,
} from "./note-field-config";

describe("Port Note field display configuration", () => {
  test("keeps approved V1 limits in one configuration", () => {
    expect(NOTE_FIELD_DISPLAY_CONFIG.mainNote).toMatchObject({ softLimit: 180, hardLimit: 800, collapsedLines: 3 });
    expect(NOTE_FIELD_DISPLAY_CONFIG.avoid).toMatchObject({ softLimit: 90, hardLimit: 180, collapsedLines: 2 });
    expect(NOTE_FIELD_DISPLAY_CONFIG.price).toMatchObject({ softLimit: 50, hardLimit: 80, collapsedLines: 1 });
    expect(NOTE_FIELD_DISPLAY_CONFIG.pickupPoint).toMatchObject({ softLimit: 100, hardLimit: 180, collapsedLines: 2 });
    expect(NOTE_FIELD_DISPLAY_CONFIG.rideApp).toMatchObject({ softLimit: 50, hardLimit: 80, collapsedLines: 1 });
    expect(NOTE_FIELD_DISPLAY_CONFIG.negotiatePrice).toMatchObject({ softLimit: 100, hardLimit: 180, collapsedLines: 2 });
  });

  test("maps current schema keys to the appropriate rule and input control", () => {
    expect(resolveNoteFieldDisplayRule("shoreLeave.price")).toBe(NOTE_FIELD_DISPLAY_CONFIG.price);
    expect(resolveNoteFieldDisplayRule("physicalSim.fairPrice")).toBe(NOTE_FIELD_DISPLAY_CONFIG.price);
    expect(resolveNoteFieldDisplayRule("shoreLeave.pickup")).toBe(NOTE_FIELD_DISPLAY_CONFIG.pickupPoint);
    expect(resolveNoteFieldDisplayRule("shoreLeave.rideApp")).toBe(NOTE_FIELD_DISPLAY_CONFIG.rideApp);
    expect(resolveNoteFieldDisplayRule("shoreLeave.agreeFare")).toBe(NOTE_FIELD_DISPLAY_CONFIG.negotiatePrice);
    expect(resolveNoteFieldDisplayRule("general.avoid").inputControl).toBe("textarea");
    expect(resolveNoteFieldDisplayRule("esim.signal").inputControl).toBe("input");
  });

  test("treats soft limits as guidance and hard limits as validation", () => {
    const rule = NOTE_FIELD_DISPLAY_CONFIG.pickupPoint;
    expect(shouldShowNoteFieldGuidance("x".repeat(rule.softLimit), rule)).toBe(false);
    expect(shouldShowNoteFieldGuidance("x".repeat(rule.softLimit + 1), rule)).toBe(true);
    expect(isNoteFieldWithinHardLimit("x".repeat(rule.hardLimit), rule)).toBe(true);
    expect(isNoteFieldWithinHardLimit("x".repeat(rule.hardLimit + 1), rule)).toBe(false);
  });

  test("counts user-perceived Unicode code points and never truncates old content", () => {
    const oldContent = "🚢".repeat(181);
    const rule = NOTE_FIELD_DISPLAY_CONFIG.avoid;
    expect(noteFieldCharacterCount(oldContent)).toBe(181);
    expect(isNoteFieldWithinHardLimit(oldContent, rule)).toBe(false);
    expect(shouldOfferNoteFieldExpansion(oldContent, rule)).toBe(true);
    expect(oldContent).toHaveLength(362);
  });
});
