import type { Criterion, Profile, Rule, Site, Trial, Tri } from "./schema.js"

export type Status = "met" | "notMet" | "unknown"

export type ProfileField =
  | "cancerType"
  | "histology"
  | "stage"
  | "sclcExtent"
  | `biomarker:${string}`
  | "pdl1"
  | `priorTherapy:${string}`
  | "priorLines"
  | "currentTherapy"
  | "age"
  | "sex"
  | "ecog"
  | "brainMets"
  | "ild"
  | "autoimmune"
  | `lab:${string}`

export interface EvalNode {
  readonly tag: Rule["_tag"]
  readonly result: Tri
  readonly rule: string
  readonly answer: string
  readonly field?: ProfileField
  readonly children?: ReadonlyArray<EvalNode>
}

export interface CriterionResult {
  readonly criterion: Criterion
  readonly status: Status
  readonly node: EvalNode
}

export type RecruitingTier = 0 | 1 | 2

export interface TrialMatch {
  readonly trial: Trial
  readonly results: ReadonlyArray<CriterionResult>
  readonly met: number
  readonly notMet: number
  readonly unknown: number
  /** of the unknown criteria, how many can only be settled by a person (no profile answer would resolve them) */
  readonly manual: number
  readonly hidden: boolean
  /** 2 = a site confirms it is recruiting, 1 = site status not stated, 0 = every listed site is closed or not recruiting */
  readonly recruiting: RecruitingTier
  readonly recruitingSites: number
  readonly distanceKm: number | null
  readonly nearestSite: Site | null
}


const not = (t: Tri): Tri => (t === "yes" ? "no" : t === "no" ? "yes" : "unknown")
const and = (ts: ReadonlyArray<Tri>): Tri =>
  ts.includes("no") ? "no" : ts.every((t) => t === "yes") ? "yes" : "unknown"
const or = (ts: ReadonlyArray<Tri>): Tri =>
  ts.includes("yes") ? "yes" : ts.every((t) => t === "no") ? "no" : "unknown"
const tri = (b: boolean): Tri => (b ? "yes" : "no")

const inRange = (v: number, min?: number, max?: number) =>
  (min === undefined || v >= min) && (max === undefined || v <= max)

export const describeRange = (min?: number, max?: number, unit = "") => {
  if (min !== undefined && max !== undefined) return min === max ? `${min}${unit}` : `${min} to ${max}${unit}`
  if (min !== undefined) return `${min}${unit} or more`
  if (max !== undefined) return `${max}${unit} or less`
  return "any"
}

const CANCER_LABEL: Record<string, string> = {
  nsclc: "non-small cell lung cancer",
  sclc: "small cell lung cancer",
  adenocarcinoma: "adenocarcinoma",
  squamous: "squamous cell carcinoma"
}
const THERAPY_LABEL: Record<string, string> = {
  chemotherapy: "chemotherapy",
  immunotherapy: "immunotherapy",
  targeted: "targeted therapy",
  radiotherapy: "radiotherapy",
  surgery: "surgery",
  systemic: "systemic (drug) therapy"
}
const FLAG_LABEL: Record<string, string> = {
  brainMetsAny: "brain metastases",
  brainMetsActive: "untreated or symptomatic brain metastases",
  ild: "interstitial lung disease or pneumonitis",
  autoimmune: "an autoimmune disease"
}
const LAB_LABEL: Record<string, string> = {
  anc: "neutrophil count (ANC, ×10⁹/L)",
  platelets: "platelet count (×10⁹/L)",
  hemoglobin: "hemoglobin (g/dL)",
  crcl: "creatinine clearance (mL/min)"
}
const ANSWER_UNKNOWN = "you answered “I don’t know” (or have not answered yet)"

const yn = (t: Tri) => (t === "yes" ? "yes" : t === "no" ? "no" : "don’t know")


