import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202609030005_feedback_visibility_antispam_v1.sql"),
  "utf8",
);
const baseSql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202609030001_note_trust_feedback_v1.sql"),
  "utf8",
);

describe("feedback visibility and anti-spam V1 migration", () => {
  test("publishes normal feedback and exposes approved rows beyond their author", () => {
    expect(sql).toContain("alter column status set default 'approved'");
    expect(sql).toMatch(/insert into public\.note_feedback[\s\S]*?'approved'/u);
    expect(sql).toContain("item.status = 'approved'");
    expect(sql).toContain("or item.user_id = auth.uid()");
    expect(sql).toContain("or public.current_app_role() in ('admin', 'moderator')");
    expect(sql).not.toMatch(/item\.status = 'approved'\s+and\s+item\.user_id = auth\.uid\(\)/u);
  });

  test("serializes submissions and returns an existing row before anti-spam checks on retry", () => {
    const lock = sql.indexOf("feedback-submit:");
    const idempotencyLookup = sql.indexOf("idempotency_key = p_idempotency_key", lock);
    const duplicateCheck = sql.indexOf("feedback_duplicate", idempotencyLookup);
    expect(lock).toBeGreaterThan(-1);
    expect(idempotencyLookup).toBeGreaterThan(lock);
    expect(duplicateCheck).toBeGreaterThan(idempotencyLookup);
    expect(sql).toContain("feedback_idempotency_key_reused");
    expect(baseSql).toContain("unique (user_id, idempotency_key)");
  });

  test("enforces cooldown and both rolling limits per user", () => {
    expect(sql).toContain("interval '20 seconds'");
    expect(sql).toContain("interval '10 minutes'");
    expect(sql).toContain("if v_count >= 5");
    expect(sql).toContain("interval '60 minutes'");
    expect(sql).toContain("if v_count >= 20");
  });

  test("blocks only same-user, same-note normalized duplicates for 24 hours", () => {
    expect(sql).toContain("lower(regexp_replace(v_body, '[[:space:]]+', ' ', 'g'))");
    expect(sql).toMatch(/where user_id = auth\.uid\(\) and note_id = p_note_id[\s\S]*?normalized_body = v_normalized_body[\s\S]*?interval '24 hours'/u);
    expect(sql).toContain("note_feedback_user_note_duplicate");
    expect(sql).not.toMatch(/delete\s+from\s+public\.note_feedback/iu);
  });

  test("keeps direct table writes revoked and does not award XP", () => {
    expect(sql).not.toContain("grant insert on public.note_feedback");
    expect(sql).not.toContain("apply_xp_event");
  });
});
