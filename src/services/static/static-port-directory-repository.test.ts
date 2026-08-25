import { describe, expect, it, vi } from "vitest";

import type { PortRepository } from "../contracts";
import { MockPortRepository } from "../mock/mock-port-repository";
import {
  StaticPortDirectoryRepository,
  directorySearchShardKey,
} from "./static-port-directory-repository";

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function repositoryFixture(): {
  readonly repository: PortRepository;
} {
  const key = directorySearchShardKey("ex");
  const port = {
    id: "port-unlocode-zzexm",
    slug: "zzexm",
    name: "Example Harbour",
    aliases: ["Example Port"],
    countryCode: "ZZ",
    countryName: "Test Territory",
    unLocode: "ZZEXM",
    sourceStatus: "AA",
    confidence: "official",
    classification: "wpi-confirmed",
    wpiNumbers: ["1000"],
    sourceIds: ["unlocode", "nga-wpi"],
    searchValues: [
      "example harbour",
      "example port",
      "test territory",
      "zz",
      "zzexm",
      "zz exm",
    ],
  } as const;
  const manifest = {
    schemaVersion: "port-search-manifest.v1",
    classifierVersion: "port-classifier.v2",
    datasetVersion: "unlocode-test",
    retrievedAt: "2026-08-24T00:00:00.000Z",
    minimumQueryLength: 2,
    routing: { strategy: "fnv1a-8", prefixLength: 2, bucketCount: 256 },
    shards: {
      [key]: { path: `/test/${key}.json`, recordCount: 1 },
      [directorySearchShardKey("zz")]: {
        path: `/test/${directorySearchShardKey("zz")}.json`,
        recordCount: 1,
      },
    },
  } as const;
  const fetcher = vi.fn<typeof fetch>(async (input) => {
    const path = String(input);
    if (path === "/test/manifest.json") {
      return jsonResponse(manifest);
    }
    if (path.startsWith("/test/")) {
      const shardKey = path.replace("/test/", "").replace(".json", "");
      return jsonResponse({
        schemaVersion: "port-search-shard.v1",
        datasetVersion: "unlocode-test",
        key: shardKey,
        items: [port],
      });
    }
    return new Response(null, { status: 404 });
  });
  return {
    repository: new StaticPortDirectoryRepository(new MockPortRepository(0), {
      manifestPath: "/test/manifest.json",
      fetcher,
    }),
  };
}

describe("StaticPortDirectoryRepository", () => {
  it("finds an authoritative directory port by name and UN/LOCODE", async () => {
    const { repository } = repositoryFixture();
    const byName = await repository.search({ query: "Example", limit: 6 });
    const byCode = await repository.search({ query: "ZZ EXM", limit: 6 });

    expect(byName.items[0]?.port.name).toBe("Example Harbour");
    expect(byName.items[0]?.match.kind).toBe("portName");
    expect(byCode.items[0]?.port.unLocode).toBe("ZZEXM");
    expect(byCode.items[0]?.match.kind).toBe("unLocode");
  });

  it("keeps terminal and gate matches from the curated repository", async () => {
    const { repository } = repositoryFixture();
    const result = await repository.search({ query: "Crew Gate", limit: 6 });

    expect(result.items.some((hit) => hit.match.kind === "gate")).toBe(true);
  });

  it("returns an honest limited-data hub for a directory-only port", async () => {
    const { repository } = repositoryFixture();
    const hub = await repository.getPortHub({ portSlug: "zzexm" });

    expect(hub?.port.unLocode).toBe("ZZEXM");
    expect(hub?.dataHealth.coverage).toBe("limited");
    expect(hub?.terminals).toEqual([]);
    expect(hub?.community.notes).toEqual([]);
  });

  it("fails closed when the directory lacks the WPI classifier gate", async () => {
    const repository = new StaticPortDirectoryRepository(new MockPortRepository(0), {
      manifestPath: "/unsafe/manifest.json",
      fetcher: async () =>
        jsonResponse({
          schemaVersion: "port-search-manifest.v1",
          datasetVersion: "unlocode-only",
          retrievedAt: "2026-08-24T00:00:00.000Z",
          minimumQueryLength: 2,
          routing: { strategy: "fnv1a-8", prefixLength: 2, bucketCount: 256 },
          shards: {},
        }),
    });

    await expect(repository.search({ query: "Unsafe Harbour" })).rejects.toThrow(
      "Unsupported port directory manifest",
    );
  });
});
