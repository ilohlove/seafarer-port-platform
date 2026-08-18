import {
  mockPortSearchIndex,
  type PortSearchIndexEntry,
} from "../../data/mock/port-search-index";
import type { PortHubReadModel } from "../../types";
import type {
  PortHubRequest,
  PortRepository,
  PortSearchRequest,
  PortSearchResult,
  RequestOptions,
} from "../contracts";
import { delay, withAbort } from "../request-utils";

const DEFAULT_SEARCH_LIMIT = 20;
const MAX_SEARCH_LIMIT = 50;

type ScenarioLoader = () => Promise<PortHubReadModel>;

const loadSingaporeScenario: ScenarioLoader = () =>
  import("../../data/mock/ports/singapore").then(
    ({ singaporeScenario }) => singaporeScenario,
  );

const loadBusanScenario: ScenarioLoader = () =>
  import("../../data/mock/ports/busan").then(({ busanScenario }) => busanScenario);

const loadPortKlangScenario: ScenarioLoader = () =>
  import("../../data/mock/ports/port-klang").then(
    ({ portKlangScenario }) => portKlangScenario,
  );

const scenarioDescriptors = [
  {
    id: "port-singapore",
    normalizedSlug: "singapore",
    load: loadSingaporeScenario,
  },
  {
    id: "port-busan",
    normalizedSlug: "busan",
    load: loadBusanScenario,
  },
  {
    id: "port-klang",
    normalizedSlug: "port klang",
    load: loadPortKlangScenario,
  },
] as const;

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function searchableValues(entry: PortSearchIndexEntry): readonly string[] {
  return [
    entry.port.name,
    ...entry.port.aliases,
    entry.port.country.name,
    entry.port.country.code,
    entry.port.city ?? "",
    entry.port.unLocode ?? "",
    ...entry.terminals.flatMap((terminal) => [
      terminal.name,
      terminal.slug,
      ...terminal.gateNames,
    ]),
  ].map(normalizeSearchText);
}

function scorePort(entry: PortSearchIndexEntry, normalizedQuery: string): number {
  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  let score = 0;

  for (const value of searchableValues(entry)) {
    if (value === normalizedQuery) {
      score = Math.max(score, 100);
    } else if (value.startsWith(normalizedQuery)) {
      score = Math.max(score, 75);
    } else if (value.includes(normalizedQuery)) {
      score = Math.max(score, 50);
    }

    if (queryTokens.length > 0 && queryTokens.every((token) => value.includes(token))) {
      score = Math.max(score, 40 + queryTokens.length);
    }
  }

  return score;
}

function selectTerminal(
  port: PortHubReadModel,
  terminalIdentifier?: string,
): PortHubReadModel | undefined {
  if (!terminalIdentifier) {
    return port;
  }

  const normalizedIdentifier = normalizeSearchText(terminalIdentifier);
  const terminal = port.terminals.find(
    (candidate) =>
      candidate.id === terminalIdentifier ||
      normalizeSearchText(candidate.slug) === normalizedIdentifier,
  );

  return terminal ? { ...port, selectedTerminalId: terminal.id } : undefined;
}

export class MockPortRepository implements PortRepository {
  readonly #promiseCache = new Map<string, Promise<unknown>>();

  constructor(private readonly latencyMs = 80) {}

  search(
    request: PortSearchRequest,
    options: RequestOptions = {},
  ): Promise<PortSearchResult> {
    const normalizedQuery = normalizeSearchText(request.query);
    const requestedLimit = request.limit ?? DEFAULT_SEARCH_LIMIT;
    const limit = Math.min(Math.max(1, requestedLimit), MAX_SEARCH_LIMIT);
    const key = `search:${normalizedQuery}:${limit}`;
    const operation = this.#cached(key, async () => {
      await delay(this.latencyMs);
      if (!normalizedQuery) {
        return { items: [], total: 0, normalizedQuery };
      }

      const matches = mockPortSearchIndex
        .map((entry) => ({ entry, score: scorePort(entry, normalizedQuery) }))
        .filter((candidate) => candidate.score > 0)
        .sort(
          (left, right) =>
            right.score - left.score ||
            left.entry.port.name.localeCompare(right.entry.port.name),
        );

      return {
        items: matches.slice(0, limit).map(({ entry }) => entry.port),
        total: matches.length,
        normalizedQuery,
      } satisfies PortSearchResult;
    });

    return withAbort(operation, options.signal);
  }

  getPortHub(
    request: PortHubRequest,
    options: RequestOptions = {},
  ): Promise<PortHubReadModel | undefined> {
    const key = `hub:slug:${request.portSlug}:${request.terminalSlug ?? ""}`;
    const operation = this.#cached(key, async () => {
      const normalizedSlug = normalizeSearchText(request.portSlug);
      const descriptor = scenarioDescriptors.find(
        (candidate) => candidate.normalizedSlug === normalizedSlug,
      );
      const [, port] = await Promise.all([
        delay(this.latencyMs),
        descriptor?.load(),
      ]);
      return port ? selectTerminal(port, request.terminalSlug) : undefined;
    });

    return withAbort(operation, options.signal);
  }

  getPortHubById(
    portId: string,
    terminalId?: string,
    options: RequestOptions = {},
  ): Promise<PortHubReadModel | undefined> {
    const key = `hub:id:${portId}:${terminalId ?? ""}`;
    const operation = this.#cached(key, async () => {
      const descriptor = scenarioDescriptors.find(
        (candidate) => candidate.id === portId,
      );
      const [, port] = await Promise.all([
        delay(this.latencyMs),
        descriptor?.load(),
      ]);
      return port ? selectTerminal(port, terminalId) : undefined;
    });

    return withAbort(operation, options.signal);
  }

  #cached<T>(key: string, factory: () => Promise<T>): Promise<T> {
    const cached = this.#promiseCache.get(key);
    if (cached) {
      return cached as Promise<T>;
    }

    const operation = factory();
    this.#promiseCache.set(key, operation);
    operation.catch(() => this.#promiseCache.delete(key));
    return operation;
  }
}
