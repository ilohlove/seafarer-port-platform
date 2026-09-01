import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

const assetDirectory = join(process.cwd(), "src", "assets", "identity");
const frameNames = [
  ...Array.from({ length: 10 }, (_, level) => `rank-lv${level}`),
  "staff-founder",
  "staff-admin",
  "staff-moderator",
  "staff-ops",
  "supporter-bronze",
  "supporter-silver",
  "supporter-gold",
];

describe("identity artwork media gate", () => {
  test("ships both 160px and 320px artwork within the mobile budget", () => {
    const files = readdirSync(assetDirectory).filter((name) => name.endsWith(".webp"));

    for (const name of frameNames) {
      expect(files).toContain(`${name}-160.webp`);
      expect(files).toContain(`${name}-320.webp`);
    }

    for (let level = 0; level < 10; level += 1) {
      const limit = level >= 8 ? 50_000 : 40_000;
      expect(statSync(`${assetDirectory}/rank-lv${level}-320.webp`).size).toBeLessThanOrEqual(limit);
    }

    const totalBytes = files.reduce(
      (total, file) => total + statSync(`${assetDirectory}/${file}`).size,
      0,
    );
    expect(totalBytes).toBeLessThanOrEqual(450_000);
  });
});
