import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
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
import {
  buildWpiEvidenceIndex,
  classificationForCandidate,
  hasAirportFunction,
  isMaritimeCandidateFunction,
  mergeFunctionCodes,
  normalizeUnLocode,
  requireDownloadedWpiDescriptor,
} from "./port-classification.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const rawDirectory = resolve(projectRoot, ".cache/port-master/raw");
const processedDirectory = resolve(projectRoot, ".cache/port-master/processed");
const outputDirectory = resolve(projectRoot, "public/data/port-master");
const stagingDirectory = resolve(projectRoot, "public/data/.port-master-staging");
const backupDirectory = resolve(projectRoot, "public/data/.port-master-backup");
const overridesPath = resolve(
  projectRoot,
  "scripts/port-data/port-classification-overrides.json",
);
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

function validWpiCoordinates(latitudeValue, longitudeValue) {
  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return undefined;
  }
  return {
    latitude,
    longitude,
    precision: "wpi-reference",
    source: "nga-wpi",
  };
}

function wpiRecordsFromFeatureSnapshot(snapshot) {
  if (
    snapshot.schemaVersion !== "nga-wpi-feature-snapshot.v1" ||
    snapshot.featureCount !== snapshot.features?.length
  ) {
    throw new Error("Invalid official WPI feature snapshot");
  }
  return snapshot.features.map((feature) => ({
    sourceRowId: String(feature.attributes?.objectid ?? ""),
    wpiNumber: feature.attributes?.wpinumber,
    name: String(feature.attributes?.main_port_name ?? "").trim(),
    alternateName: String(feature.attributes?.alternate_name ?? "").trim(),
    countryCode: String(feature.attributes?.wpi_cc ?? "").trim(),
    unLocode: feature.attributes?.unlocode,
    coordinates: validWpiCoordinates(feature.geometry?.y, feature.geometry?.x),
  }));
}

function wpiRecordsFromCsv(content) {
  const rows = parseCsv(content);
  const header = rows.shift() ?? [];
  const fieldIndex = new Map(
    header.map((field, index) => [field.replace(/^\uFEFF/u, "").trim(), index]),
  );
  const field = (row, name) => row[fieldIndex.get(name)]?.trim() ?? "";
  return rows.map((row, rowIndex) => ({
    sourceRowId:
      field(row, "World Port Index Number") || `UpdatedPub150.csv:${rowIndex + 2}`,
    wpiNumber: field(row, "World Port Index Number"),
    name: field(row, "Main Port Name"),
    alternateName: field(row, "Alternate Port Name"),
    countryCode: field(row, "Country Code"),
    unLocode: field(row, "UN/LOCODE"),
    coordinates: validWpiCoordinates(
      field(row, "Latitude"),
      field(row, "Longitude"),
    ),
  }));
}

async function readWpiRecords(sourceManifest) {
  const descriptor = requireDownloadedWpiDescriptor(sourceManifest.wpi);
  const content = await readFile(resolve(rawDirectory, descriptor.fileName), "utf8");
  if (descriptor.format === "arcgis-feature-json") {
    return wpiRecordsFromFeatureSnapshot(JSON.parse(content));
  }
  if (descriptor.format === "csv" || descriptor.fileName.endsWith(".csv")) {
    return wpiRecordsFromCsv(content);
  }
  throw new Error(`Unsupported WPI snapshot format: ${descriptor.format ?? "unknown"}`);
}

async function readClassificationOverrides() {
  const payload = JSON.parse(await readFile(overridesPath, "utf8"));
  if (
    payload.schemaVersion !== "port-classification-overrides.v1" ||
    !Array.isArray(payload.records)
  ) {
    throw new Error("Invalid port classification override file");
  }
  const overrides = new Map();
  for (const record of payload.records) {
    const unLocode = normalizeUnLocode(record.unLocode);
    let sourceUrl;
    try {
      sourceUrl = new URL(record.sourceUrl);
    } catch {
      throw new Error(`Invalid override source URL for ${record.unLocode}`);
    }
    if (
      !unLocode ||
      !["include", "exclude"].includes(record.decision) ||
      sourceUrl.protocol !== "https:" ||
      !/^\d{4}-\d{2}-\d{2}$/u.test(record.reviewedAt) ||
      !String(record.reviewer ?? "").trim() ||
      !String(record.reason ?? "").trim() ||
      overrides.has(unLocode)
    ) {
      throw new Error(`Invalid or duplicate classification override: ${record.unLocode}`);
    }
    overrides.set(unLocode, { ...record, unLocode });
  }
  return overrides;
}

