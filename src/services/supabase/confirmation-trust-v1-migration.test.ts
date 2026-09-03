import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202609030004_confirmation_trust_v1.sql"),
  "utf8",
);

describe("confirmation trust V1 migration", () => {
  test("projects only active, direct confirmations from the current revision and three-month window", () => {
    expect(sql).toContain("a.assessment_revision = p_note.confirmation_epoch");
    expect(sql).toContain("a.is_active and a.answer = 'stillCorrect'");
    expect(sql).toContain("a.confirmation_source = 'direct'");
    expect(sql).toContain("a.verified_at >= now() - interval '3 months'");
    expect(sql).toContain(") >= 3 then 'communityConfirmed'");
  });

  test("derives the latest verification from current confirmations instead of the cached note timestamp", () => {
    expect(sql).toMatch(/'last_verified_at', \(select max\(a\.verified_at\)[\s\S]*?interval '3 months'\)/u);
    expect(sql).not.toContain("'last_verified_at', p_note.last_verified_at");
  });

  test("adds a partial index for the current-trust read path without deleting history", () => {
    expect(sql).toContain("note_accuracy_current_confirmation_idx");
    expect(sql).toContain("where is_active and answer = 'stillCorrect' and confirmation_source = 'direct'");
    expect(sql).not.toMatch(/delete\s+from\s+public\.note_accuracy_assessments/iu);
  });
});
