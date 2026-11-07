import { Effect, Schema as S } from "effect"
import { Bundle, type Rule, type Trial } from "@trial-finder/domain"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { fetchStudies, normalise } from "./ctgov.js"
import { postcodeBundle } from "./geo.js"
import { fillLocations } from "./locations.js"
import { writeTiered } from "./tiered.js"
import { config } from "./config.js"
import { extractSection, flushCache } from "./llm.js"
import { splitCriteria } from "./extract.js"
import { GROUPS } from "./groups.js"

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? (process.argv[i + 1] && !process.argv[i + 1]!.startsWith("--") ? process.argv[i + 1]! : "true") : undefined
}

const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7)

const stats = (trials: ReadonlyArray<Trial>) => {
  const crit = trials.flatMap((t) => t.criteria.filter((c) => c.source === "registry-text"))
  const structured = crit.filter((c) => c.confidence !== "none")
  const byTag: Record<string, number> = {}
  const walk = (r: any) => {
    if (r._tag === "anyOf" || r._tag === "allOf") r.rules.forEach(walk)
    else if (r._tag === "not" || r._tag === "narrow") walk(r.rule)
    else byTag[r._tag] = (byTag[r._tag] ?? 0) + 1
  }
  crit.forEach((c) => walk(c.rule))
  return {
    trials: trials.length,
    textCriteria: crit.length,
    structured: structured.length,
    coverage: crit.length ? Math.round((structured.length / crit.length) * 1000) / 10 : 0,
    highConfidence: crit.filter((c) => c.confidence === "high").length,
    lowConfidence: crit.filter((c) => c.confidence === "low").length,
    ruleTypes: byTag
  }
}