function applyWpiClassification(
  portsByLocode,
  wpiRecords,
  overrides,
  sourceManifest,
  counters,
) {
  const evidenceIndex = buildWpiEvidenceIndex(wpiRecords);
  counters.wpiRows = wpiRecords.length;
  counters.wpiWithoutLocode = evidenceIndex.withoutLocode.length;
  counters.wpiInvalidLocode = evidenceIndex.invalid.length;
  counters.wpiCountryConflicts = evidenceIndex.countryConflicts.length;
  counters.wpiDuplicateLocodes = evidenceIndex.duplicateLocodes;
  counters.wpiUnmatchedLocodes = [...evidenceIndex.byLocode.keys()].filter(
    (unLocode) => !portsByLocode.has(unLocode),
  ).length;

  for (const port of portsByLocode.values()) {
    const override = overrides.get(port.unLocode);
    const { classification, evidence } = classificationForCandidate(
      port.unLocode,
      evidenceIndex,
      override,
    );
    port.classification = classification;
    port.wpiNumbers = evidence.map((item) => item.wpiNumber);

    if (override?.decision === "include") {
      counters.manualIncluded += 1;
      port.sourceRefs.push({
        sourceId: "official-port-authority",
        sourceRowId: `${override.reviewer}:${override.reviewedAt}`,
        sourceUrl: override.sourceUrl,
        reviewedAt: override.reviewedAt,
      });
    } else if (override?.decision === "exclude") {
      counters.manualExcluded += 1;
    }

    if (classification !== "wpi-confirmed") {
      if (classification === "candidate") {
        counters.unLocodeOnlyQuarantined += 1;
      }
      continue;
    }

    counters.wpiMatchedLocodes += 1;
    counters.wpiMatchedRecords += evidence.length;
    for (const item of evidence) {
      addAlias(port, item.name);
      addAlias(port, item.alternateName);
      port.sourceRefs.push({
        sourceId: "nga-wpi",
        sourceRowId: item.wpiNumber,
        sourceUrl: sourceManifest.wpi.sourceUrl,
      });
      if (!item.coordinates) {
        continue;
      }
      if (
        port.coordinates &&
        haversineKilometers(port.coordinates, item.coordinates) > 25
      ) {
        counters.wpiCoordinateConflicts += 1;
        port.coordinateConflict ??= {
          unlocode: port.coordinates,
          wpi: item.coordinates,
          resolution: "needs-review",
        };
      } else {
        port.coordinates = item.coordinates;
      }
    }
  }
}

const sourceManifest = JSON.parse(
  await readFile(resolve(rawDirectory, "source-manifest.json"), "utf8"),
);
const wpiRecords = await readWpiRecords(sourceManifest);
const classificationOverrides = await readClassificationOverrides();
const countrySourceNames = new Map();
const portsByLocode = new Map();
const counters = {
  sourceRows: 0,
  countryHeaders: 0,
  maritimeRows: 0,
  excludedRows: 0,
  duplicateRows: 0,
  wpiRows: 0,
  wpiMatchedLocodes: 0,
  wpiMatchedRecords: 0,
  wpiUnmatchedLocodes: 0,
  wpiWithoutLocode: 0,
  wpiInvalidLocode: 0,
  wpiCountryConflicts: 0,
  wpiDuplicateLocodes: 0,
  wpiCoordinateConflicts: 0,
  airportMultifunctionCandidates: 0,
  unLocodeOnlyQuarantined: 0,
  manualIncluded: 0,
  manualExcluded: 0,
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
    if (!isMaritimeCandidateFunction(source.function)) {
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
        functions: source.function,
      });
      existing.functions = mergeFunctionCodes(existing.functions, source.function);
      existing.iata ||= source.iata.trim() || undefined;
      existing.remarks ||= source.remarks.trim() || undefined;
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
      functions: source.function,
      iata: source.iata.trim() || undefined,
      remarks: source.remarks.trim() || undefined,
      coordinates: parseUnlocodeCoordinates(source.coordinates),
      source: "unlocode",
      sourceRefs: [
        {
          sourceId: "unlocode",
          sourceRowId: `${fileName}:${rowIndex + 1}`,
          release: sourceManifest.unlocode.release,
          status,
          functions: source.function,
        },
      ],
      isReference,
    };
    addAlias(record, source.nameWoDiacritics);
    portsByLocode.set(unLocode, record);
  }
}

