import { Schema as S } from "effect"
import { Criterion, Rule, type Bundle, type Site, type Trial } from "./schema.js"

const defined = <K extends string, V>(key: K, value: V | undefined): { [P in K]?: V } =>
  value === undefined ? {} : ({ [key]: value } as { [P in K]: V })

export const IndexSite = S.Struct({
  facility: S.String,
  city: S.String,
  country: S.String,
  lat: S.optional(S.Number),
  lon: S.optional(S.Number),
  approxLocation: S.optional(S.Boolean)
})
export type IndexSite = typeof IndexSite.Type

const Confidence = S.Literal("high", "low", "none")

export const IndexTrial = S.Struct({
  nctId: S.String,
  group: S.String,
  title: S.String,
  status: S.Literal("RECRUITING", "NOT_YET_RECRUITING", "OTHER"),
  phases: S.Array(S.String),
  conditions: S.Array(S.String),
  interventionTypes: S.Array(S.String),
  lastUpdated: S.String,
  statusVerified: S.optional(S.String),
  sites: S.Array(S.Tuple(S.Number, S.optionalElement(S.String))),
  fieldCriteria: S.Array(Criterion),
  kinds: S.String,
  rules: S.Array(S.Tuple(S.Number, Confidence, Rule))
})
export type IndexTrial = typeof IndexTrial.Type

export const IndexGroup = S.Struct({
  id: S.String,
  label: S.String,
  version: S.String,
  generatedAt: S.String,
  source: S.String,
  trials: S.Number,
  changes: S.Struct({ since: S.NullOr(S.String), added: S.Array(S.String), removed: S.Array(S.String) })
})
export type IndexGroup = typeof IndexGroup.Type

export const TrialIndex = S.Struct({
  version: S.String,
  generatedAt: S.String,
  bucketCount: S.Number,
  groups: S.Array(IndexGroup),
  sites: S.Array(IndexSite),
  trials: S.Array(IndexTrial)
})
export type TrialIndex = typeof TrialIndex.Type

const SiteExtra = S.Struct({
  zip: S.optional(S.String),
  contactName: S.optional(S.String),
  contactEmail: S.optional(S.String),
  contactPhone: S.optional(S.String)
})
type SiteExtra = typeof SiteExtra.Type

export const TrialDetail = S.Struct({
  officialTitle: S.optional(S.String),
  briefSummary: S.optional(S.String),
  eligibilityText: S.String,
  texts: S.Array(S.String),
  interventionNames: S.Array(S.String),
  armLabels: S.Array(S.String),
  design: S.Struct({ allocation: S.optional(S.String), model: S.optional(S.String), masking: S.optional(S.String) }),
  centralContact: S.optional(S.Struct({ name: S.optional(S.String), email: S.optional(S.String), phone: S.optional(S.String) })),
  otherIds: S.Struct({
    euCt: S.optional(S.Array(S.String)),
    eudraCt: S.optional(S.Array(S.String)),
    drks: S.optional(S.Array(S.String))
  }),
  siteExtras: S.Array(S.NullOr(SiteExtra))
})
export type TrialDetail = typeof TrialDetail.Type

export const DetailBucket = S.Record({ key: S.String, value: TrialDetail })
export type DetailBucket = typeof DetailBucket.Type

export const bucketOf = (nctId: string, count: number): number => {
  let h = 2166136261
  for (let i = 0; i < nctId.length; i++) {
    h ^= nctId.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) % count
}

export const TARGET_BUCKET_SIZE = 200
export const MAX_BUCKETS = 256

export const bucketCountFor = (trials: number) => Math.max(1, Math.min(MAX_BUCKETS, Math.floor(trials / TARGET_BUCKET_SIZE)))

const OTHER: Rule = { _tag: "other" }

export const makeSiteTable = () => {
  const rows: IndexSite[] = []
  const ids = new Map<string, number>()
  return {
    rows,
    intern: (s: Site): number => {
      const key = JSON.stringify([s.facility, s.city, s.country, s.lat ?? null, s.lon ?? null, s.approxLocation ?? null])
      let i = ids.get(key)
      if (i === undefined) {
        i = rows.length
        ids.set(key, i)
        rows.push({
          facility: s.facility,
          city: s.city,
          country: s.country,
          ...defined("lat", s.lat),
          ...defined("lon", s.lon),
          ...defined("approxLocation", s.approxLocation)
        })
      }
      return i
    }
  }
}

const siteExtra = (s: Site): SiteExtra | null => {
  const extra: SiteExtra = {
    ...defined("zip", s.zip),
    ...defined("contactName", s.contactName),
    ...defined("contactEmail", s.contactEmail),
    ...defined("contactPhone", s.contactPhone)
  }
  return Object.keys(extra).length ? extra : null
}

const splitCriteria = (t: Trial) => {
  const fieldCriteria = t.criteria.filter((c) => c.source === "registry-field")
  const text = t.criteria.filter((c) => c.source === "registry-text")
  text.forEach((c, i) => {
    if (c.id !== `${t.nctId}-${i}`) throw new Error(`${t.nctId}: criterion ${c.id} is not at text position ${i}`)
  })
  const inOrder = [...fieldCriteria, ...text]
  if (t.criteria.some((c, i) => c !== inOrder[i])) throw new Error(`${t.nctId}: registry-field criteria must come before registry-text criteria`)
  return { fieldCriteria, text }
}