const program = Effect.gen(function* () {
  if (arg("reindex") !== undefined) {
    const dir = resolve(arg("out") ?? config.paths.defaultOut)
    const manifest = yield* Effect.tryPromise(async () => JSON.parse(await readFile(join(dir, "manifest.json"), "utf8")) as { groups: Array<{ id: string; file: string }> })
    for (const g of manifest.groups) {
      const bundle = yield* Effect.tryPromise(async () => JSON.parse(await readFile(join(dir, g.file), "utf8")) as Bundle)
      const located = fillLocations(bundle.trials)
      yield* Effect.log(`${g.id}: ${located.exact} sites located from the same hospital, ${located.approximate} from the city centre, ${located.missing} still without coordinates`)
      yield* Effect.tryPromise(() => writeFile(join(dir, g.file), JSON.stringify({ ...bundle, trials: located.trials })))
    }
    const counts = yield* postcodeBundle(config.paths.cacheDir, dir)
    yield* Effect.log(`postcode table: ${JSON.stringify(counts)}`)
    const tiers = yield* writeTiered(dir)
    yield* Effect.log(`index: ${tiers.trials} trials, ${tiers.sites} distinct sites, ${tiers.buckets} detail buckets`)
    return
  }
  const group = GROUPS[arg("group") ?? "lung"]
  if (!group) return yield* Effect.fail(new Error(`unknown group; known: ${Object.keys(GROUPS).join(", ")}`))
  const out = resolve(arg("out") ?? config.paths.defaultOut)
  const limit = arg("limit") === undefined ? Infinity : Number(arg("limit"))
  if (Number.isNaN(limit) || limit < 1) return yield* Effect.fail(new Error("--limit must be a positive number"))
  yield* Effect.tryPromise(() => mkdir(out, { recursive: true }))

  const raw = yield* fetchStudies(group, limit)
  let trials = (yield* normalise(raw, group)).sort((a, b) => a.nctId.localeCompare(b.nctId))
  trials = fillLocations(trials).trials

  const extractor = arg("extractor") ?? "rules"
  if (!["rules", "llm", "hybrid"].includes(extractor)) return yield* Effect.fail(new Error(`unknown --extractor "${extractor}"`))
  if (group.reader !== "lung" && extractor !== "rules") return yield* Effect.fail(new Error(`group "${group.id}" has no disease-specific extractor; use --extractor rules`))
  if (extractor === "llm" || extractor === "hybrid") {
    const cfg = config.llm
    yield* Effect.log(`extracting criteria with ${cfg.model} (${extractor}); results are cached, reruns are fast`)
    let done = 0
    trials = yield* Effect.forEach(trials, (t) =>
      Effect.gen(function* () {
        const items = splitCriteria(t.eligibilityText)
        const res: Array<{ rule: Rule; confidence: "high" | "low" | "none" } | undefined> = new Array(items.length)
        for (const kind of ["inclusion", "exclusion"] as const) {
          const idx = items.map((it, i) => ({ it, i })).filter((x) => x.it.kind === kind)
          if (!idx.length) continue
          const r = yield* extractSection(cfg, kind, idx.map((x) => x.it.text))
          idx.forEach((x, k) => (res[x.i] = r[k]))
        }
        const rulesBased = t.criteria.filter((c) => c.source === "registry-text")
        const fromText = items.map((it, i) => {
          let got = res[i]!
          // hybrid: where the model gave up but the tested rule-based reader was confident, keep the latter
          const rb = rulesBased[i]
          if (extractor === "hybrid" && got.rule._tag === "other" && rb && rb.rule._tag !== "other") got = { rule: rb.rule, confidence: rb.confidence }
          return { id: `${t.nctId}-${i}`, kind: it.kind, text: it.text, rule: got.rule, source: "registry-text" as const, confidence: got.confidence }
        })
        if (++done % 25 === 0) yield* Effect.log(`  ${done}/${trials.length} trials`)
        return { ...t, criteria: [...t.criteria.filter((c) => c.source === "registry-field"), ...fromText] }
      })
    )
    yield* Effect.promise(() => flushCache(cfg.cachePath))
  }

  const prevPath = join(out, `${group.id}.json`)
  const prev = yield* Effect.tryPromise(async () => JSON.parse(await readFile(prevPath, "utf8")) as Bundle).pipe(
    Effect.catchAll((e) =>
      (e.error as NodeJS.ErrnoException).code === "ENOENT" ? Effect.succeed(null) : Effect.fail(e)
    )
  )
  const prevIds = new Set(prev?.trials.map((t) => t.nctId) ?? [])
  const ids = new Set(trials.map((t) => t.nctId))
  const now = new Date()
  const version = now.toISOString().slice(0, 16).replace(/[-:T]/g, "")

  const bundle: Bundle = {
    group: group.id,
    groupLabel: group.label,
    version,
    generatedAt: now.toISOString(),
    source: "ClinicalTrials.gov API v2",
    trials,
    changes: {
      since: prev?.version ?? null,
      added: prev ? trials.filter((t) => !prevIds.has(t.nctId)).map((t) => t.nctId) : [],
      removed: prev ? [...prevIds].filter((i) => !ids.has(i)) : []
    }
  }
  yield* S.decodeUnknown(Bundle)(bundle)

  const s = stats(trials)
  const review = trials.flatMap((t) =>
    t.criteria
      .filter((c) => c.source === "registry-text" && (c.confidence === "low" || (c.confidence === "high" && hash(c.id) % 20 === 0)))
      .map((c) => ({ trial: t.nctId, id: c.id, kind: c.kind, confidence: c.confidence, text: c.text, rule: c.rule }))
  )
  yield* Effect.tryPromise(async () => {
    await writeFile(prevPath, JSON.stringify(bundle))
    const manifestPath = join(out, "manifest.json")
    const earlier = await readFile(manifestPath, "utf8").then((s) => (JSON.parse(s) as { groups: Array<{ id: string }> }).groups, () => [])
    const entry = { id: group.id, label: group.label, version, trials: trials.length, file: `${group.id}.json` }
    const groups = [...earlier.filter((g) => g.id !== group.id), entry].sort((a, b) => a.id.localeCompare(b.id))
    await writeFile(manifestPath, JSON.stringify({ groups, generatedAt: bundle.generatedAt }))
    await writeFile(join(out, `${group.id}.stats.json`), JSON.stringify(s, null, 2))
    await writeFile(join(out, `${group.id}.review-queue.json`), JSON.stringify(review, null, 2))
  })
  yield* Effect.log(`wrote ${trials.length} trials (${s.coverage}% of ${s.textCriteria} text criteria structured; ${review.length} queued for review)`)

  if (arg("skip-geo") === undefined) {
    const counts = yield* postcodeBundle(config.paths.cacheDir, out)
    yield* Effect.log(`postcode table: ${JSON.stringify(counts)}`)
  }
  const tiers = yield* writeTiered(out)
  yield* Effect.log(`index: ${tiers.trials} trials, ${tiers.sites} distinct sites, ${tiers.buckets} detail buckets`)
})

Effect.runPromise(program).catch((e) => {
  console.error(e)
  process.exit(1)
})
