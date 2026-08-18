import { describe, expect, it, vi } from "vitest";

const moduleLoads = vi.hoisted(() => ({
  searchIndex: 0,
  singapore: 0,
  busan: 0,
  portKlang: 0,
}));

vi.mock("../../data/mock/port-search-index", async (importOriginal) => {
  moduleLoads.searchIndex += 1;
  return importOriginal<typeof import("../../data/mock/port-search-index")>();
});

vi.mock("../../data/mock/ports/singapore", async (importOriginal) => {
  moduleLoads.singapore += 1;
  return importOriginal<typeof import("../../data/mock/ports/singapore")>();
});

vi.mock("../../data/mock/ports/busan", async (importOriginal) => {
  moduleLoads.busan += 1;
  return importOriginal<typeof import("../../data/mock/ports/busan")>();
});

vi.mock("../../data/mock/ports/port-klang", async (importOriginal) => {
  moduleLoads.portKlang += 1;
  return importOriginal<typeof import("../../data/mock/ports/port-klang")>();
});

import { MockPortRepository } from "./mock-port-repository";

describe("MockPortRepository fixture loading", () => {
  it("keeps the search index eager and loads only the requested detail scenario", async () => {
    const repository = new MockPortRepository(0);

    expect(moduleLoads).toEqual({
      searchIndex: 1,
      singapore: 0,
      busan: 0,
      portKlang: 0,
    });

    await repository.search({ query: "Singapore" });

    expect(moduleLoads).toEqual({
      searchIndex: 1,
      singapore: 0,
      busan: 0,
      portKlang: 0,
    });

    await repository.getPortHub({ portSlug: "singapore" });

    expect(moduleLoads).toEqual({
      searchIndex: 1,
      singapore: 1,
      busan: 0,
      portKlang: 0,
    });
  });
});
