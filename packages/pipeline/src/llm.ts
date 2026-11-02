import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import { Data, Effect, JSONSchema, Schema as S } from "effect"
import { Rule } from "@trial-finder/domain"
import { config } from "./config.js"
import { HAZARD_RE, NEG_RE, NEG_WORDS_RE, QUAL_RE } from "./extract.js"

class LlmError extends Data.TaggedError("LlmError")<{ message: string; cause?: unknown }> {}

const PROMPT_VERSION = "v2"

const Item = S.Struct({
  i: S.Number,
  rule: Rule,
  confidence: S.Literal("high", "low")
})
const Output = S.Struct({ items: S.Array(Item) })
const outputJsonSchema = JSONSchema.make(Output)

const SYSTEM = `You convert clinical-trial eligibility criteria for LUNG CANCER trials into structured rules.
Each input line is numbered. Return one item per line: {"i": <number>, "rule": <Rule>, "confidence": "high"|"low"}.

A rule is a PREDICATE ABOUT THE PATIENT, written the way the sentence states it. Whether it must be true (inclusion) or false (exclusion) is decided elsewhere. Do not negate a rule just because the line is an exclusion.
Rule types: cancerType(types: nsclc|sclc|adenocarcinoma|squamous), stage(stages I-IV, or extent limited|extensive for SCLC), biomarker(gene, state positive|negative), pdl1(min,max in percent TPS), priorTherapy(category: chemotherapy|immunotherapy|targeted|radiotherapy|surgery|systemic), priorLines(min,max: lines of drug treatment for advanced disease), currentTherapy, lab(analyte anc|platelets|hemoglobin|crcl, min,max; ANC and platelets in 10^9/L, hemoglobin in g/dL, crcl in mL/min), age(min,max years), sex, performanceStatus(ECOG min,max), flag(brainMetsAny|brainMetsActive|ild|autoimmune), other.
Combinators: allOf(rules), anyOf(rules), not(rule), narrow(rule).

STRICT RULES
1. If you are not sure, or the line needs anything the rule types cannot express, use {"_tag":"other"}. "other" is always safe; a wrong rule can wrongly exclude a patient.
2. If the sentence adds timing windows ("within 6 months"), exceptions ("unless", "except"), settings ("for advanced disease"), counts, or a more specific drug/variant than the rule says, wrap the rule in narrow(...).
3. If part of the sentence cannot be expressed, return allOf([<what you can express>, {"_tag":"other"}]) for inclusion lines. For exclusion lines use narrow(<rule>) or other.
4. In EXCLUSION lines never use cancerType or stage. Mixed histology or other tumour types mentioned there are not rules about this patient.
5. Lines specific to a cohort/arm/other tumour type, conditional requirements ("in the presence of..."), permissions ("is allowed") and anything about samples, consent or procedures are other.
6. Only use genes, numbers and drugs that literally appear in the line.
6b. NEGATION: if the line says no / not / never / without / absence of / must not have / wild-type / negative / treatment-naive, the rule must be wrapped in not(...) (for genes, biomarker with state negative is also fine). Example: "Subjects must not have had prior immunotherapy" => not(priorTherapy immunotherapy). "No prior systemic therapy for metastatic disease" => priorLines max 0.
7. Say "low" confidence whenever you used narrow, allOf with other, or guessed.`

const hash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 24)

type LlmConfig = typeof config.llm

type Cache = Record<string, { rule: unknown; confidence: string }>
let cache: Cache | null = null
let dirty = 0

const loadCache = async (path: string): Promise<Cache> => {
  if (cache) return cache
  try {
    cache = JSON.parse(await readFile(path, "utf8")) as Cache
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e
    cache = {}
  }
  return cache
}
export const flushCache = async (path: string) => {
  if (!cache || !dirty) return
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(cache))
  dirty = 0
}

