import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  assertSourceCatalog,
  publicPathForVariant,
  readSourceCatalog,
  sha256,
} from "./port-media-lib.mjs";

const userAgent =
  "CrewPort/0.1 port-media-ingestion (https://github.com/ilohlove/seafarer-port-platform; contact via repository issues)";

async function currentFileMatches(filePath, variant) {
  try {
    const buffer = await readFile(filePath);
    return (
      buffer.byteLength === variant.byteSize &&
      sha256(buffer) === variant.sha256
    );
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

const catalog = await readSourceCatalog();
assertSourceCatalog(catalog);

let downloaded = 0;
for (const asset of catalog.assets) {
  for (const variant of asset.variants) {
    const filePath = publicPathForVariant(variant);
    if (await currentFileMatches(filePath, variant)) {
      continue;
    }
    const response = await fetch(variant.downloadUrl, {
      redirect: "follow",
      headers: {
        "user-agent": userAgent,
        accept: "image/jpeg",
      },
    });
    if (!response.ok) {
      throw new Error(
        `Media download failed for ${asset.id}: ${response.status}`,
      );
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/jpeg")) {
      throw new Error(`Unexpected media type for ${asset.id}: ${contentType}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (
      buffer.byteLength !== variant.byteSize ||
      sha256(buffer) !== variant.sha256
    ) {
      throw new Error(
        `Downloaded bytes changed for ${asset.id} ${variant.width}px; review upstream before updating hashes`,
      );
    }
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
    downloaded += 1;
  }
}

console.log(
  `Port media download complete: ${downloaded} downloaded, ${catalog.assets.length} approved asset(s)`,
);
