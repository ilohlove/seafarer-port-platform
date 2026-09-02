import { describe, expect, test } from "vitest";
import { mapXpEvent } from "./supabase-reputation-repository";

describe("Supabase reputation mapping", () => {
  test("maps presentation-safe XP activity", () => {
    expect(mapXpEvent({
      id: "event-1", event_type: "approved_note", source_type: "note",
      source_id: "note-1", amount: 100, metadata: { port_key: "KRPUS" },
      created_at: "2026-09-02T00:00:00Z",
    })).toEqual({
      id: "event-1", eventType: "approved_note", sourceType: "note",
      sourceId: "note-1", amount: 100, reasonCode: undefined,
      reasonText: undefined, metadata: { port_key: "KRPUS" },
      createdAt: "2026-09-02T00:00:00Z",
    });
  });

  test("does not expose internal actor or dedupe fields", () => {
    const event = mapXpEvent({ actor_id: "moderator", dedupe_key: "secret", amount: -50 });
    expect(event).not.toHaveProperty("actorId");
    expect(event).not.toHaveProperty("dedupeKey");
  });
});
