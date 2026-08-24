import { mkdir, writeFile } from "node:fs/promises";

import {
  assertSourceCatalog,
  noticePath,
  noticeText,
  publicMediaRoot,
  readSourceCatalog,
  runtimeManifest,
  runtimeManifestPath,
  serializeManifest,
} from "./port-media-lib.mjs";

const catalog = await readSourceCatalog();
assertSourceCatalog(catalog);
await mkdir(publicMediaRoot, { recursive: true });
await writeFile(
  runtimeManifestPath,
  serializeManifest(runtimeManifest(catalog)),
  "utf8",
);
await writeFile(noticePath, noticeText(catalog), "utf8");

console.log(
  `Port media manifest built: ${catalog.assets.length}/${catalog.targets.length} target ports published`,
);
