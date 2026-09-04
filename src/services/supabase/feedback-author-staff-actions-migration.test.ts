import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202609040002_feedback_author_staff_actions.sql"),
  "utf8",
);

describe("feedback ownership and Staff actions migration", () => {
  test("allows only authors to rewrite bodies while preserving Staff soft delete", () => {
    expect(sql.match(/user_id = auth\.uid\(\) or public\.current_app_role\(\) in \('admin', 'moderator'\)/gu)).toHaveLength(1);
    expect(sql).toMatch(/select \* into v_feedback[\s\S]*?and user_id = auth\.uid\(\)[\s\S]*?for update/iu);
    expect(sql).toContain("feedback_author_required");
    expect(sql).toContain("feedback_author_or_staff_required");
    expect(sql).toContain("set deleted_at = now()");
    expect(sql).not.toMatch(/delete\s+from\s+public\.note_feedback/iu);
  });
});