export const describeRule = (rule: Rule): string => {
  switch (rule._tag) {
    case "cancerType":
      return rule.types.map((t) => CANCER_LABEL[t]).join(" or ")
    case "stage":
      return rule.extent
        ? `${rule.extent}-stage small cell lung cancer`
        : `stage ${rule.stages.join(", ")}`
    case "biomarker":
      return `${rule.gene} alteration ${rule.state === "positive" ? "present" : "not present (wild-type)"}`
    case "pdl1":
      return `PD-L1 expression (TPS) ${describeRange(rule.min, rule.max, "%")}`
    case "priorTherapy":
      return `has had ${THERAPY_LABEL[rule.category]}`
    case "priorLines":
      return `previous lines of drug therapy for advanced disease: ${describeRange(rule.min, rule.max)}`
    case "currentTherapy":
      return `currently on ${THERAPY_LABEL[rule.category]}`
    case "lab":
      return `${LAB_LABEL[rule.analyte]}: ${describeRange(rule.min, rule.max)}`
    case "age":
      return `age ${describeRange(rule.min, rule.max, " years")}`
    case "sex":
      return rule.sex
    case "performanceStatus":
      return `everyday fitness (ECOG ${describeRange(rule.min, rule.max)})`
    case "flag":
      return `has ${FLAG_LABEL[rule.flag]}`
    case "other":
      return "needs a check we cannot do automatically"
    case "anyOf":
      return rule.rules.map(describeRule).join("  OR  ")
    case "allOf":
      return rule.rules.map(describeRule).join("  AND  ")
    case "not":
      return `NOT (${describeRule(rule.rule)})`
    case "narrow":
      return `${describeRule(rule.rule)} (text adds conditions we cannot check)`
  }
}


const PD_RANGES = { lt1: [0, 0.999], "1to49": [1, 49.999], ge50: [50, 100] } as const
const PD_LABEL = { lt1: "below 1%", "1to49": "1–49%", ge50: "50% or higher" } as const

const leaf = (rule: Rule, result: Tri, answer: string, field?: ProfileField): EvalNode => ({
  tag: rule._tag,
  result,
  rule: describeRule(rule),
  answer,
  ...(field ? { field } : {})
})

