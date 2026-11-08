import { Effect, Schema as S } from "effect"
import { Bundle, DetailBucket, TrialIndex, bucketOf, fullTrial, tier, type Tiered } from "@trial-finder/domain"
import { mkdir, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { readJson, type Manifest } from "./files.js"

const sortKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value && typeof value === "object") {
    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
    return Object.fromEntries(entries.map(([k, v]) => [k, sortKeys(v)]))
  }
  return value
}

const plain = (value: unknown): unknown => JSON.parse(JSON.stringify(value))

const sameTrial = (a: unknown, b: unknown) => JSON.stringify(sortKeys(plain(a))) === JSON.stringify(sortKeys(plain(b)))

const findRoundTripFailure = (bundles: ReadonlyArray<Bundle>, { index, buckets }: Tiered): string | undefined => {
  for (const bundle of bundles)
    for (const trial of bundle.trials) {
      const entry = index.trials.find((e) => e.nctId === trial.nctId && e.group === bundle.group)!
      const detail = buckets[bucketOf(trial.nctId, index.bucketCount)]![trial.nctId]!
      if (!sameTrial(fullTrial(index, entry, detail), trial)) return trial.nctId
    }
  return undefined
}

const writeFiles = async (dir: string, manifest: Manifest, { index, buckets }: Tiered) => {
  await rm(join(dir, "details"), { recursive: true, force: true })
  await mkdir(join(dir, "details"), { recursive: true })
  await writeFile(join(dir, "index.json"), JSON.stringify(index))
  await Promise.all(buckets.map((bucket, i) => writeFile(join(dir, "details", `${String(i).padStart(3, "0")}.json`), JSON.stringify(bucket))))
  const entry = { file: "index.json", version: index.version, trials: index.trials.length, sites: index.sites.length, buckets: index.bucketCount, details: "details/{n}.json" }
  await writeFile(join(dir, "manifest.json"), JSON.stringify({ ...manifest, index: entry }))
}

export const writeTiered = (dir: string) =>
  Effect.gen(function* () {
    const manifest = yield* Effect.tryPromise(() => readJson<Manifest>(join(dir, "manifest.json")))
    const bundles = yield* Effect.forEach(manifest.groups, (g) =>
      Effect.tryPromise(async () => S.decodeUnknownSync(Bundle)(await readJson(join(dir, g.file))))
    )
    const tiered = tier(bundles)
    yield* S.decodeUnknown(TrialIndex)(plain(tiered.index))
    for (const bucket of tiered.buckets) yield* S.decodeUnknown(DetailBucket)(plain(bucket))

    const failed = findRoundTripFailure(bundles, tiered)
    if (failed) return yield* Effect.fail(new Error(`${failed}: index and detail do not rebuild the trial`))

    yield* Effect.tryPromise(() => writeFiles(dir, manifest, tiered))
    const { index } = tiered
    return { trials: index.trials.length, sites: index.sites.length, buckets: index.bucketCount }
  })
