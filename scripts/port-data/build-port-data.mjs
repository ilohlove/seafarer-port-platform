import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DATASET_VERSION,
  EXCLUDED_UNLOCODE_STATUSES,
  UNLOCODE_FILES,
  byteMetrics,
  normalizeSearchText,
  parseCsv,
  parseUnlocodeCoordinates,
  searchShardKey,
  slugForPort,
  sourceConfidence,
  stableSortPorts,
  titleCaseCountry,
} from "./port-data-lib.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const rawDirectory = resolve(projectRoot, ".cache/port-master/raw");
const processedDirectory = resolve(projectRoot, ".cache/port-master/processed");
const outputDirectory = resolve(projectRoot, "public/data/port-master");
const expectedOutputParent = `${resolve(projectRoot, "public/data")}${sep}`;

if (!outputDirectory.startsWith(expectedOutputParent)) {
  throw new Error(`Unsafe output directory: ${outputDirectory}`);
}

const headers = [
  "change",
  "country",
  "location",
  "name",
  "nameWoDiacritics",
  "subdivision",
  "function",
  "status",
  "date",
  "iata",
  "coordinates",
  "remarks",
];

function toRecord(row) {
  return Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]));
}

function addAlias(record, value) {
  const alias = value.trim();
  if (!alias || alias === record.name || record.aliases.includes(alias)) {
    return;
  }
  record.aliases.push(alias);
}

function preferredCountryName(code, sourceName) {
  const displayName = new Intl.DisplayNames(["en"], { type: "region" }).of(code);
  if (displayName && displayName !== code) {
    return displayName;
  }
  return titleCaseCountry(sourceName || code);
}

function buildSearchValues(port) {
  return [
    port.name,
    ...port.aliases,
    port.countryName,
    port.countryCode,
    port.unLocode,
    `${port.countryCode} ${port.unLocode.slice(2)}`,
  ]
    .map(normalizeSearchText)
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index);
}

function shardKeys(searchValues) {
  const keys = new Set();
  for (const value of searchValues) {
    for (const token of value.split(" ").filter(Boolean)) {
      if (token.length < 2) {
        continue;
      }
      const prefix = token.slice(0, 2);
      const key = searchShardKey(
        /^[a-z0-9]{2}$/u.test(prefix) ? prefix : "__",
      );
      keys.add(key);
    }
  }
  return keys;
}

