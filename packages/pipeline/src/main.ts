import { Effect, Schema as S } from "effect"
import { Bundle, type Trial } from "@trial-finder/domain"
import { mkdir, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { fetchStudies, normalise } from "./ctgov.js"
import { config } from "./config.js"
import { readJson, readJsonIfPresent, type Manifest, type ManifestGroup } from "./files.js"
import { postcodeBundle } from "./geo.js"
import { GROUPS, type GroupConfig } from "./groups.js"
import { fillLocations } from "./locations.js"
import { coverageStats, reviewQueue } from "./report.js"
import { writeTiered } from "./tiered.js"

const option = (name: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`)
  if (i < 0) return undefined
  const next = process.argv[i + 1]
  return next && !next.startsWith("--") ? next : "true"
}

const outputDir = () => resolve(option("out") ?? config.paths.defaultOut)

const readLimit = () => {
  const limit = option("limit") === undefined ? Infinity : Number(option("limit"))
  return Number.isNaN(limit) || limit < 1 ? Effect.fail(new Error("--limit must be a positive number")) : Effect.succeed(limit)
}

const logLocations = (id: string, located: ReturnType<typeof fillLocations>) =>
  Effect.log(`${id}: ${located.exact} sites located from the same hospital, ${located.approximate} from the city centre, ${located.missing} still without coordinates`)

const writePostcodes = (dir: string) =>
  Effect.gen(function* () {
    if (option("skip-geo") !== undefined) return
    const counts = yield* postcodeBundle(config.paths.cacheDir, dir)
    yield* Effect.log(`postcode table: ${JSON.stringify(counts)}`)
  })

const writeIndex = (dir: string) =>
  Effect.gen(function* () {
    const tiers = yield* writeTiered(dir)
    yield* Effect.log(`index: ${tiers.trials} trials, ${tiers.sites} distinct sites, ${tiers.buckets} detail buckets`)
  })

const reindex = Effect.gen(function* () {
  const dir = outputDir()
  const manifest = yield* Effect.tryPromise(() => readJson<Manifest>(join(dir, "manifest.json")))
  for (const g of manifest.groups) {
    const bundle = yield* Effect.tryPromise(() => readJson<Bundle>(join(dir, g.file)))
    const located = fillLocations(bundle.trials)
    yield* logLocations(g.id, located)
    yield* Effect.tryPromise(() => writeFile(join(dir, g.file), JSON.stringify({ ...bundle, trials: located.trials })))
  }
  yield* writePostcodes(dir)
  yield* writeIndex(dir)
})

const versionOf = (date: Date) => date.toISOString().slice(0, 16).replace(/[-:T]/g, "")

const changesSince = (previous: Bundle | null, trials: ReadonlyArray<Trial>): Bundle["changes"] => {
  if (!previous) return { since: null, added: [], removed: [] }
  const before = new Set(previous.trials.map((t) => t.nctId))
  const now = new Set(trials.map((t) => t.nctId))
  return {
    since: previous.version,
    added: trials.filter((t) => !before.has(t.nctId)).map((t) => t.nctId),
    removed: [...before].filter((id) => !now.has(id))
  }
}

const writeGroupFiles = (dir: string, group: GroupConfig, bundle: Bundle) =>
  Effect.tryPromise(async () => {
    const manifestPath = join(dir, "manifest.json")
    const earlier = (await readJsonIfPresent<Manifest>(manifestPath))?.groups ?? []
    const entry: ManifestGroup = { id: group.id, label: group.label, version: bundle.version, trials: bundle.trials.length, file: `${group.id}.json` }
    const groups = [...earlier.filter((g) => g.id !== group.id), entry].sort((a, b) => a.id.localeCompare(b.id))
    await writeFile(join(dir, entry.file), JSON.stringify(bundle))
    await writeFile(manifestPath, JSON.stringify({ groups, generatedAt: bundle.generatedAt }))
    await writeFile(join(dir, `${group.id}.stats.json`), JSON.stringify(coverageStats(bundle.trials), null, 2))
    await writeFile(join(dir, `${group.id}.review-queue.json`), JSON.stringify(reviewQueue(bundle.trials), null, 2))
  })

const build = (group: GroupConfig) =>
  Effect.gen(function* () {
    const dir = outputDir()
    const limit = yield* readLimit()
    yield* Effect.tryPromise(() => mkdir(dir, { recursive: true }))

    const studies = yield* fetchStudies(group, limit)
    const normalised = (yield* normalise(studies, group)).sort((a, b) => a.nctId.localeCompare(b.nctId))
    const trials = fillLocations(normalised).trials

    const previous = yield* Effect.tryPromise(() => readJsonIfPresent<Bundle>(join(dir, `${group.id}.json`)))
    const now = new Date()
    const bundle: Bundle = {
      group: group.id,
      groupLabel: group.label,
      version: versionOf(now),
      generatedAt: now.toISOString(),
      source: "ClinicalTrials.gov API v2",
      trials,
      changes: changesSince(previous, trials)
    }
    yield* S.decodeUnknown(Bundle)(bundle)
    yield* writeGroupFiles(dir, group, bundle)

    const stats = coverageStats(trials)
    yield* Effect.log(`wrote ${trials.length} trials (${stats.coverage}% of ${stats.textCriteria} text criteria structured; ${reviewQueue(trials).length} queued for review)`)
    yield* writePostcodes(dir)
    yield* writeIndex(dir)
  })

const program = Effect.gen(function* () {
  if (option("reindex") !== undefined) return yield* reindex
  const group = GROUPS[option("group") ?? "lung"]
  if (!group) return yield* Effect.fail(new Error(`unknown group; known: ${Object.keys(GROUPS).join(", ")}`))
  return yield* build(group)
})

Effect.runPromise(program).catch((e) => {
  console.error(e)
  process.exit(1)
})
