import { createReadStream } from "node:fs"
import { mkdir, rm, writeFile } from "node:fs/promises"
import { createInterface } from "node:readline"
import { join, resolve } from "node:path"
import { brotliCompressSync, constants, gzipSync } from "node:zlib"
import { bucketOf, fullTrial, tier, type Bundle, type Trial } from "@trial-finder/domain"
import { config } from "../config.js"
import { fillLocations } from "../locations.js"

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

const scope = arg("scope") ?? "covered"
const dir = resolve(arg("dir") ?? join(config.paths.cacheDir, "poc", scope))
const out = join(dir, "tiered")

const brotli = (buf: Buffer) =>
  brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 9, [constants.BROTLI_PARAM_SIZE_HINT]: buf.length, [constants.BROTLI_PARAM_LGWIN]: 24 } })

const trials: Trial[] = []
for await (const line of createInterface({ input: createReadStream(join(dir, "trials.ndjson")), crlfDelay: Infinity })) trials.push(JSON.parse(line) as Trial)

const located = fillLocations(trials)
const bundle: Bundle = {
  group: "all",
  groupLabel: "All fields",
  version: "poc",
  generatedAt: new Date().toISOString(),
  source: "ClinicalTrials.gov API v2",
  trials: located.trials,
  changes: { since: null, added: [], removed: [] }
}
const { index, buckets } = tier([bundle])

const canonical = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(canonical) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, canonical(x)])) : v
const same = (a: unknown, b: unknown) => JSON.stringify(canonical(JSON.parse(JSON.stringify(a)))) === JSON.stringify(canonical(JSON.parse(JSON.stringify(b))))
let checked = 0
for (let i = 0; i < index.trials.length; i += 13) {
  const entry = index.trials[i]!
  const detail = buckets[bucketOf(entry.nctId, index.bucketCount)]![entry.nctId]!
  if (!same(fullTrial(index, entry, detail), located.trials[i])) throw new Error(`${entry.nctId} does not rebuild`)
  checked++
}

await rm(out, { recursive: true, force: true })
await mkdir(join(out, "details"), { recursive: true })
const file = async (name: string, data: unknown) => {
  const raw = Buffer.from(JSON.stringify(data))
  const br = brotli(raw)
  await writeFile(join(out, name), raw)
  await writeFile(join(out, `${name}.br`), br)
  return { raw: raw.length, gzip: gzipSync(raw, { level: 9 }).length, brotli: br.length }
}

const mib = (n: number) => Math.round((n / 1048576) * 100) / 100
const indexSize = await file("index.json", index)
const detailSizes: Array<{ raw: number; gzip: number; brotli: number }> = []
for (const [i, b] of buckets.entries()) detailSizes.push(await file(`details/${String(i).padStart(3, "0")}.json`, b))
const sum = (k: "raw" | "gzip" | "brotli") => detailSizes.reduce((n, s) => n + s[k], 0)
const result = {
  scope,
  trials: index.trials.length,
  distinctSites: index.sites.length,
  locations: { filledFromSameHospital: located.exact, filledFromCityCentre: located.approximate, stillMissing: located.missing },
  roundTripChecked: checked,
  indexMiB: { raw: mib(indexSize.raw), gzip: mib(indexSize.gzip), brotli: mib(indexSize.brotli) },
  buckets: {
    count: buckets.length,
    avgBrotliMiB: mib(sum("brotli") / buckets.length),
    maxBrotliMiB: mib(Math.max(...detailSizes.map((s) => s.brotli))),
    totalMiB: { raw: mib(sum("raw")), gzip: mib(sum("gzip")), brotli: mib(sum("brotli")) }
  }
}
await writeFile(join(dir, "tiered-sizes.json"), JSON.stringify(result, null, 2))
console.log(JSON.stringify(result, null, 2))
