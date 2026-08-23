import { describe, expect, it } from "vitest";

import { MockPortRepository, normalizeSearchText } from "./mock-port-repository";

describe("MockPortRepository", () => {
  it("normalizes Vietnamese diacritics and searches aliases", async () => {
    const repository = new MockPortRepository(0);

    expect(normalizeSearchText("Cảng Singapore")).toBe("cang singapore");
    const result = await repository.search({ query: "Cang Singapore" });

    expect(result.items.map(({ port }) => port.slug)).toContain("singapore");
  });

  it.each([
    ["Gamman", "busan"],
    ["KRPUS", "busan"],
    ["Malaysia", "port-klang"],
  ])("searches terminal, UN/LOCODE, and country: %s", async (query, slug) => {
    const repository = new MockPortRepository(0);
    const result = await repository.search({ query });

    expect(result.items[0]?.port.slug).toBe(slug);
  });

  it("returns the matched terminal or gate context without inventing result data", async () => {
    const repository = new MockPortRepository(0);

    const terminalResult = await repository.search({ query: "Pasir Panjang" });
    expect(terminalResult.items[0]?.match).toEqual({
      kind: "terminal",
      value: "Pasir Panjang Terminal",
      context: { terminalName: "Pasir Panjang Terminal" },
    });

    const gateResult = await repository.search({ query: "Crew Gate" });
    expect(gateResult.items[0]?.match.kind).toBe("gate");
    expect(gateResult.items[0]?.match.context?.gateName).toBe("Crew Gate");
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
