import { Data, Duration, Effect, Schedule, Schema as S } from "effect"
import type { Site, Trial } from "@trial-finder/domain"
import { extractCriteria } from "./extract.js"
import { config } from "./config.js"
import { COUNTRIES, type GroupConfig } from "./groups.js"

class HttpError extends Data.TaggedError("HttpError")<{ url: string; cause: unknown }> {}
class DecodeError extends Data.TaggedError("DecodeError")<{ nctId: string; message: string }> {}

const Opt = <A, I>(s: S.Schema<A, I>) => S.optional(s)

const CtgStudy = S.Struct({
  protocolSection: S.Struct({
    identificationModule: S.Struct({
      nctId: S.String,
      briefTitle: Opt(S.String),
      officialTitle: Opt(S.String),
      secondaryIdInfos: Opt(S.Array(S.Struct({ id: Opt(S.String), type: Opt(S.String), domain: Opt(S.String) })))
    }),
    statusModule: Opt(
      S.Struct({
        overallStatus: Opt(S.String),
        statusVerifiedDate: Opt(S.String),
        lastUpdatePostDateStruct: Opt(S.Struct({ date: Opt(S.String) })),
        lastUpdateSubmitDate: Opt(S.String)
      })
    ),
    descriptionModule: Opt(S.Struct({ briefSummary: Opt(S.String) })),
    conditionsModule: Opt(S.Struct({ conditions: Opt(S.Array(S.String)) })),
    designModule: Opt(
      S.Struct({
        phases: Opt(S.Array(S.String)),
        designInfo: Opt(
          S.Struct({
            allocation: Opt(S.String),
            interventionModel: Opt(S.String),
            maskingInfo: Opt(S.Struct({ masking: Opt(S.String) }))
          })
        )
      })
    ),
    armsInterventionsModule: Opt(
      S.Struct({
        armGroups: Opt(S.Array(S.Struct({ label: Opt(S.String) }))),
        interventions: Opt(S.Array(S.Struct({ type: Opt(S.String), name: Opt(S.String) })))
      })
    ),
    eligibilityModule: Opt(
      S.Struct({
        eligibilityCriteria: Opt(S.String),
        sex: Opt(S.String),
        minimumAge: Opt(S.String),
        maximumAge: Opt(S.String)
      })
    ),
    contactsLocationsModule: Opt(
      S.Struct({
        centralContacts: Opt(S.Array(S.Struct({ name: Opt(S.String), phone: Opt(S.String), email: Opt(S.String) }))),
        locations: Opt(
          S.Array(
            S.Struct({
              facility: Opt(S.String),
              status: Opt(S.String),
              city: Opt(S.String),
              zip: Opt(S.String),
              country: Opt(S.String),
              geoPoint: Opt(S.Struct({ lat: S.Number, lon: S.Number })),
              contacts: Opt(S.Array(S.Struct({ name: Opt(S.String), phone: Opt(S.String), email: Opt(S.String) })))
            })
          )
        )
      })
    )
  })
})
type CtgStudy = typeof CtgStudy.Type

const Page = S.Struct({
  studies: S.Array(S.Unknown),
  nextPageToken: Opt(S.String),
  totalCount: Opt(S.Number)
})

const buildUrl = (g: GroupConfig, pageToken?: string) => {
  const adv = [
    "AREA[StudyType]INTERVENTIONAL",
    "AREA[StdAge](ADULT OR OLDER_ADULT)",
    `AREA[LocationCountry](${COUNTRIES.join(" OR ")})`
  ].join(" AND ")
  const p = new URLSearchParams({
    "query.cond": g.condQuery,
    "filter.overallStatus": "RECRUITING,NOT_YET_RECRUITING",
    "filter.advanced": adv,
    countTotal: "true",
    pageSize: String(config.ctgov.pageSize),
    fields: "protocolSection"
  })
  if (pageToken) p.set("pageToken", pageToken)
  return `${config.ctgov.baseUrl}?${p.toString()}`
}

const fetchJson = (url: string) =>
  Effect.tryPromise({
    try: async () => {
      const r = await fetch(url, { headers: { accept: "application/json", "user-agent": "trial-finder-prototype" } })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return (await r.json()) as unknown
    },
    catch: (cause) => new HttpError({ url, cause })
  }).pipe(Effect.retry(Schedule.exponential(Duration.millis(config.ctgov.retryBaseMs)).pipe(Schedule.intersect(Schedule.recurs(config.ctgov.retries)))))

export const fetchStudies = (g: GroupConfig, limit = Infinity) =>
  Effect.gen(function* () {
    const raw: unknown[] = []
    let token: string | undefined
    let total: number | undefined
    do {
      const json = yield* fetchJson(buildUrl(g, token))
      const page = yield* S.decodeUnknown(Page)(json).pipe(
        Effect.mapError((e) => new HttpError({ url: config.ctgov.baseUrl, cause: e }))
      )
      raw.push(...page.studies)
      token = page.nextPageToken
      total ??= page.totalCount
      yield* Effect.log(`fetched ${raw.length}/${total ?? "?"}`)
      if (token && raw.length < limit) yield* Effect.sleep(Duration.millis(config.ctgov.pageDelayMs))
    } while (token && raw.length < limit)
    return raw.slice(0, limit)
  })


