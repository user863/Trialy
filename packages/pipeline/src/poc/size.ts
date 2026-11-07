import { createReadStream } from "node:fs"
import { readFile, writeFile, rm } from "node:fs/promises"
import { createInterface } from "node:readline"
import { join, resolve } from "node:path"
import { brotliCompressSync, constants, gzipSync } from "node:zlib"
import { DatabaseSync } from "node:sqlite"
import type { Trial } from "@trial-finder/domain"
import { config } from "../config.js"

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

const scope = arg("scope") ?? "covered"
const dir = resolve(arg("dir") ?? join(config.paths.cacheDir, "poc", scope))
const quality = Number(arg("brotli") ?? 11)

const writeCompressed = process.argv.includes("--write-compressed")

const header = (generatedAt: string) =>
  `{"group":"all","groupLabel":"All fields","version":"poc","generatedAt":"${generatedAt}","source":"ClinicalTrials.gov API v2","trials":[`
const footer = `],"changes":{"since":null,"added":[],"removed":[]}}`

const sizes = (buf: Buffer) => {
  const t0 = performance.now()
  const gz = gzipSync(buf, { level: 9 }).length
  const t1 = performance.now()
  const br = brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: quality, [constants.BROTLI_PARAM_SIZE_HINT]: buf.length, [constants.BROTLI_PARAM_LGWIN]: 24 } }).length
  return { raw: buf.length, gzip: gz, brotli: br, gzipMs: Math.round(t1 - t0), brotliMs: Math.round(performance.now() - t1) }
}

const lines: string[] = []
for await (const line of createInterface({ input: createReadStream(join(dir, "trials.ndjson")), crlfDelay: Infinity })) lines.push(line)
const fields = JSON.parse(await readFile(join(dir, "fields.json"), "utf8")) as Record<string, string[]>
const meta = JSON.parse(await readFile(join(dir, "meta.json"), "utf8")) as { fetchedAt: string }
const ids = lines.map((l) => /"nctId":"(NCT\d+)"/.exec(l)![1]!)

const joinLines = (ls: string[]) => {
  const parts: Buffer[] = [Buffer.from(header(meta.fetchedAt))]
  ls.forEach((l, i) => parts.push(Buffer.from(i ? "," + l : l)))
  parts.push(Buffer.from(footer))
  return Buffer.concat(parts)
}

const bundleBuf = joinLines(lines)
await writeFile(join(dir, "all.json"), bundleBuf)
const full = sizes(bundleBuf)

const shardLines = new Map<string, string[]>()
lines.forEach((l, i) => {
  for (const f of fields[ids[i]!] ?? ["other"]) {
    if (!shardLines.has(f)) shardLines.set(f, [])
    shardLines.get(f)!.push(l)
  }
})
const shards = [...shardLines.entries()].map(([field, ls]) => ({
  field,
  trials: ls.length,
  ...sizes(joinLines(ls))
}))
shards.sort((a, b) => b.raw - a.raw)

const dbPath = join(dir, "all.sqlite")
await rm(dbPath, { force: true })
const db = new DatabaseSync(dbPath)
db.exec(`
  PRAGMA page_size = 4096;
  CREATE TABLE trials (nct_id TEXT PRIMARY KEY, title TEXT, official_title TEXT, summary TEXT, status TEXT, phases TEXT, conditions TEXT, interventions TEXT, arm_labels TEXT, design TEXT, last_updated TEXT, status_verified TEXT, central_contact TEXT, other_ids TEXT, eligibility_text TEXT);
  CREATE TABLE sites (nct_id TEXT, facility TEXT, city TEXT, country TEXT, zip TEXT, status TEXT, lat REAL, lon REAL, contact_name TEXT, contact_email TEXT, contact_phone TEXT);
  CREATE TABLE criteria (nct_id TEXT, id TEXT, kind TEXT, text TEXT, rule TEXT, source TEXT, confidence TEXT);
  CREATE INDEX sites_country ON sites(country);
  CREATE INDEX sites_nct ON sites(nct_id);
  CREATE INDEX criteria_nct ON criteria(nct_id);
`)
const insTrial = db.prepare("INSERT INTO trials VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
const insSite = db.prepare("INSERT INTO sites VALUES (?,?,?,?,?,?,?,?,?,?,?)")
const insCrit = db.prepare("INSERT INTO criteria VALUES (?,?,?,?,?,?,?)")
const js = (v: unknown) => (v === undefined ? null : JSON.stringify(v))
db.exec("BEGIN")
for (const l of lines) {
  const t = JSON.parse(l) as Trial
  insTrial.run(t.nctId, t.title, t.officialTitle ?? null, t.briefSummary ?? null, t.status, js(t.phases), js(t.conditions), js(t.interventions), js(t.armLabels), js(t.design), t.lastUpdated, t.statusVerified ?? null, js(t.centralContact), js(t.otherIds), t.eligibilityText)
  for (const s of t.sites) insSite.run(t.nctId, s.facility, s.city, s.country, s.zip ?? null, s.status ?? null, s.lat ?? null, s.lon ?? null, s.contactName ?? null, s.contactEmail ?? null, s.contactPhone ?? null)
  for (const c of t.criteria) insCrit.run(t.nctId, c.id, c.kind, c.text, JSON.stringify(c.rule), c.source, c.confidence)
}
db.exec("COMMIT")
db.close()
const sqlite = sizes(await readFile(dbPath))

const stage = (b: ReturnType<typeof sizes>) => ({ ...b })
const result = {
  scope,
  trials: lines.length,
  sites: lines.reduce((n, l) => n + (l.match(/"facility":/g)?.length ?? 0), 0),
  brotliQuality: quality,
  fullIndex: stage(full),
  sqlite: stage(sqlite),
  shards: shards.map(stage),
  shardSum: { raw: shards.reduce((n, s) => n + s.raw, 0), brotli: shards.reduce((n, s) => n + s.brotli, 0), gzip: shards.reduce((n, s) => n + s.gzip, 0) }
}
await writeFile(join(dir, `sizes-q${quality}.json`), JSON.stringify(result, null, 2))
if (writeCompressed) {
  await writeFile(join(dir, "all.json.br"), brotliCompressSync(bundleBuf, { params: { [constants.BROTLI_PARAM_QUALITY]: quality, [constants.BROTLI_PARAM_LGWIN]: 24 } }))
  await writeFile(join(dir, "all.json.gz"), gzipSync(bundleBuf, { level: 9 }))
}
console.log(JSON.stringify(result, null, 2))
