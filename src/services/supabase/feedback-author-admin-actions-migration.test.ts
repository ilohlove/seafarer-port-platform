import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202609030006_feedback_author_admin_actions.sql"),
  "utf8",
);

describe("feedback author and Admin actions migration", () => {
  test("allows update and soft delete only for the author or Admin", () => {
    expect(sql).toContain("user_id = auth.uid() or public.current_app_role() = 'admin'");
    expect(sql).toContain("feedback_author_or_admin_required");
    expect(sql).not.toContain("public.current_app_role() = 'moderator'");
    expect(sql).toContain("set deleted_at = now()");
    expect(sql).not.toMatch(/delete\s+from\s+public\.note_feedback/iu);
  });
});
