import type {
  KnowledgeBlock,
  KnowledgeMeta,
  PortHubReadModel,
  PortSearchHit,
  PortSearchMatch,
  PortSearchMatchKind,
  PortSearchResult,
  PortSummary,
  TrustEvidence,
} from "../../types";
import type {
  PortHubRequest,
  PortRepository,
  PortSearchRequest,
  RequestOptions,
} from "../contracts";
import { withAbort } from "../request-utils";

const DEFAULT_SEARCH_LIMIT = 20;
const MAX_SEARCH_LIMIT = 50;
const SEARCH_STOP_WORDS = new Set([
  "cang",
  "gate",
  "harbor",
  "harbour",
  "of",
  "port",
  "terminal",
]);

interface DirectoryManifest {
  readonly schemaVersion: "port-search-manifest.v1";
  readonly datasetVersion: string;
  readonly retrievedAt: string;
  readonly minimumQueryLength: number;
  readonly routing: {
    readonly strategy: "fnv1a-8";
    readonly prefixLength: number;
    readonly bucketCount: number;
  };
  readonly shards: Readonly<
    Record<
      string,
      {
        readonly path: string;
        readonly recordCount: number;
      }
    >
  >;
}

interface DirectoryPortRecord {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly countryCode: string;
  readonly countryName: string;
  readonly unLocode: string;
  readonly sourceStatus: string;
  readonly confidence: "official" | "reference" | "pending";
  readonly searchValues: readonly string[];
}

interface DirectoryShard {
  readonly schemaVersion: "port-search-shard.v1";
  readonly datasetVersion: string;
  readonly key: string;
  readonly items: readonly DirectoryPortRecord[];
}

interface RankedDirectoryHit {
  readonly record: DirectoryPortRecord;
  readonly score: number;
  readonly match: PortSearchMatch;
}

export interface StaticPortDirectoryRepositoryOptions {
  readonly manifestPath?: string;
  readonly fetcher?: typeof fetch;
}

export function normalizeDirectorySearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[đĐ]/gu, "d")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
}

export function directorySearchShardKey(prefix: string): string {
  let hash = 0x811c9dc5;
  for (const character of prefix) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash & 0xff).toString(16).padStart(2, "0");
}

function trustForRecord(record: DirectoryPortRecord): TrustEvidence {
  return {
    basis: record.confidence === "official" ? "official" : "unverified",
    conflictState: "none",
    confirmationCount: 0,
  };
}

function portSummary(record: DirectoryPortRecord): PortSummary {
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    country: { code: record.countryCode, name: record.countryName },
    unLocode: record.unLocode,
    terminalNames: [],
    aliases: record.aliases,
    trust: trustForRecord(record),
  };
}

function queryTokens(query: string): readonly string[] {
  const allTokens = normalizeDirectorySearchText(query).split(" ").filter(Boolean);
  const significant = allTokens.filter((token) => !SEARCH_STOP_WORDS.has(token));
  return significant.length > 0 ? significant : allTokens;
}

function matchKindForValue(
  record: DirectoryPortRecord,
  value: string,
): PortSearchMatchKind {
  if (value === normalizeDirectorySearchText(record.unLocode)) {
    return "unLocode";
  }
  if (value === normalizeDirectorySearchText(record.name)) {
    return "portName";
  }
  if (record.aliases.some((alias) => normalizeDirectorySearchText(alias) === value)) {
    return "alias";
  }
  if (
    value === normalizeDirectorySearchText(record.countryName) ||
    value === normalizeDirectorySearchText(record.countryCode)
  ) {
    return "country";
  }
  return "portName";
}

function displayValueForMatch(
  record: DirectoryPortRecord,
  kind: PortSearchMatchKind,
  normalizedValue: string,
): string {
  if (kind === "unLocode") {
    return record.unLocode;
  }
  if (kind === "country") {
    return normalizedValue === normalizeDirectorySearchText(record.countryCode)
      ? record.countryCode
      : record.countryName;
  }
  if (kind === "alias") {
    return (
      record.aliases.find(
        (alias) => normalizeDirectorySearchText(alias) === normalizedValue,
      ) ?? record.name
    );
  }
  return record.name;
}

