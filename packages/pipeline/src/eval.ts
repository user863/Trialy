import { Effect } from "effect"
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import type { Bundle, Rule } from "@trial-finder/domain"
import { classify } from "./extract.js"
import { config } from "./config.js"
import { extractSection } from "./llm.js"
import { GOLD } from "./gold.js"

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const which = (arg("extractor") ?? "rules") as "rules" | "llm"
const sampleN = Number(arg("sample") ?? 60)
const norm = (r: any): any => {
  if (!r || typeof r !== "object") return r
  if (r._tag === "biomarker" && r.state === "negative") return { _tag: "not", rule: { ...r, state: "positive" } }
  if (Array.isArray(r.rules)) return { ...r, rules: r.rules.map(norm) }
  if (r.rule) return { ...r, rule: norm(r.rule) }
  return r
}
const eq = (a: unknown, b: unknown) => JSON.stringify(norm(a)) === JSON.stringify(norm(b))
const isOther = (r: Rule) => r._tag === "other"
const verdict = (got: Rule, want: Rule | "other"): "exact" | "safe" | "risky" => {
  if (want === "other") return isOther(got) ? "exact" : got._tag === "narrow" ? "safe" : "risky"
  if (eq(got, want)) return "exact"
  if (isOther(got)) return "safe"
  if (got._tag === "narrow") return "safe" // narrowed: "yes" becomes unknown, so it cannot wrongly exclude
  return "risky"
}

const run = Effect.gen(function* () {
  const cfg = config.llm
  const rulesOf = (kind: "inclusion" | "exclusion", texts: string[]) =>
    which === "rules"
      ? Effect.succeed(texts.map((t) => ({ rule: classify(t, kind).rule, note: undefined as string | undefined })))
      : extractSection(cfg, kind, texts).pipe(Effect.map((rs) => rs.map((r) => ({ rule: r.rule, note: r.note }))))

  const results: Array<{ g: (typeof GOLD)[number]; got: Rule; v: string; note?: string }> = []
  for (const kind of ["inclusion", "exclusion"] as const) {
    const gs = GOLD.filter((g) => g.kind === kind)
    const rs = yield* rulesOf(kind, gs.map((g) => g.text))
    gs.forEach((g, i) => results.push({ g, got: rs[i]!.rule, v: verdict(rs[i]!.rule, g.expect), note: rs[i]!.note }))
  }
  const count = (v: string) => results.filter((r) => r.v === v).length
  console.log(`\n== gold set (${results.length} developer examples, extractor: ${which}${which === "llm" ? ` / ${cfg.model}` : ""})`)
  console.log(`exact ${count("exact")}   safe ${count("safe")}   RISKY ${count("risky")}`)
  for (const r of results.filter((x) => x.v === "risky")) {
    console.log(`  RISKY [${r.g.kind}] ${r.g.text.slice(0, 90)}\n        got ${JSON.stringify(r.got).slice(0, 160)}\n        want ${JSON.stringify(r.g.expect).slice(0, 160)}${r.note ? `\n        note ${r.note}` : ""}`)
  }

  if (which === "llm") {
    const here = dirname(fileURLToPath(import.meta.url))
    const bundle = JSON.parse(yield* Effect.promise(() => readFile(join(here, "../../web/public/data/lung.json"), "utf8"))) as Bundle
    const all = bundle.trials.flatMap((t) => t.criteria.filter((c) => c.source === "registry-text"))
    const step = Math.max(1, Math.floor(all.length / sampleN))
    const sample = all.filter((_, i) => i % step === 0).slice(0, sampleN)
    let agree = 0, llmOnly = 0, rulesOnly = 0, differ = 0, bothOther = 0
    const diffs: string[] = []
    for (const kind of ["inclusion", "exclusion"] as const) {
      const cs = sample.filter((c) => c.kind === kind)
      const rs = yield* extractSection(cfg, kind, cs.map((c) => c.text))
      cs.forEach((c, i) => {
        const a = c.rule, b = rs[i]!.rule
        if (isOther(a) && isOther(b)) bothOther++
        else if (eq(a, b)) agree++
        else if (isOther(a)) llmOnly++
        else if (isOther(b)) rulesOnly++
        else {
          differ++
          diffs.push(`[${kind}] ${c.text.slice(0, 110)}\n     rules ${JSON.stringify(a).slice(0, 130)}\n     llm   ${JSON.stringify(b).slice(0, 130)}`)
        }
      })
    }
    console.log(`\n== real text, ${sample.length} sampled criteria: rule-based vs ${cfg.model}`)
    console.log(`agree ${agree}   both other ${bothOther}   only LLM structured ${llmOnly}   only rules structured ${rulesOnly}   DIFFER ${differ}`)
    diffs.slice(0, 12).forEach((d) => console.log("  " + d))
  }
})

Effect.runPromise(run).catch((e) => {
  console.error(e)
  process.exit(1)
})
