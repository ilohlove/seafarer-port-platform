import { createHash } from "node:crypto";
import { get } from "node:https";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  UNLOCODE_ARTIFACT_BASE,
  UNLOCODE_FILES,
  UNLOCODE_LICENSE_URL,
  UNLOCODE_RELEASE,
  UNLOCODE_SOURCE_URL,
  UNLOCODE_TERMS_URL,
  WPI_DOWNLOAD_URL,
  WPI_FEATURE_LAYER_URL,
  WPI_SOURCE_URL,
} from "./port-data-lib.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const rawDirectory = resolve(projectRoot, ".cache/port-master/raw");
const manifestPath = resolve(rawDirectory, "source-manifest.json");
const WPI_FEATURE_FILE = "WorldPortIndex.json";
const WPI_BATCH_SIZE = 500;
const WPI_REQUIRED_FIELDS = [
  "objectid",
  "wpinumber",
  "main_port_name",
  "alternate_name",
  "wpi_cc",
  "unlocode",
];

async function hashFile(path) {
  const content = await readFile(path);
  return createHash("sha256").update(content).digest("hex");
}

async function download(url, targetPath, validate) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      Accept: "text/csv,application/octet-stream;q=0.9,*/*;q=0.8",
      "User-Agent":
        "CrewPort-port-master/0.1 (+https://github.com/ilohlove/seafarer-port-platform)",
    },
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const content = Buffer.from(await response.arrayBuffer());
  validate(content);
  const temporaryPath = `${targetPath}.part`;
  await writeFile(temporaryPath, content);
  await rename(temporaryPath, targetPath);
  return {
    bytes: content.byteLength,
    sha256: createHash("sha256").update(content).digest("hex"),
  };
}

function validateCsv(content, expectedText) {
  const head = content.subarray(0, 512).toString("utf8");
  if (!head.includes(expectedText)) {
    throw new Error(`Downloaded content does not contain ${expectedText}`);
  }
}

function requestJsonOnce(url, redirectsRemaining = 3) {
  const parsedUrl = new URL(url);
  if (
    parsedUrl.protocol !== "https:" ||
    !(parsedUrl.hostname === "nga.mil" || parsedUrl.hostname.endsWith(".nga.mil"))
  ) {
    return Promise.reject(new Error(`Untrusted WPI source URL: ${url}`));
  }

  return new Promise((resolveRequest, rejectRequest) => {
    const request = get(
      parsedUrl,
      {
        family: 4,
        headers: {
          Accept: "application/json",
          "User-Agent":
            "CrewPort-port-master/0.1 (+https://github.com/ilohlove/seafarer-port-platform)",
        },
      },
      (response) => {
        const status = response.statusCode ?? 0;
        if (
          status >= 300 &&
          status < 400 &&
          response.headers.location &&
          redirectsRemaining > 0
        ) {
          response.resume();
          const nextUrl = new URL(response.headers.location, parsedUrl).toString();
          void requestJsonOnce(nextUrl, redirectsRemaining - 1).then(
            resolveRequest,
            rejectRequest,
          );
          return;
        }

        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          if (status < 200 || status >= 300) {
            rejectRequest(new Error(`${status} ${response.statusMessage ?? ""}`.trim()));
            return;
          }
          try {
            const payload = JSON.parse(body);
            if (payload?.error) {
              rejectRequest(
                new Error(
                  `ArcGIS ${payload.error.code ?? "error"}: ${payload.error.message ?? "Unknown error"}`,
                ),
              );
              return;
            }
            resolveRequest(payload);
          } catch (error) {
            rejectRequest(
              new Error(
                `Invalid JSON from official WPI service: ${error instanceof Error ? error.message : String(error)}`,
              ),
            );
          }
        });
      },
    );
    request.setTimeout(180_000, () =>
      request.destroy(new Error("Official WPI request timed out")),
    );
    request.on("error", rejectRequest);
  });
}

async function requestJson(url) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await requestJsonOnce(url);
    } catch (error) {
      lastError = error;
      if (attempt < 2) {
        await new Promise((resolveDelay) =>
          setTimeout(resolveDelay, 300 * (attempt + 1)),
        );
      }
    }
  }
  throw lastError;
}

