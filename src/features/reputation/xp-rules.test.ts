import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { DEFAULT_XP_RULES } from "./xp-rules";

describe("XP rule fallback", () => {
  test("matches the approved database economy", () => {
    expect(DEFAULT_XP_RULES).toEqual([
      { eventType: "approved_note", amount: 100 },
      { eventType: "community_confirmed", amount: 50 },
      { eventType: "accepted_correction", amount: 30 },
      { eventType: "verified_confirmation", amount: 10, rewardedLimit: 3, windowHours: 24 },
      { eventType: "highly_useful", amount: 50 },
    ]);

    const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/202609020001_reputation_xp_v1.sql"), "utf8");
    for (const rule of DEFAULT_XP_RULES) {
      expect(sql).toContain(`('${rule.eventType}', ${rule.amount}`);
    }
  });
});