function rankRecord(
  record: DirectoryPortRecord,
  normalizedQuery: string,
  tokens: readonly string[],
): RankedDirectoryHit | undefined {
  const compactQuery = normalizedQuery.replaceAll(" ", "");
  const normalizedLocode = normalizeDirectorySearchText(record.unLocode);
  const candidateValues = record.searchValues;
  let score = 0;
  let matchedValue = normalizeDirectorySearchText(record.name);

  if (normalizedLocode === compactQuery) {
    score = 1000;
    matchedValue = normalizedLocode;
  } else {
    for (const value of candidateValues) {
      let candidateScore = 0;
      const kind = matchKindForValue(record, value);
      if (value === normalizedQuery) {
        candidateScore =
          kind === "portName"
            ? 900
            : kind === "alias"
              ? 850
              : kind === "country"
                ? 600
                : 800;
      } else if (value.startsWith(normalizedQuery)) {
        candidateScore = kind === "portName" ? 750 : 700;
      } else if (value.includes(normalizedQuery)) {
        candidateScore = 500;
      }
      if (candidateScore > score) {
        score = candidateScore;
        matchedValue = value;
      }
    }
  }

  const searchableText = candidateValues.join(" ");
  if (tokens.length > 0 && tokens.every((token) => searchableText.includes(token))) {
    score = Math.max(score, 450 + tokens.length);
  }
  if (score === 0) {
    return undefined;
  }

  const kind = matchKindForValue(record, matchedValue);
  const confidenceBonus =
    record.confidence === "official" ? 20 : record.confidence === "reference" ? 10 : 0;
  return {
    record,
    score: score + confidenceBonus,
    match: {
      kind,
      value: displayValueForMatch(record, kind, matchedValue),
    },
  };
}

function emptyMeta(port: PortSummary, datasetVersion: string): KnowledgeMeta {
  return {
    source: {
      id: `unlocode-${datasetVersion}`,
      name: `UN/LOCODE ${datasetVersion.replace("unlocode-", "")}`,
      kind: "official",
      url: "https://unlocode.unece.org/publications/",
    },
    scope: { kind: "port", referenceId: port.id, label: port.name },
    version: datasetVersion,
    validFrom: "2026-01-15",
    trustBasis: "unverified",
    moderationStatus: "needsReview",
    confirmationCount: 0,
    conflictState: "none",
    auditHistory: [],
  };
}

function emptyBlock(
  id: string,
  port: PortSummary,
  datasetVersion: string,
): KnowledgeBlock {
  return {
    id: `${port.id}-${id}`,
    label: "",
    summary: "",
    details: [],
    meta: emptyMeta(port, datasetVersion),
  };
}

function directoryPortHub(
  record: DirectoryPortRecord,
  datasetVersion: string,
): PortHubReadModel {
  const port = portSummary(record);
  const shoreLeave = emptyBlock("shore-leave", port, datasetVersion);
  const requiredDocuments = emptyBlock("required-documents", port, datasetVersion);
  const terminalAccess = emptyBlock("terminal-access", port, datasetVersion);
  const returnToShip = emptyBlock("return-to-ship", port, datasetVersion);
  const bestOption = emptyBlock("internet", port, datasetVersion);
  const trust: TrustEvidence = {
    basis: "unverified",
    conflictState: "none",
    confirmationCount: 0,
  };

  return {
    port,
    terminals: [],
    criticalInformation: [],
    quickBrief: [],
    overview: { decisionSummary: "", items: [] },
    access: {
      shoreLeave,
      requiredDocuments,
      terminalAccess,
      transport: [],
      returnToShip,
    },
    internet: {
      bestOption,
      mobileOperators: [],
      esimProducts: [],
      physicalSim: [],
      wifi: [],
    },
    services: { categories: [] },
    emergencyContacts: [],
    welfareProviders: [],
    welfareServices: [],
    community: {
      reviews: [],
      notes: [],
      openConfirmationCount: 0,
      contributionPrompt: "",
    },
    dataHealth: {
      coverage: "limited",
      missingAreas: ["terminal", "gate", "port-notes"],
      conflictingAreas: [],
      trust,
    },
  };
}