function wpiQueryUrl(parameters) {
  const url = new URL(`${WPI_FEATURE_LAYER_URL}/query`);
  for (const [key, value] of Object.entries(parameters)) {
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function validateWpiMetadata(metadata) {
  const fields = new Set((metadata.fields ?? []).map((field) => field.name));
  const missingFields = WPI_REQUIRED_FIELDS.filter((field) => !fields.has(field));
  if (
    metadata.name !== "World Port Index Viewer" ||
    metadata.objectIdField !== "objectid" ||
    missingFields.length > 0
  ) {
    throw new Error(
      `Unexpected official WPI schema${
        missingFields.length > 0 ? `; missing ${missingFields.join(", ")}` : ""
      }`,
    );
  }
}

async function downloadWpiFeatureSnapshot(targetPath) {
  const metadata = await requestJson(`${WPI_FEATURE_LAYER_URL}?f=json`);
  validateWpiMetadata(metadata);
  const idsPayload = await requestJson(
    wpiQueryUrl({ where: "1=1", returnIdsOnly: "true", f: "json" }),
  );
  const objectIds = [...new Set(idsPayload.objectIds ?? [])]
    .filter((value) => Number.isInteger(value))
    .sort((left, right) => left - right);
  if (objectIds.length === 0) {
    throw new Error("Official WPI service returned no object IDs");
  }

  const features = [];
  for (let index = 0; index < objectIds.length; index += WPI_BATCH_SIZE) {
    const batch = objectIds.slice(index, index + WPI_BATCH_SIZE);
    const payload = await requestJson(
      wpiQueryUrl({
        objectIds: batch.join(","),
        outFields: WPI_REQUIRED_FIELDS.join(","),
        returnGeometry: "true",
        outSR: "4326",
        f: "json",
      }),
    );
    features.push(...(payload.features ?? []));
  }

  const receivedIds = new Set(
    features.map((feature) => feature.attributes?.objectid).filter(Number.isInteger),
  );
  if (
    features.length !== objectIds.length ||
    objectIds.some((objectId) => !receivedIds.has(objectId))
  ) {
    throw new Error(
      `Official WPI feature count mismatch: expected ${objectIds.length}, received ${features.length}`,
    );
  }
  features.sort(
    (left, right) => left.attributes.objectid - right.attributes.objectid,
  );

  const snapshot = {
    schemaVersion: "nga-wpi-feature-snapshot.v1",
    sourceUrl: WPI_SOURCE_URL,
    featureLayerUrl: WPI_FEATURE_LAYER_URL,
    serviceItemId: metadata.serviceItemId,
    serviceVersion: metadata.currentVersion,
    spatialReference: metadata.extent?.spatialReference?.latestWkid ?? 4326,
    objectIdField: metadata.objectIdField,
    featureCount: features.length,
    fields: WPI_REQUIRED_FIELDS,
    features,
  };
  const content = Buffer.from(`${JSON.stringify(snapshot)}\n`, "utf8");
  const temporaryPath = `${targetPath}.part`;
  await writeFile(temporaryPath, content);
  await rename(temporaryPath, targetPath);
  return {
    availability: "downloaded",
    format: "arcgis-feature-json",
    fileName: WPI_FEATURE_FILE,
    url: WPI_FEATURE_LAYER_URL,
    featureCount: features.length,
    serviceItemId: metadata.serviceItemId,
    schemaFingerprint: createHash("sha256")
      .update(WPI_REQUIRED_FIELDS.join("\n"))
      .digest("hex"),
    bytes: content.byteLength,
    sha256: createHash("sha256").update(content).digest("hex"),
  };
}

async function readExistingManifest() {
  try {
    return JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    return undefined;
  }
}

async function reusableWpiSnapshot(existingManifest) {
  const existing = existingManifest?.wpi;
  if (existing?.availability !== "downloaded" || !existing.fileName || !existing.sha256) {
    return undefined;
  }
  try {
    const path = resolve(rawDirectory, existing.fileName);
    return (await hashFile(path)) === existing.sha256 ? existing : undefined;
  } catch {
    return undefined;
  }
}

await mkdir(rawDirectory, { recursive: true });
const existingManifest = await readExistingManifest();
const unlocodeFiles = [];

for (const fileName of UNLOCODE_FILES) {
  const encodedName = encodeURIComponent(fileName);
  const url = `${UNLOCODE_ARTIFACT_BASE}/${encodedName}?job=package-release`;
  const targetPath = resolve(rawDirectory, fileName);
  const metrics = await download(url, targetPath, (content) =>
    validateCsv(content, ","),
  );
  unlocodeFiles.push({ fileName, url, ...metrics });
  console.log(`Downloaded ${fileName} (${metrics.bytes.toLocaleString("en-US")} B)`);
}

let wpi;
let wpiFailure;
try {
  wpi = await downloadWpiFeatureSnapshot(resolve(rawDirectory, WPI_FEATURE_FILE));
  console.log(
    `Downloaded ${wpi.featureCount.toLocaleString("en-US")} official WPI features (${wpi.bytes.toLocaleString("en-US")} B)`,
  );
} catch (featureError) {
  try {
    const targetPath = resolve(rawDirectory, "UpdatedPub150.csv");
    const metrics = await download(WPI_DOWNLOAD_URL, targetPath, (content) =>
      validateCsv(content, "World Port Index Number"),
    );
    wpi = {
      availability: "downloaded",
      format: "csv",
      fileName: "UpdatedPub150.csv",
      url: WPI_DOWNLOAD_URL,
      ...metrics,
    };
    console.log(`Downloaded UpdatedPub150.csv (${metrics.bytes.toLocaleString("en-US")} B)`);
  } catch (csvError) {
    wpiFailure = `Feature service: ${
      featureError instanceof Error ? featureError.message : String(featureError)
    }; CSV: ${csvError instanceof Error ? csvError.message : String(csvError)}`;
    wpi = await reusableWpiSnapshot(existingManifest);
    if (wpi) {
      console.warn(`Official WPI refresh unavailable; retained verified snapshot: ${wpiFailure}`);
    } else {
      wpi = {
        availability: "unavailable",
        url: WPI_FEATURE_LAYER_URL,
        csvUrl: WPI_DOWNLOAD_URL,
        reason: wpiFailure,
      };
      console.warn(`WPI download unavailable: ${wpiFailure}`);
    }
  }
}

const hashesMatch =
  existingManifest?.unlocode?.files?.length === unlocodeFiles.length &&
  unlocodeFiles.every(
    (file) =>
      existingManifest.unlocode.files.find(
        (existing) =>
          existing.fileName === file.fileName && existing.sha256 === file.sha256,
      ) !== undefined,
  ) &&
  existingManifest?.wpi?.availability === "downloaded" &&
  wpi.availability === "downloaded" &&
  existingManifest.wpi.sha256 === wpi.sha256;
const retrievedAt = hashesMatch
  ? existingManifest.retrievedAt
  : new Date().toISOString();

const manifest = {
  schemaVersion: "port-source-manifest.v1",
  retrievedAt,
  unlocode: {
    release: UNLOCODE_RELEASE,
    sourceUrl: UNLOCODE_SOURCE_URL,
    termsUrl: UNLOCODE_TERMS_URL,
    license: "CC-BY-4.0",
    licenseUrl: UNLOCODE_LICENSE_URL,
    licenseReview: "pending-production-review",
    files: unlocodeFiles,
  },
  wpi: {
    sourceUrl: WPI_SOURCE_URL,
    licenseReview: "pending-production-review",
    ...wpi,
    ...(wpiFailure && wpi.availability === "downloaded"
      ? { lastRefreshError: wpiFailure }
      : {}),
  },
};

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
const manifestStats = await stat(manifestPath);
console.log(`Source manifest written (${manifestStats.size.toLocaleString("en-US")} B)`);

for (const file of unlocodeFiles) {
  const targetHash = await hashFile(resolve(rawDirectory, file.fileName));
  if (targetHash !== file.sha256) {
    throw new Error(`Checksum verification failed for ${file.fileName}`);
  }
}
if (wpi.availability === "downloaded") {
  const targetHash = await hashFile(resolve(rawDirectory, wpi.fileName));
  if (targetHash !== wpi.sha256) {
    throw new Error(`Checksum verification failed for ${wpi.fileName}`);
  }
}
