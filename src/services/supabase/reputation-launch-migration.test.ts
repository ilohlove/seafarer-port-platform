import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/202609020002_reputation_launch_control.sql"), "utf8");

describe("Reputation launch control migration", () => {
  test("keeps status and launch operations admin-only", () => {
    expect(sql).toContain("create or replace function public.get_xp_system_status()");
    expect(sql).toContain("if public.current_app_role() <> 'admin'");
    expect(sql).toContain("revoke execute on function public.get_xp_system_status() from public, anon");
    expect(sql).toContain("revoke execute on function public.launch_xp_system() from public, anon");
  });

  test("serializes launch and refuses to backfill twice", () => {
    expect(sql).toContain("for update");
    expect(sql).toContain("if v_existing_launch is not null then");
    expect(sql).toContain("'already_launched', true");
    expect(sql).toContain("concat('approved-note:', v_note.id)");
    expect(sql).toContain("on conflict (user_id, achievement_key) do nothing");
  });

  test("uses the database clock for the public launch action", () => {
    expect(sql).toContain("select public.launch_xp_system(clock_timestamp())");
  });
});
