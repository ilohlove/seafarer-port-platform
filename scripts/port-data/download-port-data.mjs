import { createHash } from "node:crypto";
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
  WPI_SOURCE_URL,
} from "./port-data-lib.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const rawDirectory = resolve(projectRoot, ".cache/port-master/raw");
const manifestPath = resolve(rawDirectory, "source-manifest.json");

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

async function readExistingManifest() {
  try {
    return JSON.parse(await readFile(manifestPath, "utf8"));
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
try {
  const targetPath = resolve(rawDirectory, "UpdatedPub150.csv");
  const metrics = await download(WPI_DOWNLOAD_URL, targetPath, (content) =>
    validateCsv(content, "World Port Index Number"),
  );
  wpi = {
    availability: "downloaded",
    fileName: "UpdatedPub150.csv",
    url: WPI_DOWNLOAD_URL,
    ...metrics,
  };
  console.log(`Downloaded UpdatedPub150.csv (${metrics.bytes.toLocaleString("en-US")} B)`);
} catch (error) {
  wpi = {
    availability: "unavailable",
    url: WPI_DOWNLOAD_URL,
    reason: error instanceof Error ? error.message : String(error),
  };
  console.warn(`WPI download unavailable: ${wpi.reason}`);
}

const hashesMatch =
  existingManifest?.unlocode?.files?.length === unlocodeFiles.length &&
  unlocodeFiles.every(
    (file) =>
      existingManifest.unlocode.files.find(
        (existing) =>
          existing.fileName === file.fileName && existing.sha256 === file.sha256,
      ) !== undefined,
  );
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
