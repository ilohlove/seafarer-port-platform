import { describe, expect, it } from "vitest";

import { MockPortRepository, normalizeSearchText } from "./mock-port-repository";

describe("MockPortRepository", () => {
  it("normalizes Vietnamese diacritics and searches aliases", async () => {
    const repository = new MockPortRepository(0);

    expect(normalizeSearchText("Cảng Singapore")).toBe("cang singapore");
    const result = await repository.search({ query: "Cang Singapore" });

    expect(result.items.map((port) => port.slug)).toContain("singapore");
  });

  it.each([
    ["Gamman", "busan"],
    ["KRPUS", "busan"],
    ["Malaysia", "port-klang"],
  ])("searches terminal, UN/LOCODE, and country: %s", async (query, slug) => {
    const repository = new MockPortRepository(0);
    const result = await repository.search({ query });

    expect(result.items[0]?.slug).toBe(slug);
  });

  it("preserves fixture terminal context when no terminal is requested", async () => {
    const repository = new MockPortRepository(0);
    const selected = await repository.getPortHub({
      portSlug: "singapore",
      terminalSlug: "pasir-panjang",
    });
    const unselected = await repository.getPortHub({ portSlug: "singapore" });

    expect(selected?.selectedTerminalId).toBe("terminal-sg-pasir-panjang");
    expect(unselected?.selectedTerminalId).toBe("terminal-sg-pasir-panjang");
  });

  it("honors an already-aborted request", async () => {
    const repository = new MockPortRepository(0);
    const controller = new AbortController();
    controller.abort();

    await expect(
      repository.search({ query: "Singapore" }, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