export class StaticPortDirectoryRepository implements PortRepository {
  readonly #manifestPath: string;
  readonly #fetcher: typeof fetch;
  readonly #cache = new Map<string, Promise<unknown>>();

  constructor(
    private readonly detailRepository: PortRepository,
    options: StaticPortDirectoryRepositoryOptions = {},
  ) {
    this.#manifestPath =
      options.manifestPath ?? "/data/port-master/manifest.json";
    this.#fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
  }

  async search(
    request: PortSearchRequest,
    options: RequestOptions = {},
  ): Promise<PortSearchResult> {
    const fallbackPromise = this.detailRepository.search(request, options);
    let directoryResult: PortSearchResult | undefined;
    let directoryError: unknown;
    try {
      directoryResult = await withAbort(this.#searchDirectory(request), options.signal);
    } catch (error) {
      directoryError = error;
    }
    const fallback = await fallbackPromise;

    if (!directoryResult) {
      if (fallback.items.length > 0 || request.query.trim().length < 2) {
        return fallback;
      }
      throw directoryError;
    }

    const requestedLimit = Math.min(
      Math.max(1, request.limit ?? DEFAULT_SEARCH_LIMIT),
      MAX_SEARCH_LIMIT,
    );
    const merged = new Map<string, PortSearchHit>();
    for (const hit of [...fallback.items, ...directoryResult.items]) {
      const key = hit.port.unLocode ?? hit.port.id;
      if (!merged.has(key)) {
        merged.set(key, hit);
      }
    }
    const directoryKeys = new Set(
      directoryResult.items.map((hit) => hit.port.unLocode ?? hit.port.id),
    );
    const fallbackOnlyCount = fallback.items.filter(
      (hit) => !directoryKeys.has(hit.port.unLocode ?? hit.port.id),
    ).length;
    return {
      items: [...merged.values()].slice(0, requestedLimit),
      total: directoryResult.total + fallbackOnlyCount,
      normalizedQuery: directoryResult.normalizedQuery,
    };
  }

  async getPortHub(
    request: PortHubRequest,
    options: RequestOptions = {},
  ): Promise<PortHubReadModel | undefined> {
    const detail = await this.detailRepository.getPortHub(request, options);
    if (detail) {
      return detail;
    }
    const match = await withAbort(
      this.#findDirectoryRecord(request.portSlug),
      options.signal,
    );
    if (!match) {
      return undefined;
    }
    const manifest = await this.#manifest();
    return directoryPortHub(match, manifest.datasetVersion);
  }

  async getPortHubById(
    portId: string,
    terminalId?: string,
    options: RequestOptions = {},
  ): Promise<PortHubReadModel | undefined> {
    const detail = await this.detailRepository.getPortHubById(
      portId,
      terminalId,
      options,
    );
    if (detail) {
      return detail;
    }
    const locode = portId.startsWith("port-unlocode-")
      ? portId.slice("port-unlocode-".length)
      : portId;
    const match = await withAbort(this.#findDirectoryRecord(locode), options.signal);
    if (!match) {
      return undefined;
    }
    const manifest = await this.#manifest();
    return directoryPortHub(match, manifest.datasetVersion);
  }

  async #searchDirectory(request: PortSearchRequest): Promise<PortSearchResult> {
    const normalizedQuery = normalizeDirectorySearchText(request.query);
    const manifest = await this.#manifest();
    if (normalizedQuery.length < manifest.minimumQueryLength) {
      return { items: [], total: 0, normalizedQuery };
    }

    const tokens = queryTokens(request.query);
    const routableTokens = tokens.filter(
      (token) => token.length >= manifest.routing.prefixLength,
    );
    if (routableTokens.length === 0) {
      return { items: [], total: 0, normalizedQuery };
    }
    const token = [...routableTokens].sort((left, right) => {
      const leftKey = directorySearchShardKey(
        left.slice(0, manifest.routing.prefixLength),
      );
      const rightKey = directorySearchShardKey(
        right.slice(0, manifest.routing.prefixLength),
      );
      return (
        (manifest.shards[leftKey]?.recordCount ?? Number.MAX_SAFE_INTEGER) -
        (manifest.shards[rightKey]?.recordCount ?? Number.MAX_SAFE_INTEGER)
      );
    })[0];
    const shardKey = directorySearchShardKey(
      token.slice(0, manifest.routing.prefixLength),
    );
    const descriptor = manifest.shards[shardKey];
    if (!descriptor) {
      return { items: [], total: 0, normalizedQuery };
    }

    const shard = await this.#shard(shardKey, descriptor.path);
    if (shard.datasetVersion !== manifest.datasetVersion) {
      throw new Error("Port directory manifest and shard versions differ");
    }
    const ranked = shard.items
      .map((record) => rankRecord(record, normalizedQuery, tokens))
      .filter((hit): hit is RankedDirectoryHit => Boolean(hit))
      .sort(
        (left, right) =>
          right.score - left.score ||
          left.record.name.localeCompare(right.record.name, "en"),
      );
    const requestedLimit = Math.min(
      Math.max(1, request.limit ?? DEFAULT_SEARCH_LIMIT),
      MAX_SEARCH_LIMIT,
    );
    return {
      items: ranked.slice(0, requestedLimit).map(({ record, match }) => ({
        port: portSummary(record),
        match,
      })),
      total: ranked.length,
      normalizedQuery,
    };
  }

  async #findDirectoryRecord(identifier: string): Promise<DirectoryPortRecord | undefined> {
    const normalized = normalizeDirectorySearchText(identifier);
    if (normalized.length < 2) {
      return undefined;
    }
    const manifest = await this.#manifest();
    const key = directorySearchShardKey(normalized.slice(0, 2));
    const descriptor = manifest.shards[key];
    if (!descriptor) {
      return undefined;
    }
    const shard = await this.#shard(key, descriptor.path);
    return shard.items.find(
      (record) =>
        normalizeDirectorySearchText(record.slug) === normalized ||
        normalizeDirectorySearchText(record.unLocode) === normalized ||
        record.id === identifier,
    );
  }

