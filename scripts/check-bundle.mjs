import { access, readFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import {
  brotliCompressSync,
  constants as zlibConstants,
  gzipSync,
} from 'node:zlib'

const distDirectory = resolve(process.env.BUNDLE_DIR ?? 'dist')
const manifestPath = join(distDirectory, '.vite', 'manifest.json')
const firstScreenDynamicEntries = (
  process.env.BUNDLE_FIRST_SCREEN_DYNAMIC_ENTRIES ??
  ''
)
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean)

const budgets = {
  hardInitialGzip: readBudget('BUNDLE_MAX_INITIAL_GZIP_BYTES', 500_000),
  targetInitialGzip: readBudget('BUNDLE_TARGET_INITIAL_GZIP_BYTES', 200_000),
  targetInitialJavaScriptGzip: readBudget(
    'BUNDLE_TARGET_INITIAL_JS_GZIP_BYTES',
    150_000,
  ),
  targetLazyChunkGzip: readBudget('BUNDLE_TARGET_LAZY_GZIP_BYTES', 40_000),
}

function readBudget(name, fallback) {
  const configuredValue = process.env[name]

  if (configuredValue === undefined) {
    return fallback
  }

  const parsedValue = Number.parseInt(configuredValue, 10)

  if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${name} must be a positive integer, received: ${configuredValue}`)
  }

  return parsedValue
}

function compressedSizes(content) {
  return {
    raw: content.byteLength,
    gzip: gzipSync(content, { level: 9 }).byteLength,
    brotli: brotliCompressSync(content, {
      params: {
        [zlibConstants.BROTLI_PARAM_QUALITY]: 11,
      },
    }).byteLength,
  }
}

function formatBytes(bytes) {
  return `${new Intl.NumberFormat('en-US').format(bytes)} B`
}

async function assertBuildExists() {
  try {
    await access(manifestPath)
  } catch {
    throw new Error(
      `Vite manifest not found at ${manifestPath}. Run "npm run build" first.`,
    )
  }
}

function addChunkFiles(manifest, manifestKey, files, visitedKeys) {
  if (visitedKeys.has(manifestKey)) {
    return
  }

  const chunk = manifest[manifestKey]

  if (chunk === undefined) {
    throw new Error(`Manifest references missing chunk: ${manifestKey}`)
  }

  visitedKeys.add(manifestKey)
  files.add(chunk.file)

  for (const cssFile of chunk.css ?? []) {
    files.add(cssFile)
  }

  for (const assetFile of chunk.assets ?? []) {
    files.add(assetFile)
  }

  for (const importedChunk of chunk.imports ?? []) {
    addChunkFiles(manifest, importedChunk, files, visitedKeys)
  }
}

function resolveManifestKey(manifest, identifier) {
  if (manifest[identifier] !== undefined) {
    return identifier
  }

  const requestedName = identifier
    .replaceAll('\\', '/')
    .split('/')
    .at(-1)
    ?.replace(/\.(?:[cm]?[jt]sx?)$/u, '')
  const matches = Object.entries(manifest).filter(
    ([, chunk]) => chunk.name === requestedName || chunk.src === identifier,
  )

  if (matches.length !== 1) {
    throw new Error(
      `Unable to resolve first-screen manifest entry ${identifier}; found ${matches.length} matches.`,
    )
  }

  return matches[0][0]
}

function addLocalHtmlAssets(html, files) {
  const assetReference = /(?:src|href)=["']([^"']+)["']/gu

  for (const match of html.matchAll(assetReference)) {
    const reference = match[1]

    if (
      reference.startsWith('data:') ||
      reference.startsWith('http://') ||
      reference.startsWith('https://') ||
      reference.startsWith('//')
    ) {
      continue
    }

    const localPath = reference.split(/[?#]/u, 1)[0].replace(/^\.\//u, '').replace(/^\//u, '')

    if (localPath.length > 0) {
      files.add(localPath)
    }
  }
}

async function measureFiles(files) {
  return Promise.all(
    [...files].sort().map(async (file) => {
      const content = await readFile(join(distDirectory, file))
      return { file, ...compressedSizes(content) }
    }),
  )
}

function sumSizes(metrics) {
  return metrics.reduce(
    (total, metric) => ({
      raw: total.raw + metric.raw,
      gzip: total.gzip + metric.gzip,
      brotli: total.brotli + metric.brotli,
    }),
    { raw: 0, gzip: 0, brotli: 0 },
  )
}

function printMetrics(title, metrics) {
  console.log(`\n${title}`)

  for (const metric of metrics) {
    console.log(
      `  ${metric.file}: raw ${formatBytes(metric.raw)}, gzip ${formatBytes(metric.gzip)}, brotli ${formatBytes(metric.brotli)}`,
    )
  }
}

await assertBuildExists()

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const entryRecord =
  manifest['index.html'] ??
  Object.values(manifest).find((chunk) => chunk.isEntry === true)

if (entryRecord === undefined) {
  throw new Error('No entry chunk was found in the Vite manifest.')
}

const entryKey =
  manifest['index.html'] === entryRecord
    ? 'index.html'
    : Object.entries(manifest).find(([, chunk]) => chunk === entryRecord)?.[0]

if (entryKey === undefined) {
  throw new Error('Unable to resolve the Vite entry key.')
}

const initialFiles = new Set(['index.html'])
addChunkFiles(manifest, entryKey, initialFiles, new Set())

// Add only dynamic imports that are always requested before the current first screen
// becomes useful. Static imports are already traversed from the Vite entry manifest.
for (const dynamicEntry of firstScreenDynamicEntries) {
  addChunkFiles(
    manifest,
    resolveManifestKey(manifest, dynamicEntry),
    initialFiles,
    new Set(),
  )
}

const builtHtml = await readFile(join(distDirectory, 'index.html'), 'utf8')
addLocalHtmlAssets(builtHtml, initialFiles)

const initialMetrics = await measureFiles(initialFiles)
const initialTotals = sumSizes(initialMetrics)
const initialJavaScriptTotals = sumSizes(
  initialMetrics.filter(({ file }) => ['.js', '.mjs'].includes(extname(file))),
)

const emittedJavaScriptFiles = new Set(
  Object.values(manifest)
    .map(({ file }) => file)
    .filter((file) => ['.js', '.mjs'].includes(extname(file))),
)
const lazyFiles = new Set(
  [...emittedJavaScriptFiles].filter((file) => !initialFiles.has(file)),
)
const lazyMetrics = await measureFiles(lazyFiles)

printMetrics('Initial assets', initialMetrics)

console.log(
  `\nInitial total (${initialMetrics.length} requests): raw ${formatBytes(initialTotals.raw)}, gzip ${formatBytes(initialTotals.gzip)}, brotli ${formatBytes(initialTotals.brotli)}`,
)
console.log(`Initial JavaScript gzip: ${formatBytes(initialJavaScriptTotals.gzip)}`)

if (lazyMetrics.length > 0) {
  printMetrics('Lazy JavaScript chunks', lazyMetrics)
}

const warnings = []

if (initialTotals.gzip > budgets.targetInitialGzip) {
  warnings.push(
    `Initial gzip exceeds the ${formatBytes(budgets.targetInitialGzip)} internal target.`,
  )
}

if (initialJavaScriptTotals.gzip > budgets.targetInitialJavaScriptGzip) {
  warnings.push(
    `Initial JavaScript gzip exceeds the ${formatBytes(budgets.targetInitialJavaScriptGzip)} internal target.`,
  )
}

for (const metric of lazyMetrics) {
  if (metric.gzip > budgets.targetLazyChunkGzip) {
    warnings.push(
      `${metric.file} exceeds the ${formatBytes(budgets.targetLazyChunkGzip)} lazy-chunk target.`,
    )
  }
}

for (const warning of warnings) {
  console.warn(`WARNING: ${warning}`)
}

if (initialTotals.gzip >= budgets.hardInitialGzip) {
  console.error(
    `ERROR: Initial gzip must remain below ${formatBytes(budgets.hardInitialGzip)}.`,
  )
  process.exitCode = 1
} else {
  console.log(
    `PASS: Initial gzip is below the ${formatBytes(budgets.hardInitialGzip)} hard limit.`,
  )
}
