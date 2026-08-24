import type { PortHeroMediaReadModel } from "../../types";
import type {
  PortHeroMediaRequest,
  PortMediaRepository,
  RequestOptions,
} from "../contracts";
import { withAbort } from "../request-utils";

interface PublishedHeroMedia extends PortHeroMediaReadModel {
  readonly publicationStatus: "approved";
  readonly portIds: readonly string[];
  readonly portSlugs: readonly string[];
}

interface PortHeroMediaManifest {
  readonly schemaVersion: "port-hero-media-manifest.v1";
  readonly assets: readonly PublishedHeroMedia[];
}

export interface StaticPortMediaRepositoryOptions {
  readonly manifestPath?: string;
  readonly fetcher?: typeof fetch;
}

function isPublishedHeroMedia(value: unknown): value is PublishedHeroMedia {
  if (!value || typeof value !== "object") {
    return false;
  }
  const media = value as Partial<PublishedHeroMedia>;
  return (
    media.publicationStatus === "approved" &&
    typeof media.id === "string" &&
    typeof media.portUnLocode === "string" &&
    Array.isArray(media.portIds) &&
    media.portIds.every((item) => typeof item === "string") &&
    Array.isArray(media.portSlugs) &&
    media.portSlugs.every((item) => typeof item === "string") &&
    typeof media.contextLabel === "string" &&
    typeof media.objectPosition === "string" &&
    Array.isArray(media.variants) &&
    media.variants.length > 0 &&
    media.variants.every(
      (variant) =>
        typeof variant.src === "string" &&
        variant.src.startsWith("/media/ports/") &&
        variant.mediaType === "image/jpeg" &&
        Number.isSafeInteger(variant.width) &&
        Number.isSafeInteger(variant.height) &&
        Number.isSafeInteger(variant.byteSize) &&
        /^[a-f0-9]{64}$/.test(variant.sha256),
    ) &&
    typeof media.attribution?.creator === "string" &&
    media.attribution.sourcePageUrl.startsWith("https://") &&
    media.attribution.licenseUrl.startsWith("https://")
  );
}

function isManifest(value: unknown): value is PortHeroMediaManifest {
  if (!value || typeof value !== "object") {
    return false;
  }
  const manifest = value as Partial<PortHeroMediaManifest>;
  return (
    manifest.schemaVersion === "port-hero-media-manifest.v1" &&
    Array.isArray(manifest.assets) &&
    manifest.assets.every(isPublishedHeroMedia)
  );
}

function matchesPort(
  media: PublishedHeroMedia,
  request: PortHeroMediaRequest,
): boolean {
  const locode = request.portUnLocode?.toUpperCase();
  return (
    media.portIds.includes(request.portId) ||
    media.portSlugs.includes(request.portSlug) ||
    Boolean(locode && media.portUnLocode === locode)
  );
}

export class StaticPortMediaRepository implements PortMediaRepository {
  readonly #manifestPath: string;
  readonly #fetcher: typeof fetch;
  #manifestPromise?: Promise<PortHeroMediaManifest>;

  constructor(options: StaticPortMediaRepositoryOptions = {}) {
    this.#manifestPath =
      options.manifestPath ?? "/media/ports/manifest.json";
    this.#fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
  }

  async getHero(
    request: PortHeroMediaRequest,
    options: RequestOptions = {},
  ): Promise<PortHeroMediaReadModel | undefined> {
    const manifest = await withAbort(this.#manifest(), options.signal);
    const exactContext = manifest.assets.find(
      (media) =>
        matchesPort(media, request) &&
        media.contextSlug === request.contextSlug,
    );
    if (exactContext) {
      return exactContext;
    }

    if (request.contextSlug) {
      return undefined;
    }
    return manifest.assets.find(
      (media) => matchesPort(media, request) && !media.contextSlug,
    );
  }

  #manifest(): Promise<PortHeroMediaManifest> {
    if (this.#manifestPromise) {
      return this.#manifestPromise;
    }
    const operation = this.#fetcher(this.#manifestPath).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Port media manifest failed: ${response.status}`);
      }
      const manifest: unknown = await response.json();
      if (!isManifest(manifest)) {
        throw new Error("Unsupported port media manifest");
      }
      return manifest;
    });
    this.#manifestPromise = operation;
    operation.catch(() => {
      if (this.#manifestPromise === operation) {
        this.#manifestPromise = undefined;
      }
    });
    return operation;
  }
}
