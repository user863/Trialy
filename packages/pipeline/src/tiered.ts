import { Effect, Schema as S } from "effect"
import { Bundle, DetailBucket, TrialIndex, bucketOf, fullTrial, tier } from "@trial-finder/domain"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"

const canonical = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(canonical) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, canonical(x)])) : v

const stable = (v: unknown): string => JSON.stringify(canonical(JSON.parse(JSON.stringify(v))))

export const writeTiered = (out: string) =>
  Effect.gen(function* () {
    const manifestPath = join(out, "manifest.json")
    const manifest = yield* Effect.tryPromise(async () => JSON.parse(await readFile(manifestPath, "utf8")) as { groups: Array<{ id: string; file: string }> })
    const bundles = yield* Effect.forEach(manifest.groups, (g) =>
      Effect.tryPromise(async () => S.decodeUnknownSync(Bundle)(JSON.parse(await readFile(join(out, g.file), "utf8"))))
    )
    const { index, buckets } = tier(bundles)
    yield* S.decodeUnknown(TrialIndex)(JSON.parse(JSON.stringify(index)))
    for (const b of buckets) yield* S.decodeUnknown(DetailBucket)(JSON.parse(JSON.stringify(b)))

    for (const b of bundles)
      for (const t of b.trials) {
        const entry = index.trials.find((e) => e.nctId === t.nctId && e.group === b.group)!
        const detail = buckets[bucketOf(t.nctId, index.bucketCount)]![t.nctId]!
        if (stable(fullTrial(index, entry, detail)) !== stable(t)) return yield* Effect.fail(new Error(`${t.nctId}: index and detail do not rebuild the trial`))
      }

    yield* Effect.tryPromise(async () => {
      await rm(join(out, "details"), { recursive: true, force: true })
      await mkdir(join(out, "details"), { recursive: true })
      await writeFile(join(out, "index.json"), JSON.stringify(index))
      await Promise.all(buckets.map((b, i) => writeFile(join(out, "details", `${String(i).padStart(3, "0")}.json`), JSON.stringify(b))))
      const current = JSON.parse(await readFile(manifestPath, "utf8")) as Record<string, unknown>
      await writeFile(
        manifestPath,
        JSON.stringify({ ...current, index: { file: "index.json", version: index.version, trials: index.trials.length, sites: index.sites.length, buckets: index.bucketCount, details: "details/{n}.json" } })
      )
    })
    return { trials: index.trials.length, sites: index.sites.length, buckets: index.bucketCount }
  })