export const evalRule = (rule: Rule, p: Profile): EvalNode => {
  switch (rule._tag) {
    case "cancerType": {
      const parts = rule.types.map((t): Tri => {
        if (t === "nsclc") return p.cancerType === "unknown" ? "unknown" : tri(p.cancerType === "nsclc")
        if (t === "sclc") return p.cancerType === "unknown" ? "unknown" : tri(p.cancerType === "sclc")
        if (p.cancerType === "sclc") return "no"
        if (p.histology === "unknown") return "unknown"
        return tri(p.histology === t)
      })
      const field: ProfileField = p.cancerType === "unknown" ? "cancerType" : "histology"
      const label =
        p.cancerType === "unknown"
          ? ANSWER_UNKNOWN
          : `${CANCER_LABEL[p.cancerType]}${p.histology !== "unknown" && p.histology !== "other" ? `, ${CANCER_LABEL[p.histology]}` : ""}`
      return leaf(rule, or(parts), `you said: ${label}`, field)
    }
    case "stage": {
      if (rule.extent) {
        const want = rule.extent
        let r: Tri = "unknown"
        if (p.cancerType === "sclc") {
          if (p.sclcExtent !== "unknown") r = tri(p.sclcExtent === want)
          else if (p.stage === "IV") r = want === "extensive" ? "yes" : "no"
          else if (p.stage === "I" || p.stage === "II") r = want === "limited" ? "yes" : "no"
        }
        return leaf(
          rule,
          r,
          p.sclcExtent !== "unknown" ? `you said: ${p.sclcExtent}-stage` : ANSWER_UNKNOWN,
          "sclcExtent"
        )
      }
      if (p.stage === "unknown") return leaf(rule, "unknown", ANSWER_UNKNOWN, "stage")
      return leaf(rule, tri(rule.stages.includes(p.stage)), `you said: stage ${p.stage}`, "stage")
    }
    case "biomarker": {
      const s = p.biomarkers[rule.gene] ?? "unknown"
      if (s === "unknown") return leaf(rule, "unknown", ANSWER_UNKNOWN, `biomarker:${rule.gene}`)
      return leaf(
        rule,
        tri(s === rule.state),
        `you said: ${rule.gene} ${s === "positive" ? "alteration present" : "no alteration"}`,
        `biomarker:${rule.gene}`
      )
    }
    case "pdl1": {
      if (p.pdl1 === "unknown") return leaf(rule, "unknown", ANSWER_UNKNOWN, "pdl1")
      const [lo, hi] = PD_RANGES[p.pdl1]
      const inside = (rule.min === undefined || lo >= rule.min) && (rule.max === undefined || hi <= rule.max)
      const outside = (rule.min !== undefined && hi < rule.min) || (rule.max !== undefined && lo > rule.max)
      return leaf(rule, inside ? "yes" : outside ? "no" : "unknown", `you said: PD-L1 ${PD_LABEL[p.pdl1]}`, "pdl1")
    }
    case "priorTherapy": {
      const f: ProfileField = `priorTherapy:${rule.category}`
      if (rule.category === "systemic") {
        const parts = (["chemotherapy", "immunotherapy", "targeted"] as const).map((c) => p.priorTherapies[c])
        let r = or(parts)
        if (p.priorLines !== null && p.priorLines > 0) r = "yes"
        return leaf(rule, r, r === "unknown" ? ANSWER_UNKNOWN : `you said: ${yn(r)}`, f)
      }
      const v = p.priorTherapies[rule.category as keyof Profile["priorTherapies"]]
      return leaf(rule, v, v === "unknown" ? ANSWER_UNKNOWN : `you said: ${yn(v)}`, f)
    }
    case "priorLines": {
      if (p.priorLines === null) return leaf(rule, "unknown", ANSWER_UNKNOWN, "priorLines")
      return leaf(rule, tri(inRange(p.priorLines, rule.min, rule.max)), `you said: ${p.priorLines} line(s)`, "priorLines")
    }
    case "currentTherapy": {
      if (p.currentTherapy === "unknown") return leaf(rule, "unknown", ANSWER_UNKNOWN, "currentTherapy")
      const cur = p.currentTherapy
      const r =
        rule.category === "systemic"
          ? tri(cur === "chemotherapy" || cur === "immunotherapy" || cur === "targeted")
          : tri(cur === rule.category)
      return leaf(rule, r, `you said: currently ${cur === "none" ? "no treatment" : THERAPY_LABEL[cur]}`, "currentTherapy")
    }
    case "lab": {
      const v = p.labs[rule.analyte]
      if (v === null) return leaf(rule, "unknown", "no value entered", `lab:${rule.analyte}`)
      return leaf(rule, tri(inRange(v, rule.min, rule.max)), `you entered: ${v}`, `lab:${rule.analyte}`)
    }
    case "age": {
      if (p.age === null) return leaf(rule, "unknown", ANSWER_UNKNOWN, "age")
      return leaf(rule, tri(inRange(p.age, rule.min, rule.max)), `you said: ${p.age} years`, "age")
    }
    case "sex": {
      if (p.sex === "unknown") return leaf(rule, "unknown", ANSWER_UNKNOWN, "sex")
      return leaf(rule, tri(p.sex === rule.sex), `you said: ${p.sex}`, "sex")
    }
    case "performanceStatus": {
      if (p.ecog === null) return leaf(rule, "unknown", ANSWER_UNKNOWN, "ecog")
      return leaf(rule, tri(inRange(p.ecog, rule.min, rule.max)), `you said: ECOG ${p.ecog}`, "ecog")
    }
    case "flag": {
      switch (rule.flag) {
        case "brainMetsAny":
        case "brainMetsActive": {
          const b = p.brainMets
          if (b === "unknown") return leaf(rule, "unknown", ANSWER_UNKNOWN, "brainMets")
          const present = rule.flag === "brainMetsAny" ? b !== "none" : b === "active"
          const lbl = b === "none" ? "no brain metastases" : b === "treated" ? "brain metastases, treated and stable" : "brain metastases, active"
          return leaf(rule, tri(present), `you said: ${lbl}`, "brainMets")
        }
        case "ild":
          return leaf(rule, p.ild, p.ild === "unknown" ? ANSWER_UNKNOWN : `you said: ${yn(p.ild)}`, "ild")
        case "autoimmune":
          return leaf(rule, p.autoimmune, p.autoimmune === "unknown" ? ANSWER_UNKNOWN : `you said: ${yn(p.autoimmune)}`, "autoimmune")
      }
      return leaf(rule, "unknown", ANSWER_UNKNOWN)
    }
    case "other":
      return leaf(rule, "unknown", "to be checked with your doctor")
    case "anyOf":
    case "allOf": {
      const children = rule.rules.map((r) => evalRule(r, p))
      const results = children.map((c) => c.result)
      return {
        tag: rule._tag,
        result: rule._tag === "anyOf" ? or(results) : and(results),
        rule: describeRule(rule),
        answer: "",
        children
      }
    }
    case "not": {
      const c = evalRule(rule.rule, p)
      return { tag: "not", result: not(c.result), rule: describeRule(rule), answer: c.answer, children: [c], ...(c.field ? { field: c.field } : {}) }
    }
    case "narrow": {
      const c = evalRule(rule.rule, p)
      return { ...c, tag: "narrow", result: c.result === "yes" ? "unknown" : c.result, children: [c] }
    }
  }
}


export const evalCriterion = (c: Criterion, p: Profile): CriterionResult => {
  const node = evalRule(c.rule, p)
  const r = node.result
  const status: Status =
    r === "unknown" ? "unknown" : c.kind === "inclusion" ? (r === "yes" ? "met" : "notMet") : r === "yes" ? "notMet" : "met"
  return { criterion: c, status, node }
}


