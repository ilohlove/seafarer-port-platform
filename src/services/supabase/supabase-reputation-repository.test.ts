import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";
import { mapXpEvent, mapXpLaunchResult, mapXpSystemStatus } from "./supabase-reputation-repository";

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

  test("maps the one-time launch state and backfill result", () => {
    expect(mapXpSystemStatus({ launch_at: "2026-09-02T10:00:00Z" })).toEqual({ launchAt: "2026-09-02T10:00:00Z" });
    expect(mapXpSystemStatus({ launch_at: null })).toEqual({ launchAt: undefined });
    expect(mapXpLaunchResult({
      launch_at: "2026-09-02T10:00:00Z", already_launched: false,
      notes: 4, community_confirmed: 2, founding_contributors: 3,
    })).toEqual({
      launchAt: "2026-09-02T10:00:00Z", alreadyLaunched: false,
      notes: 4, communityConfirmed: 2, foundingContributors: 3,
    });
  });

  test("keeps the active confirmation transport text-only", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/services/supabase/supabase-reputation-repository.ts"),
      "utf8",
    );
    const confirmationMethods = source.slice(
      source.indexOf("async confirmNote(submission"),
      source.indexOf("async submitCorrection(submission"),
    );

    expect(confirmationMethods).toContain('client.rpc("submit_verified_confirmation"');
    expect(confirmationMethods).toContain('client.rpc("revoke_verified_confirmation"');
    expect(confirmationMethods).not.toContain("p_evidence_path");
    expect(confirmationMethods).not.toContain("storage");
    expect(confirmationMethods).not.toContain("File");
  });

  test("uses structured correction submit and field-level review RPCs", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/services/supabase/supabase-reputation-repository.ts"),
      "utf8",
    );
    const correctionStart = source.indexOf("async submitCorrection(submission");
    const correctionMethods = source.slice(correctionStart, source.indexOf("async listAdminLedger(", correctionStart));

    expect(correctionMethods).toContain('client.rpc("submit_structured_note_correction"');
    expect(correctionMethods).toContain("p_changes:");
    expect(correctionMethods).toContain('client.rpc("review_structured_note_correction"');
    expect(correctionMethods).toContain("p_accepted_item_ids:");
    expect(correctionMethods).not.toContain('client.rpc("review_note_correction"');
  });
});