counters.airportMultifunctionCandidates = [...portsByLocode.values()].filter((port) =>
  hasAirportFunction(port.functions),
).length;
applyWpiClassification(
  portsByLocode,
  wpiRecords,
  classificationOverrides,
  sourceManifest,
  counters,
);

const datasetVersion = `${DATASET_VERSION}-wpi-${sourceManifest.wpi.sha256.slice(
  0,
  12,
)}-classifier-v2`;

const canonicalPorts = [...portsByLocode.values()]
  .map((port) => {
    const countrySourceName = countrySourceNames.get(port.countryCode) ?? port.countryCode;
    return {
      ...port,
      countrySourceName,
      countryName: preferredCountryName(port.countryCode, countrySourceName),
      aliases: [...port.aliases].sort((left, right) => left.localeCompare(right, "en")),
      unlocodeConfidence: sourceConfidence(port.status),
      confidence: port.classification === "candidate" ? "pending" : "official",
      isReference: undefined,
    };
  })
  .sort(stableSortPorts);

const publicPorts = canonicalPorts
  .filter((port) => port.classification !== "candidate")
  .map((port) => {
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
      confidence: "official",
      classification: port.classification,
      wpiNumbers: port.wpiNumbers,
      sourceIds: [...new Set(port.sourceRefs.map((source) => source.sourceId))].sort(),
      searchValues,
    };
  });

if (publicPorts.length === 0) {
  throw new Error("Port classification produced no publishable ports");
}

const shardPorts = new Map();
for (const port of publicPorts) {
  for (const key of shardKeys(port.searchValues)) {
    const shard = shardPorts.get(key) ?? new Map();
    shard.set(port.id, port);
    shardPorts.set(key, shard);
  }
}

await rm(stagingDirectory, { recursive: true, force: true });
await mkdir(resolve(stagingDirectory, "search"), { recursive: true });
await mkdir(processedDirectory, { recursive: true });

const shards = {};
for (const [key, records] of [...shardPorts.entries()].sort(([left], [right]) =>
  left.localeCompare(right, "en"),
)) {
  const items = [...records.values()].sort(stableSortPorts);
  const payload = `${JSON.stringify({
    schemaVersion: "port-search-shard.v1",
    datasetVersion,
    key,
    items,
  })}\n`;
  const fileName = `${key === "_" ? "other" : key}.json`;
  const path = resolve(stagingDirectory, "search", fileName);
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
  datasetVersion,
  classifierVersion: "port-classifier.v2",
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
  wpiAttribution: {
    name: "NGA World Port Index",
    sourceUrl: sourceManifest.wpi.sourceUrl,
    snapshotUrl: sourceManifest.wpi.url,
    checksum: sourceManifest.wpi.sha256,
    licenseReview: sourceManifest.wpi.licenseReview,
  },
  sources: {
    unlocode: "used",
    wpi: "required-for-publication-by-exact-locode",
  },
  counts: {
    ...counters,
    unlocodeCandidates: canonicalPorts.length,
    publishedPorts: publicPorts.length,
    countries: new Set(publicPorts.map((port) => port.countryCode)).size,
    confidence: confidenceCounts,
  },
  shards,
};

