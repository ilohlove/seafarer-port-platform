import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202609030001_note_trust_feedback_v1.sql"),
  "utf8",
);

describe("CrewPort Note Trust and Feedback V1 migration", () => {
  test("retains but deprecates Helpful and its XP rule", () => {
    expect(sql).toContain("set enabled = false");
    expect(sql).toContain("revoke execute on function public.toggle_note_helpful");
    expect(sql).toContain("Deprecated historical V0 data");
    expect(sql).not.toContain("drop table public.note_helpful_votes");
  });

  test("stores only one-level moderated feedback with soft delete", () => {
    expect(sql).toContain("create table if not exists public.note_feedback");
    expect(sql).toContain("deleted_at timestamptz");
    expect(sql).not.toContain("parent_feedback_id");
    expect(sql).toContain("status text not null default 'pending'");
    expect(sql).toContain("update public.note_feedback set deleted_at = now()");
    expect(sql).not.toMatch(/apply_xp_event[\s\S]{0,200}feedback/);
  });

  test("enforces ownership and staff moderation in database functions", () => {
    expect(sql).toContain("where id = p_feedback_id and user_id = auth.uid()");
    expect(sql).toContain("public.current_app_role() not in ('admin', 'moderator')");
    expect(sql).toContain("if v_feedback.user_id = auth.uid() then raise exception 'self_review_not_allowed'");
    expect(sql).toContain("revoke all on public.note_feedback from anon, authenticated");
  });

  test("makes direct confirmation idempotent and quota-safe", () => {
    expect(sql).toContain("if p_source <> 'direct'");
    expect(sql).toContain("assessment_revision = v_note.confirmation_epoch");
    expect(sql).toContain("pg_advisory_xact_lock(hashtextextended('confirmation-xp:'");
    expect(sql).toContain("created_at > now() - make_interval(hours => v_rule.window_hours)");
    expect(sql).toContain("p_verification_period <> 'older'");
  });

  test("supports feedback conversion and transport corrections", () => {
    expect(sql).toContain("'transport', 'other'");
    expect(sql).toContain("submit_note_correction_from_feedback");
    expect(sql).toContain("used_by_correction_id = new.id");
  });

  test("supports lazy feedback paging and a presentation-safe change alert", () => {
    expect(sql).toContain("create or replace function public.get_note_feedback");
    expect(sql).toContain("v_limit integer := least(greatest(coalesce(p_limit, 2), 1), 20)");
    expect(sql).toContain("'feedback_change_alert'");
    expect(sql).toContain("c.source_feedback_id::text");
    expect(sql).toContain("c.status = 'pending'");
  });

  test("projects feedback count without Helpful data", () => {
    const projection = sql.slice(sql.lastIndexOf("create or replace function public.note_json"));
    expect(projection).toContain("'feedback_count'");
    expect(projection).toContain("'feedback_change_alert'");
    expect(projection).not.toContain("'helpful_count'");
    expect(projection).not.toContain("'highly_useful'");
  });
});
