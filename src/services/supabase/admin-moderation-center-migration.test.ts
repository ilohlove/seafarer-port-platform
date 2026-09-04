import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/202609040004_admin_moderation_center.sql"), "utf8");

describe("Admin Moderation Center migration", () => {
  test("uses staff-gated bounded cursor pagination and factual signals", () => {
    expect(sql).toContain("list_feedback_moderation_queue_v2");
    expect(sql).toContain("least(greatest(coalesce(p_limit, 25), 1), 50)");
    expect(sql).toContain("(f.created_at, f.id)");
    expect(sql).toContain("char_length(trim(f.body)) <= 12");
    expect(sql).toContain("current_app_role() not in ('admin', 'moderator')");
  });

  test("loads moderation context separately and grants only presentation-safe RPCs", () => {
    expect(sql).toContain("get_feedback_moderation_context");
    expect(sql).toContain("public.note_json(v_note)");
    expect(sql).toContain("grant execute on function public.get_feedback_moderation_context(uuid) to authenticated");
    expect(sql).not.toContain("grant select on public.note_feedback");
  });
});