const manifestPayload = `${JSON.stringify(manifest, null, 2)}\n`;
await writeFile(resolve(stagingDirectory, "manifest.json"), manifestPayload, "utf8");
await writeFile(
  resolve(stagingDirectory, "NOTICE.txt"),
  [
    "CrewPort Port Directory",
    "",
    `Contains data derived from UN/LOCODE release ${sourceManifest.unlocode.release}.`,
    `Source: ${sourceManifest.unlocode.sourceUrl}`,
    `License stated by UN/CEFACT: ${sourceManifest.unlocode.license} (${sourceManifest.unlocode.licenseUrl})`,
    "Attribution: United Nations Economic Commission for Europe (UNECE), UN/CEFACT.",
    "Production redistribution remains subject to CrewPort legal/compliance review.",
    `Public search records require an exact UN/LOCODE match in NGA World Port Index (${sourceManifest.wpi.sourceUrl}) or a reviewed official override.`,
    `NGA WPI snapshot checksum: ${sourceManifest.wpi.sha256}`,
    "",
  ].join("\n"),
  "utf8",
);

const publicByLocode = new Map(publicPorts.map((port) => [port.unLocode, port]));
for (const unLocode of ["KRPUS", "SGSIN", "MYPKG", "AUSYD", "CAVAN"]) {
  if (!publicByLocode.has(unLocode)) {
    throw new Error(`Required WPI-confirmed reference port is missing: ${unLocode}`);
  }
}
for (const unLocode of ["AUCBR", "CAWNP", "MXANH", "GBLCY"]) {
  if (publicByLocode.has(unLocode)) {
    throw new Error(`Unverified non-seaport candidate was published: ${unLocode}`);
  }
}
for (const port of publicPorts) {
  if (
    !["wpi-confirmed", "officially-curated"].includes(port.classification) ||
    port.confidence !== "official" ||
    !port.sourceIds.includes("unlocode") ||
    (port.classification === "wpi-confirmed" &&
      (port.wpiNumbers.length === 0 || !port.sourceIds.includes("nga-wpi"))) ||
    (port.classification === "officially-curated" &&
      !port.sourceIds.includes("official-port-authority"))
  ) {
    throw new Error(`Missing classification evidence for ${port.unLocode}`);
  }
}
for (const [key, descriptor] of Object.entries(shards)) {
  if (descriptor.gzipBytes > 128 * 1024) {
    throw new Error(
      `Staged shard ${key} exceeds 128 KiB gzip hard limit: ${descriptor.gzipBytes} B`,
    );
  }
}

await writeFile(
  resolve(processedDirectory, "port-master.json"),
  `${JSON.stringify(
    {
      schemaVersion: "port-master.v1",
      datasetVersion,
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

await rm(backupDirectory, { recursive: true, force: true });
let previousOutputMoved = false;
try {
  await rename(outputDirectory, backupDirectory);
  previousOutputMoved = true;
} catch (error) {
  if (error?.code === "EPERM" || error?.code === "EBUSY") {
    throw new Error(
      "Port data is locked by the local dev server. Stop `npm run dev`, then rerun the build.",
      { cause: error },
    );
  }
  if (error?.code !== "ENOENT") {
    throw error;
  }
}
try {
  await rename(stagingDirectory, outputDirectory);
} catch (error) {
  if (previousOutputMoved) {
    await rename(backupDirectory, outputDirectory);
  }
  await rm(stagingDirectory, { recursive: true, force: true });
  if (error?.code === "EPERM" || error?.code === "EBUSY") {
    throw new Error(
      "Port data is locked by the local dev server. Stop `npm run dev`, then rerun the build.",
      { cause: error },
    );
  }
  throw error;
}
await rm(backupDirectory, { recursive: true, force: true });

console.log(`Built ${publicPorts.length.toLocaleString("en-US")} maritime port records.`);
console.log(`Generated ${Object.keys(shards).length} lazy search shards.`);
console.log(`Manifest: ${relative(projectRoot, resolve(outputDirectory, "manifest.json"))}`);
