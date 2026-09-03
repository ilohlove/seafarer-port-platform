import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202609030003_confirmation_toggle_xp_lifecycle.sql"),
  "utf8",
);

describe("confirmation toggle XP lifecycle migration", () => {
  test("keeps one assessment identity and projects only active confirmations", () => {
    expect(sql).toContain("add column if not exists is_active boolean not null default true");
    expect(sql).toContain("add column if not exists reward_entitled boolean not null default false");
    expect(sql).toContain("add column if not exists reward_active boolean not null default false");
    expect(sql).toContain("activation_count integer not null default 1");
    expect(sql).toMatch(/viewer_answer[\s\S]*?assessment_revision = p_note\.confirmation_epoch and a\.is_active/iu);
    expect(sql).toMatch(/still_correct[\s\S]*?a\.is_active and a\.answer = 'stillCorrect'/iu);
  });

  test("serializes transitions and makes repeated confirm or revoke a no-op", () => {
    expect(sql).toContain("confirmation-state:");
    expect(sql).toContain("create table if not exists public.note_confirmation_requests");
    expect(sql).toContain("confirmation-request:");
    expect(sql).toContain("return v_previous_request.response");
    expect(sql).toContain("idempotency_key_reused");
    expect(sql).toContain("v_assessment.note_id is not null and v_assessment.is_active");
    expect(sql).toContain("v_assessment.note_id is null or not v_assessment.is_active");
    expect(sql).not.toContain("v_assessment.id");
    expect(sql).toContain("'duplicate', true");
  });

  test("awards, revokes and restores one entitlement without deleting ledger history", () => {
    expect(sql).toContain("'note_confirmation_awarded'");
    expect(sql).toContain("'note_confirmation_revoked'");
    expect(sql).toContain("'note_confirmation_restored'");
    expect(sql).toContain("-v_assessment.reward_amount");
    expect(sql).toContain("not v_assessment.reward_active");
    expect(sql).toContain("not exists (select 1 from public.xp_ledger_entries r where r.reversal_of = e.id)");
    expect(sql).toContain("reward_amount = case when reward_entitled then v_revoked else 0 end");
    expect(sql).not.toMatch(/delete\s+from\s+public\.xp_ledger_entries/iu);
  });

  test("preserves eligibility and quota while rejecting confirmation evidence", () => {
    expect(sql).toContain("v_eligible := p_verification_period <> 'older'");
    expect(sql).toContain("event_type in ('verified_confirmation', 'note_confirmation_awarded')");
    expect(sql).toContain("v_count < v_rule.rewarded_limit");
    expect(sql).toContain("confirmation_evidence_disabled");
    expect(sql).not.toMatch(/drop\s+(table|column|bucket)/iu);
  });
});
