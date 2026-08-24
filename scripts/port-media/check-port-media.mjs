import { readFile } from "node:fs/promises";

import {
  assertSourceCatalog,
  jpegDimensions,
  noticePath,
  noticeText,
  readSourceCatalog,
  readVariant,
  runtimeManifest,
  runtimeManifestPath,
  serializeManifest,
  sha256,
} from "./port-media-lib.mjs";

const catalog = await readSourceCatalog();
assertSourceCatalog(catalog);

const expectedManifest = serializeManifest(runtimeManifest(catalog));
const actualManifest = await readFile(runtimeManifestPath, "utf8");
if (actualManifest !== expectedManifest) {
  throw new Error("Port media manifest is stale; run npm run data:media:build");
}

const expectedNotice = noticeText(catalog);
const actualNotice = await readFile(noticePath, "utf8");
if (actualNotice !== expectedNotice) {
  throw new Error("Port media NOTICE is stale; run npm run data:media:build");
}

let totalBytes = 0;
for (const asset of catalog.assets) {
  for (const variant of asset.variants) {
    const { buffer } = await readVariant(variant);
    const dimensions = jpegDimensions(buffer);
    if (
      buffer.byteLength !== variant.byteSize ||
      sha256(buffer) !== variant.sha256 ||
      dimensions.width !== variant.width ||
      dimensions.height !== variant.height
    ) {
      throw new Error(`Media integrity check failed: ${variant.src}`);
    }
    totalBytes += buffer.byteLength;
  }
}

const publishedTargets = catalog.targets.filter(
  (target) => target.mediaStatus === "published",
);
if (publishedTargets.length !== catalog.assets.length) {
  throw new Error("Target status and approved asset count differ");
}

console.log(
  `Port media check passed: ${catalog.assets.length} asset(s), ${totalBytes} bytes, ${catalog.targets.length - catalog.assets.length} CSS fallback target(s)`,
);