function haversineKilometers(left, right) {
  const toRadians = (value) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(right.latitude - left.latitude);
  const longitudeDelta = toRadians(right.longitude - left.longitude);
  const leftLatitude = toRadians(left.latitude);
  const rightLatitude = toRadians(right.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(leftLatitude) *
      Math.cos(rightLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.sqrt(haversine));
}

async function mergeWpiIfAvailable(portsByLocode, sourceManifest, counters) {
  if (sourceManifest.wpi?.availability !== "downloaded") {
    return;
  }

  const path = resolve(rawDirectory, sourceManifest.wpi.fileName);
  const rows = parseCsv(await readFile(path, "utf8"));
  const header = rows.shift() ?? [];
  const fieldIndex = new Map(
    header.map((field, index) => [field.replace(/^\uFEFF/u, "").trim(), index]),
  );
  const field = (row, name) => row[fieldIndex.get(name)]?.trim() ?? "";

  for (const [rowIndex, row] of rows.entries()) {
    counters.wpiRows += 1;
    const unLocode = field(row, "UN/LOCODE").replace(/\s+/gu, "").toUpperCase();
    const port = portsByLocode.get(unLocode);
    if (!port) {
      counters.wpiUnmatched += 1;
      continue;
    }

    counters.wpiMatched += 1;
    const alternateName = field(row, "Alternate Port Name");
    if (alternateName) {
      addAlias(port, alternateName);
    }
    const wpiNumber = field(row, "World Port Index Number");
    if (wpiNumber) {
      port.wpiNumber = wpiNumber;
    }
    port.sourceRefs.push({
      sourceId: "nga-wpi",
      sourceRowId: wpiNumber || `UpdatedPub150.csv:${rowIndex + 2}`,
      sourceUrl: sourceManifest.wpi.sourceUrl,
    });
    const latitude = Number(field(row, "Latitude"));
    const longitude = Number(field(row, "Longitude"));
    if (
      Number.isFinite(latitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      Number.isFinite(longitude) &&
      longitude >= -180 &&
      longitude <= 180
    ) {
      const wpiCoordinates = {
        latitude,
        longitude,
        precision: "wpi-reference",
        source: "nga-wpi",
      };
      if (
        port.coordinates &&
        haversineKilometers(port.coordinates, wpiCoordinates) > 25
      ) {
        counters.wpiCoordinateConflicts += 1;
        port.coordinateConflict = {
          unlocode: port.coordinates,
          wpi: wpiCoordinates,
          resolution: "needs-review",
        };
      } else {
        port.coordinates = wpiCoordinates;
      }
    }
  }
}

const sourceManifest = JSON.parse(
  await readFile(resolve(rawDirectory, "source-manifest.json"), "utf8"),
);
const countrySourceNames = new Map();
const portsByLocode = new Map();
const counters = {
  sourceRows: 0,
  countryHeaders: 0,
  maritimeRows: 0,
  excludedRows: 0,
  duplicateRows: 0,
  wpiRows: 0,
  wpiMatched: 0,
  wpiUnmatched: 0,
  wpiCoordinateConflicts: 0,
};

for (const fileName of UNLOCODE_FILES) {
  const rows = parseCsv(await readFile(resolve(rawDirectory, fileName), "utf8"));
  for (const [rowIndex, row] of rows.entries()) {
    counters.sourceRows += 1;
    const source = toRecord(row);
    const country = source.country.trim().toUpperCase();
    const location = source.location.trim().toUpperCase();

    if (!location) {
      if (country && source.name.startsWith(".")) {
        countrySourceNames.set(country, source.name.slice(1).trim());
        counters.countryHeaders += 1;
      }
      continue;
    }
    if (source.function[0] !== "1") {
      continue;
    }

    counters.maritimeRows += 1;
    const status = source.status.trim().toUpperCase();
    if (source.change.trim() === "X" || EXCLUDED_UNLOCODE_STATUSES.has(status)) {
      counters.excludedRows += 1;
      continue;
    }

    const unLocode = `${country}${location}`;
    const isReference = source.change.trim() === "=";
    const existing = portsByLocode.get(unLocode);
    if (existing) {
      counters.duplicateRows += 1;
      existing.sourceRefs.push({
        sourceId: "unlocode",
        sourceRowId: `${fileName}:${rowIndex + 1}`,
        release: sourceManifest.unlocode.release,
        status,
      });
      addAlias(existing, source.name);
      addAlias(existing, source.nameWoDiacritics);
      if (existing.isReference && !isReference) {
        addAlias(existing, existing.name);
        existing.name = source.name.trim();
        existing.status = status;
        existing.sourceDate = source.date.trim();
        existing.coordinates = parseUnlocodeCoordinates(source.coordinates);
        existing.isReference = false;
      }
      continue;
    }

    const name = source.name.trim();
    if (!name || !/^[A-Z]{2}[A-Z0-9]{3}$/u.test(unLocode)) {
      counters.excludedRows += 1;
      continue;
    }

    const record = {
      id: `port-unlocode-${unLocode.toLocaleLowerCase("en")}`,
      slug: slugForPort(name, unLocode),
      name,
      aliases: [],
      countryCode: country,
      countrySourceName: "",
      countryName: "",
      unLocode,
      status,
      sourceDate: source.date.trim(),
      subdivision: source.subdivision.trim() || undefined,
      coordinates: parseUnlocodeCoordinates(source.coordinates),
      source: "unlocode",
      sourceRefs: [
        {
          sourceId: "unlocode",
          sourceRowId: `${fileName}:${rowIndex + 1}`,
          release: sourceManifest.unlocode.release,
          status,
        },
      ],
      isReference,
    };
    addAlias(record, source.nameWoDiacritics);
    portsByLocode.set(unLocode, record);
  }
}

await mergeWpiIfAvailable(portsByLocode, sourceManifest, counters);

const canonicalPorts = [...portsByLocode.values()]
  .map((port) => {
    const countrySourceName = countrySourceNames.get(port.countryCode) ?? port.countryCode;
    return {
      ...port,
      countrySourceName,
      countryName: preferredCountryName(port.countryCode, countrySourceName),
      aliases: [...port.aliases].sort((left, right) => left.localeCompare(right, "en")),
      confidence: sourceConfidence(port.status),
      isReference: undefined,
    };
  })
  .sort(stableSortPorts);

const publicPorts = canonicalPorts.map((port) => {
  const searchValues = buildSearchValues(port);
  return {
    id: port.id,
    slug: port.slug,
    name: port.name,
    aliases: port.aliases,
    countryCode: port.countryCode,
    countryName: port.countryName,
    unLocode: port.unLocode,
    sourceStatus: port.status,
    confidence: port.confidence,
    searchValues,
  };
});

const shardPorts = new Map();
for (const port of publicPorts) {
  for (const key of shardKeys(port.searchValues)) {
    const shard = shardPorts.get(key) ?? new Map();
    shard.set(port.id, port);
    shardPorts.set(key, shard);
  }
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(resolve(outputDirectory, "search"), { recursive: true });
await mkdir(processedDirectory, { recursive: true });

const shards = {};
for (const [key, records] of [...shardPorts.entries()].sort(([left], [right]) =>
  left.localeCompare(right, "en"),
)) {
  const items = [...records.values()].sort(stableSortPorts);
  const payload = `${JSON.stringify({
    schemaVersion: "port-search-shard.v1",
    datasetVersion: DATASET_VERSION,
    key,
    items,
  })}\n`;
  const fileName = `${key === "_" ? "other" : key}.json`;
  const path = resolve(outputDirectory, "search", fileName);
  await writeFile(path, payload, "utf8");
  shards[key] = {
    path: `/data/port-master/search/${fileName}`,
    recordCount: items.length,
    ...byteMetrics(payload),
  };
}

const confidenceCounts = Object.fromEntries(
  ["official", "reference", "pending"].map((confidence) => [
    confidence,
    publicPorts.filter((port) => port.confidence === confidence).length,
  ]),
);
const manifest = {
  schemaVersion: "port-search-manifest.v1",
  datasetVersion: DATASET_VERSION,
  retrievedAt: sourceManifest.retrievedAt,
  minimumQueryLength: 2,
  routing: {
    strategy: "fnv1a-8",
    prefixLength: 2,
    bucketCount: 256,
  },
  attribution: {
    name: "UN/LOCODE",
    sourceUrl: sourceManifest.unlocode.sourceUrl,
    release: sourceManifest.unlocode.release,
    license: sourceManifest.unlocode.license,
    licenseUrl: sourceManifest.unlocode.licenseUrl,
    licenseReview: sourceManifest.unlocode.licenseReview,
  },
  sources: {
    unlocode: "used",
    wpi:
      sourceManifest.wpi?.availability === "downloaded"
        ? "used-for-exact-locode-enrichment"
        : "unavailable-not-replaced-by-mirror",
  },
  counts: {
    ...counters,
    publishedPorts: publicPorts.length,
    countries: new Set(publicPorts.map((port) => port.countryCode)).size,
    confidence: confidenceCounts,
  },
  shards,
};

const manifestPayload = `${JSON.stringify(manifest, null, 2)}\n`;
await writeFile(resolve(outputDirectory, "manifest.json"), manifestPayload, "utf8");
await writeFile(
  resolve(outputDirectory, "NOTICE.txt"),
  [
    "CrewPort Port Directory",
    "",
    `Contains data derived from UN/LOCODE release ${sourceManifest.unlocode.release}.`,
    `Source: ${sourceManifest.unlocode.sourceUrl}`,
    `License stated by UN/CEFACT: ${sourceManifest.unlocode.license} (${sourceManifest.unlocode.licenseUrl})`,
    "Attribution: United Nations Economic Commission for Europe (UNECE), UN/CEFACT.",
    "Production redistribution remains subject to CrewPort legal/compliance review.",
    sourceManifest.wpi?.availability === "downloaded"
      ? `Includes exact-LOCODE enrichment from NGA World Port Index (${sourceManifest.wpi.sourceUrl}).`
      : "NGA WPI data is not included because the official CSV download was unavailable.",
    "",
  ].join("\n"),
  "utf8",
);
await writeFile(
  resolve(processedDirectory, "port-master.json"),
  `${JSON.stringify(
    {
      schemaVersion: "port-master.v1",
      datasetVersion: DATASET_VERSION,
      sourceManifest,
      ports: canonicalPorts,
      terminals: [],
      gates: [],
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(`Built ${publicPorts.length.toLocaleString("en-US")} maritime port records.`);
console.log(`Generated ${Object.keys(shards).length} lazy search shards.`);
console.log(`Manifest: ${relative(projectRoot, resolve(outputDirectory, "manifest.json"))}`);