const EU_CT = /^\d{4}-5\d{5}-\d{2}-\d{2}$/
const EUDRACT = /^\d{4}-\d{6}-\d{2}$/
const DRKS = /^DRKS\d{8}$/i

const classifyIds = (ids: ReadonlyArray<string>) => {
  const pick = (re: RegExp) => ids.filter((i) => re.test(i.trim())).map((i) => i.trim().toUpperCase())
  const euCt = pick(EU_CT)
  const eudraCt = pick(EUDRACT)
  const drks = pick(DRKS)
  return {
    ...(euCt.length ? { euCt } : {}),
    ...(eudraCt.length ? { eudraCt } : {}),
    ...(drks.length ? { drks } : {})
  }
}

const trimmed = (s?: string) => (s && s.trim() ? s.trim() : undefined)

const toTrial = (study: CtgStudy, g: GroupConfig): Trial | null => {
  const p = study.protocolSection
  const id = p.identificationModule
  const conditions = p.conditionsModule?.conditions ?? []
  const title = id.briefTitle ?? id.officialTitle ?? id.nctId
  if (!g.conditionRe.test(conditions.join(" ") + " " + title)) return null

  const covered = new Set<string>(COUNTRIES)
  const sites: Site[] = (p.contactsLocationsModule?.locations ?? [])
    .filter((l) => l.country && covered.has(l.country))
    .map((l) => {
      const c = l.contacts?.[0]
      return {
        facility: l.facility ?? "Site",
        city: l.city ?? "",
        country: l.country!,
        ...(trimmed(l.zip) ? { zip: trimmed(l.zip)! } : {}),
        ...(l.status ? { status: l.status } : {}),
        ...(l.geoPoint ? { lat: l.geoPoint.lat, lon: l.geoPoint.lon } : {}),
        ...(trimmed(c?.name) ? { contactName: trimmed(c?.name)! } : {}),
        ...(trimmed(c?.email) ? { contactEmail: trimmed(c?.email)! } : {}),
        ...(trimmed(c?.phone) ? { contactPhone: trimmed(c?.phone)! } : {})
      }
    })
  if (!sites.length) return null

  const status = p.statusModule?.overallStatus
  const eligibilityText = p.eligibilityModule?.eligibilityCriteria ?? ""
  const central = p.contactsLocationsModule?.centralContacts?.[0]
  const d = p.designModule?.designInfo

  return {
    nctId: id.nctId,
    otherIds: classifyIds((id.secondaryIdInfos ?? []).map((s) => s.id ?? "")),
    title,
    ...(id.officialTitle ? { officialTitle: id.officialTitle } : {}),
    ...(p.descriptionModule?.briefSummary ? { briefSummary: p.descriptionModule.briefSummary } : {}),
    status: status === "RECRUITING" || status === "NOT_YET_RECRUITING" ? status : "OTHER",
    phases: [...(p.designModule?.phases ?? [])],
    conditions: [...conditions],
    interventions: (p.armsInterventionsModule?.interventions ?? []).map((i) => ({ type: i.type ?? "OTHER", name: i.name ?? "" })),
    armLabels: (p.armsInterventionsModule?.armGroups ?? []).map((a) => a.label ?? "").filter(Boolean),
    design: {
      ...(d?.allocation ? { allocation: d.allocation } : {}),
      ...(d?.interventionModel ? { model: d.interventionModel } : {}),
      ...(d?.maskingInfo?.masking ? { masking: d.maskingInfo.masking } : {})
    },
    lastUpdated: p.statusModule?.lastUpdatePostDateStruct?.date ?? p.statusModule?.lastUpdateSubmitDate ?? "",
    ...(p.statusModule?.statusVerifiedDate ? { statusVerified: p.statusModule.statusVerifiedDate } : {}),
    ...(central ? { centralContact: { ...(central.name ? { name: central.name } : {}), ...(central.email ? { email: central.email } : {}), ...(central.phone ? { phone: central.phone } : {}) } } : {}),
    sites,
    eligibilityText,
    criteria: extractCriteria(id.nctId, eligibilityText, {
      minAge: p.eligibilityModule?.minimumAge,
      maxAge: p.eligibilityModule?.maximumAge,
      sex: p.eligibilityModule?.sex,
      conditions
    })
  }
}

export const normalise = (raw: ReadonlyArray<unknown>, g: GroupConfig) =>
  Effect.forEach(raw, (r) =>
    S.decodeUnknown(CtgStudy)(r).pipe(
      Effect.mapError(
        (e) => new DecodeError({ nctId: (r as any)?.protocolSection?.identificationModule?.nctId ?? "?", message: String(e).slice(0, 200) })
      ),
      Effect.map((s) => toTrial(s, g)),
      Effect.catchTag("DecodeError", (e) => Effect.logWarning(`skipped ${e.nctId}: ${e.message}`).pipe(Effect.as(null)))
    )
  ).pipe(Effect.map((xs) => xs.filter((t): t is Trial => t !== null)))
