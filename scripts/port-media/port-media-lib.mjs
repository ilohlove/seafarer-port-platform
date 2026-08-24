import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = path.resolve(scriptDirectory, "../..");
export const sourceCatalogPath = path.join(
  scriptDirectory,
  "port-media-sources.json",
);
export const publicMediaRoot = path.join(
  repositoryRoot,
  "public",
  "media",
  "ports",
);
export const runtimeManifestPath = path.join(publicMediaRoot, "manifest.json");
export const noticePath = path.join(publicMediaRoot, "NOTICE.txt");

export async function readSourceCatalog() {
  return JSON.parse(await readFile(sourceCatalogPath, "utf8"));
}

export function assertSourceCatalog(catalog) {
  if (catalog.schemaVersion !== "port-hero-media-source.v1") {
    throw new Error("Unsupported port hero media source catalog");
  }
  if (!Array.isArray(catalog.targets) || catalog.targets.length !== 30) {
    throw new Error("Port hero media catalog must contain 30 rollout targets");
  }
  const locodes = new Set();
  for (const target of catalog.targets) {
    if (!/^[A-Z]{2}[A-Z0-9]{3}$/.test(target.unLocode)) {
      throw new Error(`Invalid target UN/LOCODE: ${target.unLocode}`);
    }
    if (locodes.has(target.unLocode)) {
      throw new Error(`Duplicate target UN/LOCODE: ${target.unLocode}`);
    }
    locodes.add(target.unLocode);
  }

  for (const asset of catalog.assets) {
    if (
      asset.publicationStatus !== "approved" ||
      asset.review?.metadataStatus !== "verified" ||
      asset.review?.contextStatus !== "exact"
    ) {
      throw new Error(`Published media ${asset.id} is not fully reviewed`);
    }
    if (!locodes.has(asset.portUnLocode)) {
      throw new Error(`Published media ${asset.id} is outside rollout targets`);
    }
    if (!asset.contextSlug || asset.contextAccuracy !== "exact") {
      throw new Error(`Published media ${asset.id} needs an exact context`);
    }
    if (
      !asset.attribution?.sourcePageUrl?.startsWith("https://") ||
      !asset.attribution?.licenseUrl?.startsWith("https://")
    ) {
      throw new Error(`Published media ${asset.id} lacks HTTPS attribution`);
    }
    if (!/^CC BY(?:-SA)? |^CC0|^Public domain/.test(asset.attribution.licenseName)) {
      throw new Error(`Published media ${asset.id} uses a blocked license`);
    }
    if (!Array.isArray(asset.variants) || asset.variants.length < 1) {
      throw new Error(`Published media ${asset.id} has no local variants`);
    }
    for (const variant of asset.variants) {
      if (
        !variant.src.startsWith("/media/ports/") ||
        !variant.downloadUrl.startsWith("https://commons.wikimedia.org/") ||
        variant.mediaType !== "image/jpeg" ||
        !/^[a-f0-9]{64}$/.test(variant.sha256)
      ) {
        throw new Error(`Invalid media variant in ${asset.id}`);
      }
    }
  }
}

export function publicPathForVariant(variant) {
  const relativePath = variant.src.replace(/^\/+media\/+ports\//, "");
  const resolved = path.resolve(publicMediaRoot, relativePath);
  const relative = path.relative(publicMediaRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Media path escapes public root: ${variant.src}`);
  }
  return resolved;
}

export function runtimeManifest(catalog) {
  return {
    schemaVersion: "port-hero-media-manifest.v1",
    releaseId: catalog.releaseId,
    releaseScope: catalog.releaseScope,
    targetPortCount: catalog.targets.length,
    publishedAssetCount: catalog.assets.length,
    assets: catalog.assets.map(
      ({ sourceFileName: _sourceFileName, variants, ...asset }) => ({
        ...asset,
        variants: variants.map(({ downloadUrl: _downloadUrl, ...variant }) =>
          variant,
        ),
      }),
    ),
  };
}

export function serializeManifest(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export function noticeText(catalog) {
  const lines = [
    "CrewPort port hero media attribution",
    "",
    "Images are decorative context only and are not operational port guidance.",
    "Data Saver and Ultra Lite do not request these image files.",
    "",
  ];
  for (const asset of catalog.assets) {
    lines.push(
      `${asset.contextLabel}`,
      `Title: ${asset.sourceFileName}`,
      `Creator: ${asset.attribution.creator}`,
      `Source: ${asset.attribution.sourcePageUrl}`,
      `License: ${asset.attribution.licenseName} (${asset.attribution.licenseUrl})`,
      `Changes: ${asset.attribution.changes}`,
      "",
    );
  }
  return `${lines.join("\n").trim()}\n`;
}

export function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function readVariant(variant) {
  const filePath = publicPathForVariant(variant);
  const buffer = await readFile(filePath);
  return { filePath, buffer };
}

export function jpegDimensions(buffer) {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw new Error("Expected JPEG SOI marker");
  }
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) {
      continue;
    }
    const segmentLength = buffer.readUInt16BE(offset);
    if (
      [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(
        marker,
      )
    ) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }
    offset += segmentLength;
  }
  throw new Error("JPEG dimensions were not found");
}
