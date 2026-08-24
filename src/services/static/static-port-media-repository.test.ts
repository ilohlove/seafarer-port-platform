import { describe, expect, it, vi } from "vitest";

import { StaticPortMediaRepository } from "./static-port-media-repository";

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

const hero = {
  id: "hero-test-port-terminal-a",
  publicationStatus: "approved",
  portUnLocode: "ZZTST",
  portIds: ["port-test"],
  portSlugs: ["test-port"],
  contextSlug: "terminal-a",
  contextLabel: "Test Terminal A",
  objectPosition: "50% 50%",
  variants: [
    {
      src: "/media/ports/zztst/hero-960.jpg",
      width: 960,
      height: 540,
      byteSize: 123,
      sha256: "a".repeat(64),
      mediaType: "image/jpeg",
    },
  ],
  attribution: {
    creator: "Example creator",
    provider: "Example provider",
    sourcePageUrl: "https://example.test/source",
    licenseName: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    changes: "Display crop",
  },
} as const;

describe("StaticPortMediaRepository", () => {
  it("returns only approved media for the exact port context", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        schemaVersion: "port-hero-media-manifest.v1",
        assets: [hero],
      }),
    );
    const repository = new StaticPortMediaRepository({
      manifestPath: "/test/media.json",
      fetcher,
    });

    const media = await repository.getHero({
      portId: "port-test",
      portSlug: "test-port",
      portUnLocode: "ZZTST",
      contextSlug: "terminal-a",
    });
    const wrongContext = await repository.getHero({
      portId: "port-test",
      portSlug: "test-port",
      portUnLocode: "ZZTST",
      contextSlug: "terminal-b",
    });

    expect(media?.id).toBe(hero.id);
    expect(media?.variants[0]?.src).toBe(
      "/media/ports/zztst/hero-960.jpg",
    );
    expect(wrongContext).toBeUndefined();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("rejects an unsupported manifest instead of exposing unchecked media", async () => {
    const repository = new StaticPortMediaRepository({
      fetcher: async () =>
        jsonResponse({ schemaVersion: "unknown.v1", assets: [hero] }),
    });

    await expect(
      repository.getHero({
        portId: "port-test",
        portSlug: "test-port",
        contextSlug: "terminal-a",
      }),
    ).rejects.toThrow("Unsupported port media manifest");
  });

  it("rejects media that has not passed the publication gate", async () => {
    const repository = new StaticPortMediaRepository({
      fetcher: async () =>
        jsonResponse({
          schemaVersion: "port-hero-media-manifest.v1",
          assets: [{ ...hero, publicationStatus: "pending" }],
        }),
    });

    await expect(
      repository.getHero({
        portId: "port-test",
        portSlug: "test-port",
        contextSlug: "terminal-a",
      }),
    ).rejects.toThrow("Unsupported port media manifest");
  });
});
