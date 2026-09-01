import { describe, expect, test } from "vitest";

import { mapPortNote } from "./supabase-port-notes-repository";

const note = {
  id: "note-1",
  port_key: "busan",
  topic: "esim",
  visibility: "public",
  moderation_state: "approved",
  summary: "Staff-authored note",
  details: {},
  public_alias: "HarborChief",
  contact_is_public_business: false,
  created_at: "2026-09-01T00:00:00Z",
  accuracy: {},
};

describe("Supabase Port Note identity mapping", () => {
  test.each(["admin", "moderator"] as const)("accepts allowlisted %s Staff identity", (authorStaffTitle) => {
    expect(mapPortNote({ ...note, author_staff_title: authorStaffTitle }).authorStaffTitle).toBe(authorStaffTitle);
  });

  test.each(["member", "founder", "ops", "ADMIN", true, null])("rejects non-authoritative Staff identity %s", (authorStaffTitle) => {
    expect(mapPortNote({ ...note, author_staff_title: authorStaffTitle }).authorStaffTitle).toBeUndefined();
  });

  test("falls back safely when an older backend omits Staff identity", () => {
    expect(mapPortNote(note).authorStaffTitle).toBeUndefined();
  });
});