  #manifest(): Promise<DirectoryManifest> {
    return this.#cached(this.#manifestPath, async () => {
      const response = await this.#fetcher(this.#manifestPath);
      if (!response.ok) {
        throw new Error(`Port directory manifest failed: ${response.status}`);
      }
      const manifest = (await response.json()) as DirectoryManifest;
      if (
        manifest.schemaVersion !== "port-search-manifest.v1" ||
        manifest.routing.strategy !== "fnv1a-8"
      ) {
        throw new Error("Unsupported port directory manifest");
      }
      return manifest;
    });
  }

  #shard(key: string, path: string): Promise<DirectoryShard> {
    return this.#cached(`shard:${key}:${path}`, async () => {
      const response = await this.#fetcher(path);
      if (!response.ok) {
        throw new Error(`Port directory shard ${key} failed: ${response.status}`);
      }
      const shard = (await response.json()) as DirectoryShard;
      if (shard.schemaVersion !== "port-search-shard.v1" || shard.key !== key) {
        throw new Error(`Invalid port directory shard ${key}`);
      }
      return shard;
    });
  }

  #cached<T>(key: string, factory: () => Promise<T>): Promise<T> {
    const existing = this.#cache.get(key);
    if (existing) {
      return existing as Promise<T>;
    }
    const operation = factory();
    this.#cache.set(key, operation);
    operation.catch(() => this.#cache.delete(key));
    return operation;
  }
}