export const splitTrial = (t: Trial, group: string, intern: (s: Site) => number): { entry: IndexTrial; detail: TrialDetail } => {
  const { fieldCriteria, text } = splitCriteria(t)

  const entry: IndexTrial = {
    nctId: t.nctId,
    group,
    title: t.title,
    status: t.status,
    phases: t.phases,
    conditions: t.conditions,
    interventionTypes: t.interventions.map((i) => i.type),
    lastUpdated: t.lastUpdated,
    ...defined("statusVerified", t.statusVerified),
    sites: t.sites.map((s) => (s.status !== undefined ? [intern(s), s.status] : [intern(s)])),
    fieldCriteria,
    kinds: text.map((c) => (c.kind === "inclusion" ? "i" : "e")).join(""),
    rules: text.flatMap((c, i) => (c.rule._tag === "other" && c.confidence === "none" ? [] : [[i, c.confidence, c.rule] as const]))
  }

  const detail: TrialDetail = {
    ...defined("officialTitle", t.officialTitle),
    ...defined("briefSummary", t.briefSummary),
    eligibilityText: t.eligibilityText,
    texts: text.map((c) => c.text),
    interventionNames: t.interventions.map((i) => i.name),
    armLabels: t.armLabels,
    design: t.design,
    ...defined("centralContact", t.centralContact),
    otherIds: t.otherIds,
    siteExtras: t.sites.map(siteExtra)
  }
  return { entry, detail }
}

export const joinTrial = (e: IndexTrial, table: ReadonlyArray<IndexSite>, d?: TrialDetail): Trial => {
  const byPosition = new Map(e.rules.map(([i, confidence, rule]) => [i, { confidence, rule }]))
  return {
    nctId: e.nctId,
    otherIds: d?.otherIds ?? {},
    title: e.title,
    ...defined("officialTitle", d?.officialTitle),
    ...defined("briefSummary", d?.briefSummary),
    status: e.status,
    phases: e.phases,
    conditions: e.conditions,
    interventions: e.interventionTypes.map((type, i) => ({ type, name: d?.interventionNames[i] ?? "" })),
    armLabels: d?.armLabels ?? [],
    design: d?.design ?? {},
    lastUpdated: e.lastUpdated,
    ...defined("statusVerified", e.statusVerified),
    ...defined("centralContact", d?.centralContact),
    sites: e.sites.map(([idx, status], i) => ({
      ...table[idx]!,
      ...defined("status", status),
      ...(d?.siteExtras[i] ?? {})
    })),
    criteria: [
      ...e.fieldCriteria,
      ...[...e.kinds].map((k, i): Criterion => {
        const known = byPosition.get(i)
        return {
          id: `${e.nctId}-${i}`,
          kind: k === "i" ? "inclusion" : "exclusion",
          text: d?.texts[i] ?? "",
          rule: known?.rule ?? OTHER,
          source: "registry-text",
          confidence: known?.confidence ?? "none"
        }
      })
    ],
    eligibilityText: d?.eligibilityText ?? ""
  }
}

export interface Tiered {
  readonly index: TrialIndex
  readonly buckets: ReadonlyArray<DetailBucket>
}

export const tier = (bundles: ReadonlyArray<Bundle>): Tiered => {
  const table = makeSiteTable()
  const entries: IndexTrial[] = []
  const details = new Map<string, TrialDetail>()
  for (const b of bundles) {
    for (const t of b.trials) {
      const { entry, detail } = splitTrial(t, b.group, table.intern)
      entries.push(entry)
      const seen = details.get(t.nctId)
      if (!seen) details.set(t.nctId, detail)
      else if (JSON.stringify(seen.texts) !== JSON.stringify(detail.texts)) throw new Error(`${t.nctId}: groups disagree on the criteria text`)
    }
  }
  const bucketCount = bucketCountFor(details.size)
  const buckets: Array<Record<string, TrialDetail>> = Array.from({ length: bucketCount }, () => ({}))
  for (const [id, d] of [...details].sort(([a], [b]) => a.localeCompare(b))) buckets[bucketOf(id, bucketCount)]![id] = d
  const newest = [...bundles].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0]
  return {
    index: {
      version: newest?.version ?? "",
      generatedAt: newest?.generatedAt ?? "",
      bucketCount,
      groups: bundles.map((b) => ({
        id: b.group,
        label: b.groupLabel,
        version: b.version,
        generatedAt: b.generatedAt,
        source: b.source,
        trials: b.trials.length,
        changes: b.changes
      })),
      sites: table.rows,
      trials: entries
    },
    buckets
  }
}

export const groupTrials = (index: TrialIndex, group: string): Trial[] =>
  index.trials.filter((e) => e.group === group).map((e) => joinTrial(e, index.sites))

export const fullTrial = (index: TrialIndex, entry: IndexTrial, detail: TrialDetail): Trial => joinTrial(entry, index.sites, detail)
