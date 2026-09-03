import { describe, expect, test } from "vitest";

import { mapNoteFeedback, mapPortNote } from "./supabase-port-notes-repository";

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

  test("maps live author XP and note quality metadata", () => {
    const mapped = mapPortNote({
      ...note,
      author_rank: { level: 5, xp: 3_240 },
      highly_useful: true,
      last_verified_at: "2026-09-02T00:00:00Z",
      feedback_change_alert: { feedback_id: "feedback-1" },
    });
    expect(mapped.authorRank).toMatchObject({ level: 5, xp: 3_240 });
    expect(mapped.highlyUseful).toBe(true);
    expect(mapped.lastVerifiedAt).toBe("2026-09-02T00:00:00Z");
    expect(mapped.feedbackChangeAlert).toEqual({ feedbackId: "feedback-1" });
  });

  test("does not invent a change alert when the backend omits it", () => {
    expect(mapPortNote(note).feedbackChangeAlert).toBeUndefined();
  });

  test("restores the viewer confirmation state from the note read model after reload", () => {
    expect(mapPortNote({
      ...note,
      accuracy: { still_correct: 4, changed: 0, not_sure: 0, viewer_answer: "stillCorrect" },
    }).accuracy).toMatchObject({ stillCorrect: 4, viewerAnswer: "stillCorrect" });
  });

  test("maps feedback identity, ownership and correction usage", () => {
    expect(mapNoteFeedback({
      id: "feedback-1", note_id: "note-1", body: "Terminal 2 still has a bus.",
      status: "approved", public_alias: "CaptainSea", author_rank: { xp: 700 },
      author_id: "user-1", used_for_correction: true,
      created_at: "2026-09-02T00:00:00Z", updated_at: "2026-09-02T00:00:00Z",
    })).toMatchObject({ id: "feedback-1", noteId: "note-1", status: "approved", authorId: "user-1", usedForCorrection: true, authorRank: { level: 3 } });
  });
});