const chat = (cfg: LlmConfig, user: string) =>
  Effect.tryPromise({
    try: async () => {
      const r = await fetch(`${cfg.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: cfg.model,
          stream: false,
          format: outputJsonSchema,
          options: { temperature: 0, num_ctx: cfg.contextTokens, seed: cfg.seed, num_predict: cfg.maxOutputTokens },
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: user }
          ]
        }),
        signal: AbortSignal.timeout(cfg.timeoutMs)
      })
      if (!r.ok) throw new Error(`Ollama HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`)
      const j = (await r.json()) as { message?: { content?: string } }
      return j.message?.content ?? ""
    },
    catch: (cause) => new LlmError({ message: "model call failed", cause })
  })


const collect = (r: Rule, f: (leaf: Rule) => void): void => {
  if (r._tag === "anyOf" || r._tag === "allOf") r.rules.forEach((x) => collect(x, f))
  else if (r._tag === "not" || r._tag === "narrow") collect(r.rule, f)
  else f(r)
}

const guardrail = (rule: Rule, text: string, kind: "inclusion" | "exclusion"): string | null => {
  let bad: string | null = null
  const norm = text.replace(/[‐-–]/g, "-")
  collect(rule, (l) => {
    if (bad) return
    if (kind === "exclusion" && (l._tag === "cancerType" || l._tag === "stage")) bad = "cancerType/stage in exclusion"
    if (l._tag === "biomarker" && !new RegExp(`\\b${l.gene.replace("ROS1", "ROS-?1")}\\b${l.gene === "HER2" ? "|ERBB2" : ""}`).test(norm)) bad = `gene ${l.gene} not in text`
    if (l._tag === "pdl1" && !/PD-?L-?1/i.test(norm)) bad = "PD-L1 not in text"
    if (l._tag === "performanceStatus" && !/ECOG|WHO|performance|Karnofsky/i.test(norm)) bad = "ECOG not in text"
    if (l._tag === "age" && !/\bage|years|older|\d{2}/i.test(norm)) bad = "age not in text"
    if (l._tag === "sex" && !/\b(fe)?male|women|woman|men\b|\bmen\b/i.test(norm)) bad = "sex not in text"
    if (l._tag === "currentTherapy" && !/currently|ongoing|concurrent|receiving/i.test(norm)) bad = "current therapy not in text"
    if (l._tag === "priorTherapy" && !/prior|previous|history|received|had|treated|exposure|naive|untreated|failed|progress/i.test(norm)) bad = "no prior-treatment cue"
    if (l._tag === "cancerType" && !/NSCLC|SCLC|lung|small[- ]cell|adenocarcinoma|squamous/i.test(norm)) bad = "cancer type not in text"
    if (l._tag === "stage" && !/stage|metastatic|advanced|locally|unresectable|extensive|limited|\b(IV|III|II|I)\b/i.test(norm)) bad = "stage not in text"
    if (l._tag === "lab") {
      const re = { anc: /neutrophil|ANC/i, platelets: /platelet/i, hemoglobin: /h(a)?emoglobin|\bHb\b/i, crcl: /creatinine|CrCl|GFR/i }[l.analyte]
      if (!re.test(norm) || /\bULN\b|upper limit/i.test(norm)) bad = `lab ${l.analyte} unsupported`
      if (l.analyte === "hemoglobin" && ((l.min ?? 0) > 20 || (l.max ?? 0) > 20)) bad = "hemoglobin unit"
      if (l.analyte === "anc" && ((l.min ?? 0) > 20 || (l.max ?? 0) > 20)) bad = "anc unit"
      if (l.analyte === "platelets" && ((l.min ?? 0) > 1000 || (l.max ?? 0) > 1000)) bad = "platelet unit"
    }
    if (l._tag === "age" && ((l.min ?? 18) < 12 || (l.max ?? 90) > 110)) bad = "age range"
    if (l._tag === "performanceStatus" && ((l.min ?? 0) < 0 || (l.max ?? 4) > 4)) bad = "ecog range"
    if (l._tag === "flag" && l.flag.startsWith("brain") && !/brain|cns|central nervous|leptomening/i.test(norm)) bad = "brain mets not in text"
    if (l._tag === "flag" && l.flag === "ild" && !/interstitial|\bILD\b|pneumonitis|fibrosis/i.test(norm)) bad = "ILD not in text"
    if (l._tag === "flag" && l.flag === "autoimmune" && !/autoimmun/i.test(norm)) bad = "autoimmune not in text"
  })
  if (bad) return bad
  const negated = NEG_RE.test(text.trim()) || NEG_WORDS_RE.test(text) || /\b(?:wild[- ]?type|must not|without|absence of|free of|no (?:prior|previous|history|evidence|known))\b/i.test(text)
  const hasNot = (r: Rule): boolean => r._tag === "not" || (r._tag === "biomarker" && r.state === "negative") || (r._tag === "priorLines" && r.max === 0) || ((r._tag === "allOf" || r._tag === "anyOf" || r._tag === "narrow") && ("rules" in r ? r.rules.some(hasNot) : hasNot((r as { rule: Rule }).rule)))
  const onlyOther = (r: Rule): boolean => r._tag === "other"
  if (negated && !hasNot(rule) && !onlyOther(rule)) return "negation not reflected"
  const narrowed = (r: Rule): boolean => r._tag === "narrow" || ((r._tag === "allOf" || r._tag === "anyOf") && r.rules.every(narrowed)) || (r._tag === "not" && narrowed(r.rule))
  const hasOther = (r: Rule): boolean => r._tag === "other" || ((r._tag === "allOf" || r._tag === "anyOf") && r.rules.some(hasOther))
  if (QUAL_RE.test(text) && !narrowed(rule) && !hasOther(rule)) return "qualifier present but rule not narrowed"
  return null
}

const OTHER: Rule = { _tag: "other" }
const decodeRule = S.decodeUnknownEither(Rule)

interface LlmResult {
  readonly rule: Rule
  readonly confidence: "high" | "low" | "none"
  readonly note?: string
}

export const extractSection = (
  cfg: LlmConfig,
  kind: "inclusion" | "exclusion",
  lines: ReadonlyArray<string>
): Effect.Effect<LlmResult[], LlmError> =>
  Effect.gen(function* () {
    const c = yield* Effect.promise(() => loadCache(cfg.cachePath))
    const keyOf = (t: string) => hash(`${PROMPT_VERSION}|${cfg.model}|${kind}|${t}`)
    const out: Array<LlmResult | null> = lines.map((t) => {
      const hit = c[keyOf(t)]
      return hit ? { rule: hit.rule as Rule, confidence: hit.confidence as LlmResult["confidence"] } : null
    })
    const todo = lines.map((t, i) => ({ t, i })).filter(({ i }) => out[i] === null)
    for (let s = 0; s < todo.length; s += cfg.chunkSize) {
      const chunk = todo.slice(s, s + cfg.chunkSize)
      const user = `Criterion type: ${kind.toUpperCase()}\n\n` + chunk.map((x, k) => `${k + 1}. ${x.t}`).join("\n")
      // a failed or runaway call must never break the build: those lines simply stay "other" (uncached, retried next run)
      const failed = Symbol("failed")
      const got = yield* chat(cfg, user).pipe(
        Effect.retry({ times: cfg.retries }),
        Effect.catchAll((e) => Effect.logWarning(`model call failed (${String((e.cause as Error)?.cause ?? e.cause)}); ${chunk.length} line(s) left as other`).pipe(Effect.as(failed)))
      )
      const raw = got === failed ? "" : (got as string)
      let parsed: ReadonlyArray<{ i: number; rule: unknown; confidence: string }> = []
      try {
        parsed = ((JSON.parse(raw) as { items?: unknown[] }).items ?? []) as typeof parsed
      } catch {
        /* every line in the chunk falls back to other */
      }
      chunk.forEach((x, k) => {
        const item = parsed.find((p) => p.i === k + 1)
        let res: LlmResult = { rule: OTHER, confidence: "none", note: "no usable output" }
        if (item) {
          const d = decodeRule(item.rule)
          if (d._tag === "Right") {
            const why = guardrail(d.right, x.t, kind)
            if (why !== null) res = { rule: OTHER, confidence: "none", note: `guardrail: ${why}` }
            else {
              let rule: Rule = d.right
              let conf: LlmResult["confidence"] = rule._tag === "other" ? "none" : item.confidence === "high" ? "high" : "low"
              const hasOther = (r: Rule): boolean => r._tag === "other" || ((r._tag === "allOf" || r._tag === "anyOf") && r.rules.some(hasOther))
              if (rule._tag !== "other" && kind === "inclusion" && !hasOther(rule) && (HAZARD_RE.test(x.t) || x.t.length > 170)) {
                rule = { _tag: "allOf", rules: [rule, OTHER] }
                conf = "low"
              }
              res = { rule, confidence: conf }
            }
          } else res = { rule: OTHER, confidence: "none", note: "schema invalid" }
        }
        out[x.i] = res
        if (got !== failed) {
          c[keyOf(x.t)] = { rule: res.rule, confidence: res.confidence }
          dirty++
        }
      })
    }
    yield* Effect.promise(() => flushCache(cfg.cachePath))
    return out as LlmResult[]
  })


