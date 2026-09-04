import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/202609040001_structured_note_corrections.sql"), "utf8");

describe("structured note corrections migration", () => {
  test("stores field changes and supports partial moderation", () => {
    expect(sql).toContain("create table if not exists public.note_correction_items");
    expect(sql).toContain("'partiallyAccepted'");
    expect(sql).toContain("p_accepted_item_ids uuid[]");
    expect(sql).toContain("case when id = any(p_accepted_item_ids) then 'accepted' else 'rejected' end");
  });

  test("validates topic fields, contact consent, and stale values", () => {
    for (const topic of ["esim", "physicalSim", "shoreLeave", "food", "shopping", "welfare", "general"]) {
      expect(sql).toContain(`p_topic = '${topic}'`);
    }
    expect(sql).toContain("contact_permission_required");
    expect(sql).toContain("correction_stale");
    expect(sql).toContain("v_note.details ? v_key");
    expect(sql).toContain("v_key = 'context'");
  });

  test("creates one complete revision and one deduplicated XP event", () => {
    expect(sql).toContain("insert into public.note_revisions");
    expect(sql).toContain("summary = v_summary, details = v_details");
    expect(sql).toContain("concat('accepted-correction:', v_c.id)");
    expect(sql).toContain("review_idempotency_key = p_idempotency_key");
    expect(sql).toContain("alter table public.note_correction_items enable row level security");
    expect(sql).toContain("revoke all on public.note_correction_items from anon, authenticated");
  });
});
