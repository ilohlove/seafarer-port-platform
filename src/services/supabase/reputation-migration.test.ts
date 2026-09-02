import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/202609020001_reputation_xp_v1.sql"), "utf8");
const trustV1Sql = readFileSync(resolve(process.cwd(), "supabase/migrations/202609030001_note_trust_feedback_v1.sql"), "utf8");

describe("CrewPort reputation migration contract", () => {
  test("uses an append-only ledger and cached non-negative balance", () => {
    expect(sql).toContain("create table if not exists public.xp_ledger_entries");
    expect(sql).toContain("dedupe_key text not null unique");
    expect(sql).toContain("current_xp integer not null default 0 check (current_xp >= 0)");
    expect(sql).toContain("-least(v_balance, abs(p_requested_amount))");
    expect(sql).toContain("revoke all on public.xp_rule_definitions");
  });

  test("locks the approved V1 economy", () => {
    expect(sql).toContain("('approved_note', 100");
    expect(sql).toContain("('community_confirmed', 50");
    expect(sql).toContain("('accepted_correction', 30");
    expect(sql).toContain("('verified_confirmation', 10, 3, 24");
    expect(trustV1Sql).toContain("where event_type = 'highly_useful'");
    expect(trustV1Sql).toContain("set enabled = false");
  });

  test("requires three recent independent direct verifications", () => {
    expect(sql).toContain("a.confirmation_source = 'direct'");
    expect(sql).toContain("a.verified_at >= now() - interval '3 months'");
    expect(sql).toContain("if public.xp_system_is_live() and v_count >= 3");
    expect(sql).toContain("concat('confirmation:', auth.uid(), ':', p_note_id)");
  });

  test("keeps immutable revisions and separates natural updates from abuse", () => {
    expect(sql).toContain("create table if not exists public.note_revisions");
    expect(sql).toContain("confirmation_epoch = confirmation_epoch + case when p_impact = 'material' then 1 else 0 end");
    expect(sql).toContain("create or replace function public.apply_reputation_action");
    expect(sql).toContain("serious_fraud");
  });

  test("backfill excludes legacy confirmations and imported content by construction", () => {
    expect(sql).toContain("n.content_origin = 'user'");
    expect(sql).toContain("m.next_state = 'approved'");
    expect(sql).toContain("a.confirmation_source = 'direct'");
    expect(sql).toContain("FOUNDING_CONTRIBUTOR");
  });
});
