import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202609030002_note_field_limits_v1.sql"),
  "utf8",
);

describe("Port Note field limits migration", () => {
  test("validates only new RPC submissions and preserves existing rows", () => {
    expect(sql).toContain("create or replace function public.submit_port_note");
    expect(sql).toContain("not between 1 and 800");
    expect(sql).toContain("note_detail_too_long");
    expect(sql).not.toContain("alter table public.port_notes");
    expect(sql).not.toMatch(/update\s+public\.port_notes\s+set\s+summary/iu);
  });

  test("matches short and descriptive detail hard limits", () => {
    for (const shortField of ["price", "fairprice", "goodprice", "cost", "rideapp"]) {
      expect(sql).toContain(`when '${shortField}' then 80`);
    }
    expect(sql).toContain("else 180");
    expect(sql).toContain("note_contact_too_long");
  });

  test("rejects malformed JSON values and keeps authenticated-only execution", () => {
    expect(sql).toContain("jsonb_typeof(coalesce(p_details");
    expect(sql).toContain("jsonb_typeof(detail.value) <> 'string'");
    expect(sql).toContain("revoke execute on function public.submit_port_note");
    expect(sql).toContain("grant execute on function public.submit_port_note");
    expect(sql).toContain("to authenticated");
  });
});
