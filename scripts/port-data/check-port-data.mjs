import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { byteMetrics } from "./port-data-lib.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outputDirectory = resolve(projectRoot, "public/data/port-master");
const manifest = JSON.parse(
  await readFile(resolve(outputDirectory, "manifest.json"), "utf8"),
);

if (manifest.schemaVersion !== "port-search-manifest.v1") {
  throw new Error(`Unexpected manifest schema: ${manifest.schemaVersion}`);
}
if (manifest.counts.publishedPorts < 1) {
  throw new Error("Port directory contains no published ports");
}
if (manifest.attribution.license !== "CC-BY-4.0") {
  throw new Error("UN/LOCODE attribution or license metadata is missing");
}

const allPortIds = new Set();
const slugOwners = new Map();
const requiredPorts = new Map([
  ["KRPUS", "busan"],
  ["SGSIN", "singapore"],
  ["MYPKG", "port-klang"],
]);
let largestShard;

for (const [key, descriptor] of Object.entries(manifest.shards)) {
  const path = resolve(projectRoot, `public${descriptor.path}`);
  const content = await readFile(path);
  const metrics = byteMetrics(content);
  if (metrics.sha256 !== descriptor.sha256 || metrics.bytes !== descriptor.bytes) {
    throw new Error(`Integrity mismatch for shard ${key}`);
  }
  if (metrics.gzipBytes > 128 * 1024) {
    throw new Error(
      `Shard ${key} exceeds 128 KiB gzip hard limit: ${metrics.gzipBytes} B`,
    );
  }

  const shard = JSON.parse(content.toString("utf8"));
  if (shard.datasetVersion !== manifest.datasetVersion || shard.key !== key) {
    throw new Error(`Version or key mismatch for shard ${key}`);
  }
  const shardIds = new Set();
  for (const port of shard.items) {
    if (!/^[A-Z]{2}[A-Z0-9]{3}$/u.test(port.unLocode)) {
      throw new Error(`Invalid UN/LOCODE in shard ${key}: ${port.unLocode}`);
    }
    if (shardIds.has(port.id)) {
      throw new Error(`Duplicate ${port.id} inside shard ${key}`);
    }
    shardIds.add(port.id);
    allPortIds.add(port.id);

    const existingSlugOwner = slugOwners.get(port.slug);
    if (existingSlugOwner && existingSlugOwner !== port.id) {
      throw new Error(
        `Route slug ${port.slug} is shared by ${existingSlugOwner} and ${port.id}`,
      );
    }
    slugOwners.set(port.slug, port.id);

    if (requiredPorts.has(port.unLocode)) {
      const expectedSlug = requiredPorts.get(port.unLocode);
      if (port.slug !== expectedSlug) {
        throw new Error(
          `Expected ${port.unLocode} to use route slug ${expectedSlug}, received ${port.slug}`,
        );
      }
      requiredPorts.delete(port.unLocode);
    }
  }
  if (shard.items.length !== descriptor.recordCount) {
    throw new Error(`Record count mismatch for shard ${key}`);
  }
  if (!largestShard || metrics.gzipBytes > largestShard.gzipBytes) {
    largestShard = { key, ...metrics };
  }
}

if (allPortIds.size !== manifest.counts.publishedPorts) {
  throw new Error(
    `Directory union count ${allPortIds.size} does not match manifest ${manifest.counts.publishedPorts}`,
  );
}
if (requiredPorts.size > 0) {
  throw new Error(
    `Required reference ports are missing: ${[...requiredPorts.keys()].join(", ")}`,
  );
}

console.log(
  `PASS: ${allPortIds.size.toLocaleString("en-US")} ports across ${Object.keys(manifest.shards).length} shards.`,
);
console.log(
  `Largest shard: ${largestShard.key} (${largestShard.gzipBytes.toLocaleString("en-US")} B gzip).`,
);
