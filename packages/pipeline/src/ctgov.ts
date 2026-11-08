import { Data, Duration, Effect, Schedule, Schema as S } from "effect"
import type { Site, Trial } from "@trial-finder/domain"
import { extractCriteria, generalCriteria } from "./extract.js"
import { msCriteria } from "./extract-ms.js"
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

export const Page = S.Struct({
  studies: S.Array(S.Unknown),
  nextPageToken: Opt(S.String),
  totalCount: Opt(S.Number)
})

const countriesOf = (g: GroupConfig) => g.countries ?? COUNTRIES

export const buildUrl = (g: GroupConfig, pageToken?: string, fields = "protocolSection") => {
  const countries = countriesOf(g)
  const adv = [
    "AREA[StudyType]INTERVENTIONAL",
    "AREA[StdAge](ADULT OR OLDER_ADULT)",
    ...(countries === "world" ? [] : [`AREA[LocationCountry](${countries.join(" OR ")})`])
  ].join(" AND ")
  const p = new URLSearchParams({
    "filter.overallStatus": "RECRUITING,NOT_YET_RECRUITING",
    "filter.advanced": adv,
    countTotal: "true",
    pageSize: String(config.ctgov.pageSize),
    fields
  })
  if (g.condQuery) p.set("query.cond", g.condQuery)
  if (pageToken) p.set("pageToken", pageToken)
  return `${config.ctgov.baseUrl}?${p.toString()}`
}

const retryPolicy = Schedule.exponential(Duration.millis(config.ctgov.retryBaseMs)).pipe(Schedule.intersect(Schedule.recurs(config.ctgov.retries)))

export const fetchJson = (url: string) =>
  Effect.tryPromise({
    try: async () => {
      const r = await fetch(url, { headers: { accept: "application/json", "user-agent": "trialy-prototype" } })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return (await r.json()) as unknown
    },
    catch: (cause) => new HttpError({ url, cause })
  }).pipe(Effect.retry(retryPolicy))

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

const optional = <K extends string, V>(key: K, value: V | undefined | null | ""): { [P in K]?: V } =>
  value === undefined || value === null || value === "" ? {} : ({ [key]: value } as { [P in K]: V })

const READERS = { lung: extractCriteria, ms: msCriteria, general: generalCriteria } as const

type Location = NonNullable<NonNullable<CtgStudy["protocolSection"]["contactsLocationsModule"]>["locations"]>[number]

const toSite = (l: Location): Site => {
  const contact = l.contacts?.[0]
  return {
    facility: l.facility ?? "Site",
    city: l.city ?? "",
    country: l.country!,
    ...optional("zip", trimmed(l.zip)),
    ...optional("status", l.status),
    ...(l.geoPoint ? { lat: l.geoPoint.lat, lon: l.geoPoint.lon } : {}),
    ...optional("contactName", trimmed(contact?.name)),
    ...optional("contactEmail", trimmed(contact?.email)),
    ...optional("contactPhone", trimmed(contact?.phone))
  }
}

const toSites = (study: CtgStudy, g: GroupConfig): Site[] => {
  const countries = countriesOf(g)
  const covered = countries === "world" ? null : new Set<string>(countries)
  return (study.protocolSection.contactsLocationsModule?.locations ?? [])
    .filter((l) => l.country && (covered === null || covered.has(l.country)))
    .map(toSite)
}

const toDesign = (study: CtgStudy): Trial["design"] => {
  const info = study.protocolSection.designModule?.designInfo
  return {
    ...optional("allocation", info?.allocation),
    ...optional("model", info?.interventionModel),
    ...optional("masking", info?.maskingInfo?.masking)
  }
}

const toCentralContact = (study: CtgStudy): Trial["centralContact"] => {
  const central = study.protocolSection.contactsLocationsModule?.centralContacts?.[0]
  if (!central) return undefined
  return { ...optional("name", central.name), ...optional("email", central.email), ...optional("phone", central.phone) }
}

const toStatus = (status: string | undefined): Trial["status"] => (status === "RECRUITING" || status === "NOT_YET_RECRUITING" ? status : "OTHER")

const toTrial = (study: CtgStudy, g: GroupConfig): Trial | null => {
  const p = study.protocolSection
  const id = p.identificationModule
  const conditions = p.conditionsModule?.conditions ?? []
  const title = id.briefTitle ?? id.officialTitle ?? id.nctId
  if (!g.conditionRe.test(`${conditions.join(" ")} ${title}`)) return null

  const sites = toSites(study, g)
  if (!sites.length) return null

  const eligibility = p.eligibilityModule
  const eligibilityText = eligibility?.eligibilityCriteria ?? ""
  const centralContact = toCentralContact(study)

  return {
    nctId: id.nctId,
    otherIds: classifyIds((id.secondaryIdInfos ?? []).map((s) => s.id ?? "")),
    title,
    ...optional("officialTitle", id.officialTitle),
    ...optional("briefSummary", p.descriptionModule?.briefSummary),
    status: toStatus(p.statusModule?.overallStatus),
    phases: [...(p.designModule?.phases ?? [])],
    conditions: [...conditions],
    interventions: (p.armsInterventionsModule?.interventions ?? []).map((i) => ({ type: i.type ?? "OTHER", name: i.name ?? "" })),
    armLabels: (p.armsInterventionsModule?.armGroups ?? []).map((a) => a.label ?? "").filter(Boolean),
    design: toDesign(study),
    lastUpdated: p.statusModule?.lastUpdatePostDateStruct?.date ?? p.statusModule?.lastUpdateSubmitDate ?? "",
    ...optional("statusVerified", p.statusModule?.statusVerifiedDate),
    ...(centralContact ? { centralContact } : {}),
    sites,
    eligibilityText,
    criteria: READERS[g.reader](id.nctId, eligibilityText, {
      minAge: eligibility?.minimumAge,
      maxAge: eligibility?.maximumAge,
      sex: eligibility?.sex,
      conditions
    })
  }
}

const nctIdOf = (raw: unknown): string =>
  (raw as { protocolSection?: { identificationModule?: { nctId?: string } } })?.protocolSection?.identificationModule?.nctId ?? "?"

export const normalise = (raw: ReadonlyArray<unknown>, g: GroupConfig) =>
  Effect.forEach(raw, (r) =>
    S.decodeUnknown(CtgStudy)(r).pipe(
      Effect.mapError((e) => new DecodeError({ nctId: nctIdOf(r), message: String(e).slice(0, 200) })),
      Effect.map((study) => toTrial(study, g)),
      Effect.catchTag("DecodeError", (e) => Effect.logWarning(`skipped ${e.nctId}: ${e.message}`).pipe(Effect.as(null)))
    )
  ).pipe(Effect.map((trials) => trials.filter((t): t is Trial => t !== null)))