export interface LatLon {
  readonly lat: number
  readonly lon: number
}

export const haversineKm = (a: LatLon, b: LatLon): number => {
  const R = 6371
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

const RECRUITING_SITE = new Set(["RECRUITING", "NOT_YET_RECRUITING", "ENROLLING_BY_INVITATION"])

export const recruitingSites = (t: Trial): ReadonlyArray<Site> => t.sites.filter((s) => s.status !== undefined && RECRUITING_SITE.has(s.status))

const unconfirmedSites = (t: Trial): ReadonlyArray<Site> => t.sites.filter((s) => s.status === undefined)

/** Registries often list trials as "recruiting" overall while every site in a region has closed. Such trials stay visible but rank lower. */
export const recruitingTier = (t: Trial): RecruitingTier =>
  recruitingSites(t).length > 0 ? 2 : unconfirmedSites(t).length > 0 ? 1 : 0

/** Sites to measure distance against: the best available tier, so a closed nearby site never stands in for an open far one. */
export const openSites = (t: Trial): ReadonlyArray<Site> => {
  const r = recruitingSites(t)
  if (r.length) return r
  const u = unconfirmedSites(t)
  return u.length ? u : t.sites
}

export const nearest = (t: Trial, home: LatLon | null): { site: Site | null; km: number | null } => {
  if (!home) return { site: null, km: null }
  let best: { site: Site | null; km: number | null } = { site: null, km: null }
  for (const s of openSites(t)) {
    if (s.lat === undefined || s.lon === undefined) continue
    const km = haversineKm(home, { lat: s.lat, lon: s.lon })
    if (best.km === null || km < best.km) best = { site: s, km }
  }
  return best
}


export const matchTrial = (trial: Trial, p: Profile, home: LatLon | null): TrialMatch => {
  const results = trial.criteria.map((c) => evalCriterion(c, p))
  const met = results.filter((r) => r.status === "met").length
  const notMet = results.filter((r) => r.status === "notMet").length
  const unknown = results.length - met - notMet
  const answerable = (n: EvalNode): boolean => (n.children ? n.children.some(answerable) : n.result === "unknown" && !!n.field)
  const manual = results.filter((r) => r.status === "unknown" && !answerable(r.node)).length
  const { site, km } = nearest(trial, home)
  return {
    trial,
    results,
    met,
    notMet,
    unknown,
    manual,
    hidden: notMet > 0,
    recruiting: recruitingTier(trial),
    recruitingSites: recruitingSites(trial).length,
    distanceKm: km,
    nearestSite: site
  }
}

export const compareMatches = (a: TrialMatch, b: TrialMatch): number =>
  Number(a.hidden) - Number(b.hidden) ||
  b.recruiting - a.recruiting ||
  b.met - a.met ||
  a.unknown - b.unknown ||
  (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) ||
  a.trial.nctId.localeCompare(b.trial.nctId)

export const matchTrials = (trials: ReadonlyArray<Trial>, p: Profile, home: LatLon | null): TrialMatch[] =>
  trials.map((t) => matchTrial(t, p, home)).sort(compareMatches)

export const unknownImpact = (
  matches: ReadonlyArray<TrialMatch>
): Array<{ field: ProfileField; trials: number; criteria: number }> => {
  const byField = new Map<ProfileField, { trials: Set<string>; criteria: number }>()
  const walk = (n: EvalNode, acc: Set<ProfileField>) => {
    if (n.children) n.children.forEach((c) => walk(c, acc))
    else if (n.result === "unknown" && n.field) acc.add(n.field)
  }
  for (const m of matches) {
    if (m.hidden) continue
    for (const r of m.results) {
      if (r.status !== "unknown") continue
      const fields = new Set<ProfileField>()
      walk(r.node, fields)
      for (const f of fields) {
        const e = byField.get(f) ?? { trials: new Set<string>(), criteria: 0 }
        e.trials.add(m.trial.nctId)
        e.criteria++
        byField.set(f, e)
      }
    }
  }
  return [...byField.entries()]
    .map(([field, e]) => ({ field, trials: e.trials.size, criteria: e.criteria }))
    .sort((a, b) => b.trials - a.trials || b.criteria - a.criteria)
}

export const STALE_AFTER_DAYS = 180

export const isStale = (t: Trial, now: Date, days = STALE_AFTER_DAYS): boolean => {
  const d = Date.parse(t.lastUpdated)
  return Number.isFinite(d) ? now.getTime() - d > days * 86_400_000 : true
}
