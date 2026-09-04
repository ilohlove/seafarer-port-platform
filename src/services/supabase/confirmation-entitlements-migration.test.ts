import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202609040003_confirmation_xp_entitlements.sql"),
  "utf8",
);

describe("per-note confirmation XP entitlements migration", () => {
  test("separates permanent user-note entitlement from revision-scoped trust", () => {
    expect(sql).toContain("create table if not exists public.note_confirmation_xp_entitlements");
    expect(sql).toContain("primary key (user_id, note_id)");
    expect(sql).toContain("check (reward_amount in (0, 10))");
    expect(sql).toContain("check (reward_entitled = (reward_amount = 10))");
    expect(sql).toMatch(/note_accuracy_assessments[\s\S]*?assessment_revision = v_note\.confirmation_epoch/iu);
  });

  test("migrates one entitlement per pair without mutating ledger or balances", () => {
    expect(sql).toContain("select user_id, note_id, min(first_confirmed_at)");
    expect(sql).toContain("case when coalesce(history.ever_rewarded, false) then 10 else 0 end");
    expect(sql).toContain("not exists (\n      select 1 from public.xp_ledger_entries reversal where reversal.reversal_of = e.id");
    expect(sql).not.toMatch(/(update|delete\s+from)\s+public\.xp_(ledger_entries|accounts)/iu);
  });

  test("fixes first-confirmation quota at three rewarded entitlements per rolling window", () => {
    expect(sql).toContain("where user_id = auth.uid() and reward_amount = 10");
    expect(sql).toContain("first_confirmed_at > now() - make_interval(hours => coalesce(v_rule.window_hours, 24))");
    expect(sql).toContain("v_count < v_rule.rewarded_limit");
    expect(sql).toContain("v_rule.amount = 10");
  });

  test("awards, revokes and restores the same locked entitlement", () => {
    expect(sql).toContain("case when v_first_entitlement then 'note_confirmation_awarded' else 'note_confirmation_restored' end");
    expect(sql).toContain("v_entitlement.reward_amount = 10");
    expect(sql).toContain("not v_entitlement.reward_active");
    expect(sql).toContain("set reward_active = false, transition_count = transition_count + 1");
    expect(sql).toContain("'note_confirmation_revoked'");
    expect(sql).not.toMatch(/delete\s+from\s+public\.xp_ledger_entries/iu);
  });

  test("serializes state changes and makes request retries idempotent", () => {
    expect(sql.match(/concat\('confirmation-state:', auth\.uid\(\), ':', p_note_id\)/gu)).toHaveLength(2);
    expect(sql.match(/return v_previous_request\.response/gu)).toHaveLength(2);
    expect(sql).toContain("idempotency_key_reused");
    expect(sql).toContain("for update");
  });

  test("preserves current direct trust and one-time Community Confirmed semantics", () => {
    expect(sql).toContain("a.assessment_revision = v_note.confirmation_epoch");
    expect(sql).toContain("a.confirmation_source = 'direct'");
    expect(sql).toContain("a.verified_at >= now() - interval '3 months'");
    expect(sql).toContain("v_count >= 3");
    expect(sql).toContain("concat('community-confirmed:', p_note_id)");
    expect(sql).toContain("confirmation_evidence_disabled");
  });

  test("keeps the entitlement table private and derives identity from auth", () => {
    expect(sql).toContain("alter table public.note_confirmation_xp_entitlements enable row level security");
    expect(sql).toContain("revoke all on public.note_confirmation_xp_entitlements from anon, authenticated");
    expect(sql).not.toMatch(/p_user_id/iu);
  });
});
