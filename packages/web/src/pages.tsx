import { memo, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  isStale,
  MS_THERAPIES,
  matchTrial,
  phaseLabel,
  plainFacts,
  registryLinks,
  haversineKm,
  type Profile,
  type Trial
} from "@trial-finder/domain"
import { useApp } from "./app"
import { config } from "./config"
import { fieldLabel, HELP_TAGS, stepsFor, STEP_FOR_FIELD } from "./questions"
import { CriteriaSections } from "./criteria"
import { decryptJson, encryptJson } from "./crypto"
import { reminderCalendar } from "./ics"
import { useI18n, type Key } from "./i18n"
import { A, Disclaimer, RegistryEnglishNote, Support, TierBadge, go, useFulfilledLine } from "./ui"
import type { Summary } from "./worker"

export function Wizard({ stepId }: { stepId?: string }) {
  const i18n = useI18n()
  const { t: tr, rich } = i18n
  const { profile, setProfile, markStarted, group } = useApp()
  const steps = stepsFor(group, profile)
  const idx = Math.max(0, stepId ? steps.findIndex((s) => s.id === stepId) : 0)
  const step = steps[idx]!
  const last = idx === steps.length - 1
  const next = () => {
    markStarted()
    go(last ? "/results" : `/questions/${steps[idx + 1]!.id}`)
  }
  return (
    <main className="page narrow">
      <p className="progress" aria-hidden="true">
        <span style={{ width: `${((idx + 1) / steps.length) * 100}%` }} />
      </p>
      <p className="meta">{tr("wizard.progress", { current: idx + 1, total: steps.length })}</p>
      <h1>{tr(step.title)}</h1>
      <details className="help">
        <summary>{tr("wizard.where")}</summary>
        <p>{rich(step.help, HELP_TAGS)}</p>
      </details>
      <form onSubmit={(e) => e.preventDefault()}>{step.body(profile, setProfile, i18n)}</form>
      <p className="wizard-bar actions">
        {idx > 0 && (
          <A to={`/questions/${steps[idx - 1]!.id}`} className="btn">
            {tr("wizard.back")}
          </A>
        )}
        <button className="btn primary" onClick={next}>
          {last ? tr("wizard.finish") : tr("wizard.next")}
        </button>
        {!last && (
          <button className="btn quiet" onClick={next}>
            {tr("wizard.skip")}
          </button>
        )}
      </p>
      <p className="meta">
        {rich("wizard.skipAhead", { link: (text) => <A to="/results">{text}</A> })}
      </p>
    </main>
  )
}


type Row = { s: Summary; t: Trial }

const PHASES = ["EARLY_PHASE1", "PHASE1", "PHASE2", "PHASE3", "PHASE4"]
const KINDS = ["medicine", "radiation", "procedure", "other"] as const

const MEDICINE_TYPES = new Set(["DRUG", "BIOLOGICAL", "GENETIC", "COMBINATION_PRODUCT"])
const PROCEDURE_TYPES = new Set(["PROCEDURE", "DEVICE"])

const treatmentKinds = (t: Trial) => {
  const kinds = new Set<string>()
  for (const { type } of t.interventions) {
    if (MEDICINE_TYPES.has(type)) kinds.add("medicine")
    else if (type === "RADIATION") kinds.add("radiation")
    else if (PROCEDURE_TYPES.has(type)) kinds.add("procedure")
    else kinds.add("other")
  }
  return kinds
}

const tierDivider = (row: Row, previous?: Row): 0 | 1 | null => {
  if (row.s.hidden || row.s.recruiting === 2) return null
  if (previous && !previous.s.hidden && previous.s.recruiting === row.s.recruiting) return null
  return row.s.recruiting
}

function FilterSelect({ label, value, onChange, children, disabled }: { label: string; value: string | number; onChange: (value: string) => void; children: ReactNode; disabled?: boolean }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        {children}
      </select>
    </label>
  )
}

export function Results() {
  const { t: tr, rich, countryName, tOr } = useI18n()
  const { summaries, byId, trials, impact, prevSnapshot, dismissSnapshot, shortlist, toggleShortlist, postcodeStatus, bundle, loadError, started, now: clock, group } = useApp()
  const [showHidden, setShowHidden] = useState(false)
  const [maxKm, setMaxKm] = useState(0)
  const [country, setCountry] = useState("")
  const [phase, setPhase] = useState("")
  const [kind, setKind] = useState("")
  const [status, setStatus] = useState("")
  const [hideStale, setHideStale] = useState(false)
  const [recruitingOnly, setRecruitingOnly] = useState(false)
  const [limit, setLimit] = useState<number>(config.pageSize)
  const now = useMemo(() => clock(), [clock])

  const rows = useMemo<Row[]>(
    () => (summaries ?? []).flatMap((s) => {
      const t = byId.get(s.nctId)
      return t ? [{ s, t }] : []
    }),
    [summaries, byId]
  )

  const countries = useMemo(() => [...new Set(trials.flatMap((t) => t.sites.map((x) => x.country)))].sort(), [trials])

  const diff = useMemo(() => {
    if (!prevSnapshot || !summaries) return null
    const current = new Map(summaries.map((s) => [s.nctId, s]))
    const before = prevSnapshot.fits
    const added = summaries.filter((s) => !(s.nctId in before) && !s.hidden).map((s) => s.nctId)
    const closed = Object.keys(before).filter((id) => !current.has(id))
    const nowFit = summaries.filter((s) => before[s.nctId]?.hidden && !s.hidden).map((s) => s.nctId)
    const nowOut = summaries.filter((s) => before[s.nctId] && !before[s.nctId]!.hidden && s.hidden).map((s) => s.nctId)
    const changed = added.length + closed.length + nowFit.length + nowOut.length > 0
    return changed ? { added, closed, nowFit, nowOut } : null
  }, [prevSnapshot, summaries])

  useEffect(() => setLimit(config.pageSize), [showHidden, maxKm, country, phase, kind, status, hideStale, recruitingOnly])

  if (loadError) return <main className="page narrow"><p className="error">{loadError}</p></main>
  if (!summaries || !bundle) return <main className="page narrow"><p aria-live="polite">{tr("results.matching")}</p></main>

  const matches = ({ s, t }: Row) =>
    (showHidden || !s.hidden) &&
    !(maxKm && s.distanceKm !== null && s.distanceKm > maxKm) &&
    !(maxKm && s.distanceKm === null && postcodeStatus === "found") &&
    (!country || t.sites.some((x) => x.country === country)) &&
    (!phase || t.phases.includes(phase)) &&
    (!kind || treatmentKinds(t).has(kind)) &&
    (!status || t.status === status) &&
    !(hideStale && isStale(t, now)) &&
    !(recruitingOnly && s.recruiting === 0)

  const filtered = rows.filter(matches)
  const visible = rows.filter((r) => !r.s.hidden).length
  const hiddenCount = rows.length - visible

  return (
    <main className="page">
      <header className="page-head">
        <h1>{tr("results.title")}</h1>
        <p className="meta">
          {tr("results.condition", { condition: tOr(`group.${group}`, bundle.groupLabel) })} · <A to="/questions/condition">{tr("results.change")}</A>
        </p>
        <p className="lead" aria-live="polite">
          {tr("results.summary", { visible, total: rows.length })}
          {hiddenCount > 0 && (
            <>
              {" "}{tr("results.hidden", { count: hiddenCount })}{" "}
              <button className="link" onClick={() => setShowHidden((v) => !v)}>
                {showHidden ? tr("results.hide") : tr("results.show")}
              </button>
            </>
          )}
        </p>
      </header>
      <Disclaimer />
      <RegistryEnglishNote />
      {!started && <p className="callout">{rich("results.notStarted", { link: (text) => <A to="/questions">{text}</A> })}</p>}

      {diff && (
        <section className="card" aria-label={tr("diff.title")}>
          <h2>{tr("diff.title")}</h2>
          <ul className="plain-list">
            {diff.added.length > 0 && <li>{tr("diff.added", { count: diff.added.length })} {diff.added.slice(0, 6).map((id) => <A key={id} to={`/trial/${id}`}>{id} </A>)}</li>}
            {diff.nowFit.length > 0 && <li>{tr("diff.nowFit", { count: diff.nowFit.length })} {diff.nowFit.slice(0, 6).map((id) => <A key={id} to={`/trial/${id}`}>{id} </A>)}</li>}
            {diff.nowOut.length > 0 && <li>{tr("diff.nowOut", { count: diff.nowOut.length })}</li>}
            {diff.closed.length > 0 && <li>{tr("diff.closed", { count: diff.closed.length })} {diff.closed.slice(0, 6).join(", ")}</li>}
          </ul>
          <button className="btn outline small" onClick={dismissSnapshot}>{tr("diff.dismiss")}</button>
        </section>
      )}

      <PostcodeBar />

      {impact.length > 0 && started && (
        <section className="card" aria-label={tr("impact.label")}>
          <h2>{tr("impact.title")}</h2>
          <ul className="plain-list">
            {impact.slice(0, 4).map((i) => (
              <li key={i.field}>
                <A to={`/questions/${STEP_FOR_FIELD(i.field)}`}>{tr("impact.item", { field: fieldLabel(tr, tOr, i.field), count: i.trials })}</A>
              </li>
            ))}
          </ul>
        </section>
      )}

      <details className="card filters" open>
        <summary>{tr("filters.title")}</summary>
        <div className="filter-grid">
          <FilterSelect label={tr("filters.distance")} value={maxKm} onChange={(v) => setMaxKm(Number(v))} disabled={postcodeStatus !== "found"}>
            <option value={0}>{postcodeStatus === "found" ? tr("filters.anyDistance") : tr("filters.enterPostcode")}</option>
            {[50, 100, 200, 300, 500].map((k) => <option key={k} value={k}>{tr("filters.within", { km: k })}</option>)}
          </FilterSelect>
          <FilterSelect label={tr("filters.country")} value={country} onChange={setCountry}>
            <option value="">{tr("filters.all")}</option>
            {countries.map((c) => <option key={c} value={c}>{countryName(c)}</option>)}
          </FilterSelect>
          <FilterSelect label={tr("filters.phase")} value={phase} onChange={setPhase}>
            <option value="">{tr("filters.all")}</option>
            {PHASES.map((p) => <option key={p} value={p}>{tOr(`phase.${p}`, phaseLabel(p))}</option>)}
          </FilterSelect>
          <FilterSelect label={tr("filters.kind")} value={kind} onChange={setKind}>
            <option value="">{tr("filters.all")}</option>
            {KINDS.map((k) => <option key={k} value={k}>{tr(`kind.${k}`)}</option>)}
          </FilterSelect>
          <FilterSelect label={tr("filters.recruitment")} value={status} onChange={setStatus}>
            <option value="">{tr("filters.recruitingOrSoon")}</option>
            <option value="RECRUITING">{tr("filters.recruitingNow")}</option>
            <option value="NOT_YET_RECRUITING">{tr("filters.notYet")}</option>
          </FilterSelect>
          <label className="check">
            <input type="checkbox" checked={recruitingOnly} onChange={(e) => setRecruitingOnly(e.target.checked)} />
            {tr("filters.recruitingSite")}
          </label>
          <label className="check">
            <input type="checkbox" checked={hideStale} onChange={(e) => setHideStale(e.target.checked)} />
            {tr("filters.hideStale")}
          </label>
        </div>
      </details>

      <ol className="cards-grid">
        {filtered.slice(0, limit).map((row, i, list) => (
          <TrialCard
            key={row.t.nctId}
            row={row}
            divider={tierDivider(row, list[i - 1])}
            stale={isStale(row.t, now)}
            saved={shortlist.includes(row.t.nctId)}
            full={shortlist.length >= config.maxShortlist}
            onSave={toggleShortlist}
          />
        ))}
      </ol>
      {filtered.length === 0 && <p className="meta">{tr("results.none")}</p>}
      {filtered.length > limit && (
        <div className="more">
          <button className="btn outline" onClick={() => setLimit((n) => n + config.pageSize)}>
            {tr("results.more", { left: filtered.length - limit })}
          </button>
        </div>
      )}
      <Support />
    </main>
  )
}

function PostcodeBar() {
  const { t: tr, countryName } = useI18n()
  const { profile, setProfile, postcodeStatus } = useApp()
  const length = config.postcodeLength[profile.country]

  return (
    <section className="card where" aria-label={tr("where.label")}>
      <label className="field">
        <span>{tr("where.country")}</span>
        <select value={profile.country} onChange={(e) => setProfile((p) => ({ ...p, country: e.target.value as Profile["country"], postcode: "" }))}>
          <option value="DE">{countryName("Germany")}</option>
          <option value="AT">{countryName("Austria")}</option>
          <option value="CH">{countryName("Switzerland")}</option>
        </select>
      </label>
      <label className="field">
        <span>{tr("where.postcode", { length })}</span>
        <input
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={length}
          placeholder={profile.country === "DE" ? "10115" : "1010"}
          value={profile.postcode}
          onChange={(e) => setProfile((p) => ({ ...p, postcode: e.target.value.replace(/\D/g, "") }))}
        />
      </label>
      <p className="meta" aria-live="polite">{tr(`where.${postcodeStatus}`)}</p>
    </section>
  )
}

type TrialCardProps = {
  row: Row
  divider: 0 | 1 | null
  stale: boolean
  saved: boolean
  full: boolean
  onSave: (id: string) => void
}

const TrialCard = memo(function TrialCard({ row: { s, t }, divider, stale, saved, full, onSave }: TrialCardProps) {
  const { t: tr, countryName, tOr, formatKm } = useI18n()
  const fulfilledLine = useFulfilledLine()
  const site = s.siteIdx >= 0 ? t.sites[s.siteIdx] : undefined
  const total = s.met + s.notMet + s.unknown
  const countries = [...new Set(t.sites.map((x) => countryName(x.country)))].join(", ")

  return (
    <>
      {divider !== null && <li className="grid-divider">{tr(`divider.${divider}`)}</li>}
      <li className={`card trial-card${s.hidden || s.recruiting === 0 ? " dim" : ""}`}>
        <div className="pills">
          {s.hidden && <span className="pill">{tr("status.notMet")}</span>}
          <TierBadge tier={s.recruiting} sites={s.recruitingSites} />
          {t.phases.map((p) => <span className="pill" key={p}>{tOr(`phase.${p}`, phaseLabel(p))}</span>)}
          {stale && <span className="pill muted" title={tr("card.stale.title")}>{tr("card.stale")}</span>}
        </div>
        <h2 className="card-title"><A to={`/trial/${t.nctId}`}>{t.title}</A></h2>
        <div className="meter" role="img" aria-label={fulfilledLine(s.met, total, s.notMet)}>
          <span style={{ width: `${total ? (s.met / total) * 100 : 0}%` }} />
        </div>
        <p className="meta">
          {fulfilledLine(s.met, total, s.notMet)}
          {site && s.distanceKm !== null ? ` · ${tr("card.nearest", { distance: formatKm(s.distanceKm), city: site.city, country: countryName(site.country) })}` : ` · ${countries}`}
          {` · `}<span className="nct">{t.nctId}</span>
        </p>
        <div className="actions">
          <A to={`/trial/${t.nctId}`} className="btn primary small">{tr("card.see")}</A>
          <button className="btn outline small" onClick={() => onSave(t.nctId)} disabled={!saved && full} aria-pressed={saved}>
            {saved ? tr("card.saved") : full ? tr("card.full", { max: config.maxShortlist }) : tr("card.add")}
          </button>
        </div>
      </li>
    </>
  )
})

const isOpen = (s: { status?: string }) => s.status === "RECRUITING" || s.status === "NOT_YET_RECRUITING" || s.status === "ENROLLING_BY_INVITATION"

export function TrialPage({ id }: { id: string }) {
  const { t: tr, rich, formatDate, formatKm, countryName, tOr } = useI18n()
  const fulfilledLine = useFulfilledLine()
  const { byId, profile, home, shortlist, toggleShortlist, now } = useApp()
  const t = byId.get(id)
  const match = useMemo(() => (t ? matchTrial(t, profile, home) : null), [t, profile, home])
  if (!t || !match) return <main className="page narrow"><h1>{tr("trial.notFound")}</h1><p>{rich("trial.notFound.text", { link: (text) => <A to="/results">{text}</A> })}</p></main>
  const facts = plainFacts(t)
  const phaseName = (p: string) => tOr(`phase.${p}`, phaseLabel(p))
  const links = registryLinks(t)
  const saved = shortlist.includes(t.nctId)
  const sites = [...t.sites]
    .map((s) => ({ s, d: home && s.lat !== undefined && s.lon !== undefined ? haversineKm(home, { lat: s.lat, lon: s.lon }) : null }))
    .sort((a, b) => Number(isOpen(b.s)) - Number(isOpen(a.s)) || (a.d ?? 1e9) - (b.d ?? 1e9))

  return (
    <main className="page">
      <p><A to="/results">{tr("trial.back")}</A></p>
      <Disclaimer />
      <RegistryEnglishNote />
      <h1>{t.title}</h1>
      <p className="meta">
        <span className="nct">{t.nctId}</span> · {t.phases.map(phaseName).join(", ") || tr("trial.noPhase")} · {tr("trial.updated", { date: t.lastUpdated ? formatDate(t.lastUpdated) : tr("trial.unknownDate") })}
        {isStale(t, now()) && <span className="pill muted">{tr("trial.outdated")}</span>}
      </p>
      <p className="pills">
        <TierBadge tier={match.recruiting} sites={match.recruitingSites} />
        <span className="pill">{t.status === "RECRUITING" ? tr("trial.registryRecruiting") : tr("trial.registryNotYet")}</span>
      </p>
      {match.recruiting === 0 && <p className="callout">{tr("tier.none.title")}</p>}
      <p className="actions noprint">
        <button className={`btn${saved ? "" : " primary"}`} onClick={() => toggleShortlist(t.nctId)} disabled={!saved && shortlist.length >= config.maxShortlist}>
          {saved ? tr("card.saved") : tr("card.add")}
        </button>
        <button className="btn" onClick={() => window.print()}>{tr("trial.print")}</button>
      </p>

      <section>
        <h2>{tr("plain.title")}</h2>
        <p className="meta">{tr("plain.note")}</p>
        <dl className="facts">
          {facts.tested.length > 0 && (<><dt>{tr("plain.tested")}</dt><dd>{facts.tested.join("; ")}</dd></>)}
          {facts.against.length > 0 && (<><dt>{tr("plain.against")}</dt><dd>{facts.against.join("; ")}</dd></>)}
          {facts.phases.map((p) => (<div key={p}><dt>{tr("plain.phase")}</dt><dd>{tOr(`phase.text.${p}`, p)}</dd></div>))}
          <div><dt>{tr("plain.randomisation")}</dt><dd>{tr(`allocation.${facts.allocation}`)}</dd></div>
          <div><dt>{tr("plain.blinding")}</dt><dd>{tr(`blinding.${facts.blinding}`)}</dd></div>
          <div><dt>{tr("plain.placebo")}</dt><dd>{tr(facts.hasPlacebo ? "placebo.yes" : "placebo.no")}</dd></div>
          <div><dt>{tr("plain.visits")}</dt><dd>{tr("plain.visits.text")}</dd></div>
        </dl>
        {t.briefSummary && (
          <details>
            <summary>{tr("summary.original")}</summary>
            <p className="orig">{t.briefSummary}</p>
          </details>
        )}
      </section>

      <section>
        <h2>{tr("elig.title")}</h2>
        <p className="lead">{fulfilledLine(match.met, match.results.length, match.notMet)}</p>
        {match.notMet > 0 && <p className="callout">{rich("elig.notMet", { link: (text) => <A to="/questions">{text}</A> })}</p>}
        {match.results.length === 0 ? <p className="meta">{tr("elig.none")}</p> : <CriteriaSections results={match.results} />}
        <details>
          <summary>{tr("elig.full")}</summary>
          <pre className="orig">{t.eligibilityText || "—"}</pre>
        </details>
      </section>

      <section>
        <h2>{tr("sites.title", { count: t.sites.length })}</h2>
        <p className="meta">{tr("sites.note")}{!home && ` ${tr("sites.enter")}`}</p>
        <ul className="sites">
          {sites.slice(0, 40).map(({ s, d }, i) => (
            <li key={i}>
              {s.status ? (
                <span className={`pill${isOpen(s) ? " live" : " muted"}`}>{tOr(`siteStatus.${s.status}`, s.status.toLowerCase().replace(/_/g, " "))}</span>
              ) : (
                <span className="pill caution">{tr("sites.unstated")}</span>
              )}
              <strong>{s.facility}</strong>
              <span>{[s.city, countryName(s.country)].filter(Boolean).join(", ")}{d !== null && ` · ${formatKm(d)}`}</span>
              {(s.contactName || s.contactPhone || s.contactEmail) && (
                <div className="meta">
                  {s.contactName} {s.contactPhone && <a href={`tel:${s.contactPhone.replace(/\s/g, "")}`}>{s.contactPhone}</a>} {s.contactEmail && <a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a>}
                </div>
              )}
            </li>
          ))}
        </ul>
        {t.sites.length > 40 && <p className="meta">{tr("sites.more", { count: t.sites.length - 40 })}</p>}
        {t.centralContact && (
          <p>
            <strong>{tr("trial.contact")}</strong> {t.centralContact.name} {t.centralContact.phone && <a href={`tel:${t.centralContact.phone.replace(/\s/g, "")}`}>{t.centralContact.phone}</a>}{" "}
            {t.centralContact.email && <a href={`mailto:${t.centralContact.email}`}>{t.centralContact.email}</a>}
          </p>
        )}
      </section>

      <section>
        <h2>{tr("registry.title")}</h2>
        <ul>
          {links.map((l) => (
            <li key={l.url}>
              <a href={l.url} rel="noreferrer noopener" target="_blank">{l.label}: {l.id}</a>
            </li>
          ))}
        </ul>
        <p className="meta">{tr("registry.source")}</p>
      </section>
    </main>
  )
}


type Translate = (key: Key, vars?: Record<string, string | number>) => string

const profileLines = (tr: Translate, tOr: (key: string, fallback: string) => string, p: Profile): Array<[string, string]> => {
  const answer = (v: string | number | null | undefined) => (v === null || v === undefined || v === "unknown" ? tr("profile.unanswered") : tOr(`value.${v}`, String(v)))
  const triText = (v: string) => (v === "unknown" ? tr("profile.notKnown") : tOr(`value.${v}`, v))
  const cancer = p.cancerType === "unknown" ? tr("profile.notKnown") : tr(`condition.${p.cancerType}`)
  const hist = p.histology === "unknown" || p.cancerType === "sclc" ? "" : `, ${tr(`histology.${p.histology}`)}`
  const markers = Object.entries(p.biomarkers).filter(([, v]) => v !== "unknown").map(([gene, v]) => tr(v === "positive" ? "profile.gene.positive" : "profile.gene.negative", { gene }))
  const prior = Object.entries(p.priorTherapies).map(([k, v]) => `${tr(`therapy.${k as keyof typeof p.priorTherapies}`)}: ${triText(v)}`)
  const stage = p.cancerType === "sclc" && p.sclcExtent !== "unknown" ? tr(`profile.extent.${p.sclcExtent}`) : p.stage === "unknown" ? tr("profile.unanswered") : p.stage
  const pdl1 = p.pdl1 === "unknown" ? tr("profile.notKnown") : p.pdl1 === "ge50" ? "≥ 50%" : p.pdl1 === "1to49" ? "1–49%" : "< 1%"
  const brain = p.brainMets === "unknown" ? tr("profile.notKnown") : tr(`profile.brain.${p.brainMets}`)
  return [
    [tr("profile.diagnosis"), cancer + hist],
    [tr("profile.stage"), stage],
    [tr("profile.genes"), markers.length ? markers.join("; ") : tr("profile.noneEntered")],
    [tr("profile.pdl1"), pdl1],
    [tr("profile.prior"), prior.join("; ")],
    [tr("profile.lines"), answer(p.priorLines)],
    [tr("profile.current"), answer(p.currentTherapy)],
    [tr("profile.brain"), brain],
    [tr("profile.ild"), answer(p.ild)],
    [tr("profile.autoimmune"), answer(p.autoimmune)],
    [tr("profile.agesex"), `${answer(p.age)} / ${answer(p.sex)}`],
    [tr("profile.ecog"), answer(p.ecog)]
  ]
}

const generalProfileLines = (tr: Translate, tOr: (key: string, fallback: string) => string, group: string, p: Profile): Array<[string, string]> => {
  const answer = (v: string | number | null | undefined) => (v === null || v === undefined || v === "unknown" ? tr("profile.unanswered") : tOr(`value.${v}`, String(v)))
  const diagnosis: [string, string] = [tr("profile.diagnosis"), tOr(`group.${group}`, group)]
  const person: [string, string] = [tr("profile.agesex"), `${answer(p.age)} / ${answer(p.sex)}`]
  if (group !== "ms") return [diagnosis, person]
  const taken = MS_THERAPIES.filter((c) => p.msTherapies[c] === "yes").map((c) => tr(`mstherapy.${c}`))
  const therapies = taken.length ? taken.join("; ") : MS_THERAPIES.every((c) => p.msTherapies[c] === "unknown") ? tr("profile.notKnown") : tr("profile.none")
  return [
    diagnosis,
    [tr("profile.mscourse"), p.msCourse === "unknown" ? tr("profile.unanswered") : tr(`step.mscourse.${p.msCourse}`)],
    [tr("profile.edss"), p.edss === null ? tr("profile.unanswered") : String(p.edss)],
    [tr("profile.relapse"), p.lastRelapse === "unknown" ? tr("profile.unanswered") : tr(`step.relapse.${p.lastRelapse}`)],
    [tr("profile.mstherapies"), therapies],
    ...(p.sex === "male" ? [] : [[tr("profile.pregnancy"), answer(p.pregnancy)] as [string, string]]),
    [tr("profile.mri"), answer(p.mriUnsuitable)],
    [tr("profile.steroids"), answer(p.recentSteroids)],
    [tr("profile.infection"), answer(p.chronicInfection)],
    [tr("profile.cancer"), answer(p.cancerHistory)],
    person
  ]
}

export function Shortlist() {
  const { t: tr, rich } = useI18n()
  const fulfilledLine = useFulfilledLine()
  const { shortlist, byId, toggleShortlist, profile, home, now } = useApp()
  const [months, setMonths] = useState(3)
  const items = shortlist.map((id) => byId.get(id)).filter((t): t is Trial => !!t)
  const reminder = () => {
    const ics = reminderCalendar(now(), months, { summary: tr("ics.summary"), description: tr("ics.description") })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }))
    a.download = "check-trials-again.ics"
    a.click()
  }
  return (
    <main className="page narrow">
      <h1>{tr("shortlist.title")}</h1>
      <p className="muted">{tr("shortlist.lead", { max: config.maxShortlist })}</p>
      {items.length === 0 && <p>{rich("shortlist.empty", { link: (text) => <A to="/results">{text}</A> })}</p>}
      <ol className="cards">
        {items.map((t) => {
          const m = matchTrial(t, profile, home)
          return (
            <li className="card" key={t.nctId}>
              <h2 className="card-title"><A to={`/trial/${t.nctId}`}>{t.title}</A></h2>
              <p className="meta"><strong>{fulfilledLine(m.met, m.results.length, m.notMet)}</strong> · {t.nctId}{m.hidden && ` · ${tr("shortlist.nowNotMet")}`}</p>
              <button className="btn small" onClick={() => toggleShortlist(t.nctId)}>{tr("shortlist.remove")}</button>
            </li>
          )
        })}
      </ol>
      {items.length > 0 && (
        <p className="actions">
          <A to="/summary" className="btn primary">{tr("shortlist.create")}</A>
        </p>
      )}
      <h2>{tr("shortlist.again.title")}</h2>
      <p className="muted">{tr("shortlist.again.text")}</p>
      <p className="actions">
        <label>
          {tr("shortlist.remind")}{" "}
          <select value={months} onChange={(e) => setMonths(Number(e.target.value))}>
            {[1, 2, 3, 6].map((m) => <option key={m} value={m}>{tr("shortlist.months", { count: m })}</option>)}
          </select>
        </label>
        <button className="btn" onClick={reminder}>{tr("shortlist.download")}</button>
      </p>
      <Support />
    </main>
  )
}

export function Summary() {
  const { t: tr, tOr, formatDate, formatKm } = useI18n()
  const fulfilledLine = useFulfilledLine()
  const { shortlist, byId, profile, home, now, group } = useApp()
  const items = shortlist.map((id) => byId.get(id)).filter((t): t is Trial => !!t)
  const phaseName = (p: string) => tOr(`phase.${p}`, phaseLabel(p))
  return (
    <main className="page narrow">
      <p className="noprint actions">
        <A to="/shortlist" className="btn">{tr("summary.back")}</A>
        <button className="btn primary" onClick={() => window.print()}>{tr("summary.print")}</button>
      </p>
      <h1>{tr("summary.title")}</h1>
      <p className="meta">{tr("summary.intro", { date: formatDate(now()) })}</p>
      <RegistryEnglishNote />
      <h2>{tr("summary.situation")}</h2>
      <table className="plain">
        <tbody>{(group === config.group ? profileLines(tr, tOr, profile) : generalProfileLines(tr, tOr, group, profile)).map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}</tbody>
      </table>
      <h2>{tr("summary.selected", { count: items.length })}</h2>
      {items.length === 0 && <p>{tr("summary.none")}</p>}
      {items.map((t) => {
        const m = matchTrial(t, profile, home)
        const open = m.results.filter((r) => r.status === "unknown" && r.criterion.rule._tag !== "other" || (r.status === "unknown" && r.criterion.source === "registry-text"))
        const failed = m.results.filter((r) => r.status === "notMet")
        const site = m.nearestSite
        const recruitment = m.recruiting === 2 ? tr("summary.rec2", { count: m.recruitingSites }) : m.recruiting === 1 ? tr("summary.rec1") : tr("summary.rec0")
        const contact = [site?.contactName, site?.contactPhone, site?.contactEmail].filter(Boolean).join(", ")
        const studyContact = t.centralContact ? [t.centralContact.name, t.centralContact.phone, t.centralContact.email].filter(Boolean).join(", ") : ""
        return (
          <article key={t.nctId} className="sum-trial">
            <h3>{t.title}</h3>
            <p><strong>{t.nctId}</strong>{t.otherIds.euCt?.map((x) => ` · EU CT ${x}`)}{t.otherIds.eudraCt?.map((x) => ` · EudraCT ${x}`)}{t.otherIds.drks?.map((x) => ` · ${x}`)} · {t.phases.map(phaseName).join(", ") || tr("trial.noPhase")} · {t.status === "RECRUITING" ? tr("summary.status.recruiting") : tr("summary.status.notYet")} · {tr("trial.updated", { date: t.lastUpdated ? formatDate(t.lastUpdated) : tr("trial.unknownDate") })}</p>
            <p>{tr("summary.recruitment", { text: recruitment })}</p>
            <p>{tr("summary.compare", { line: fulfilledLine(m.met, m.results.length, m.notMet) })}</p>
            {failed.length > 0 && (
              <>
                <p><strong>{tr("summary.failed")}</strong></p>
                <ul>{failed.map((r) => <li key={r.criterion.id}>{r.criterion.text}</li>)}</ul>
              </>
            )}
            <p><strong>{tr("summary.open", { count: open.length })}</strong></p>
            <ul className="meta">
              {open.slice(0, 25).map((r) => <li key={r.criterion.id}>{r.criterion.kind === "inclusion" ? tr("summary.required") : tr("summary.exclusion")} {r.criterion.text}</li>)}
            </ul>
            {open.length > 25 && <p className="meta">{tr("summary.moreOpen", { count: open.length - 25 })}</p>}
            <p className="meta">
              {site && <>{tr("summary.nearest", { facility: site.facility, city: site.city, distance: m.distanceKm === null ? tr("profile.notKnown") : formatKm(m.distanceKm) })} </>}
              {contact && <>{tr("summary.contact", { who: contact })} </>}
              {studyContact && <>{tr("summary.studyContact", { who: studyContact })} </>}
              {tr("summary.registry", { urls: registryLinks(t).map((l) => l.url).join("  ") })}
            </p>
          </article>
        )
      })}
    </main>
  )
}


export function Privacy() {
  const { t: tr, rich, tOr } = useI18n()
  const { profile, shortlist, replaceAll, wipe, bundle, group } = useApp()
  const [pass, setPass] = useState("")
  const [msg, setMsg] = useState("")
  const [confirmWipe, setConfirmWipe] = useState(false)
  const doExport = async () => {
    if (pass.length < 8) return setMsg(tr("privacy.shortPass"))
    const file = await encryptJson({ profile, shortlist, group }, pass)
    if (!file.ok) return setMsg(tr(`crypto.${file.error}`))
    const blob = new Blob([file.value], { type: "application/json" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "trialy-profile.tfprofile"
    a.click()
    setMsg(tr("privacy.exported"))
  }
  const doImport = async (f: File | undefined) => {
    if (!f) return
    const opened = await decryptJson(await f.text(), pass)
    if (!opened.ok) return setMsg(tr(`crypto.${opened.error}`))
    const d = opened.value as { profile: Profile; shortlist?: string[]; group?: string }
    replaceAll(d.profile, d.shortlist ?? [], d.group)
    setMsg(tr("privacy.imported"))
  }
  return (
    <main className="page narrow">
      <h1>{tr("privacy.title")}</h1>
      <h2>{tr("privacy.stays.title")}</h2>
      <p>{tr("privacy.stays.text")}</p>
      <h2>{tr("privacy.server.title")}</h2>
      <p>{rich("privacy.server.text", { code: (text) => <code>{text}</code> }, { file: `${group}.json`, condition: tOr(`group.${group}`, group), trials: bundle ? tr("privacy.server.count", { count: bundle.trials.length }) : "" })}</p>
      <h2>{tr("privacy.check.title")}</h2>
      <p>{rich("privacy.check.text", { em: (text) => <em>{text}</em> })}</p>
      <h2>{tr("privacy.move.title")}</h2>
      <p className="muted">{tr("privacy.move.text")}</p>
      <label className="field">
        <span>{tr("privacy.passphrase")}</span>
        <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="off" />
      </label>
      <p className="actions">
        <button className="btn" onClick={doExport}>{tr("privacy.export")}</button>
        <label className="btn">
          {tr("privacy.import")}
          <input type="file" accept=".tfprofile,application/json" hidden onChange={(e) => doImport(e.target.files?.[0])} />
        </label>
      </p>
      <p aria-live="polite" className="muted">{msg}</p>
      <h2>{tr("privacy.delete.title")}</h2>
      <p>{tr("privacy.delete.text")}</p>
      {confirmWipe ? (
        <p className="actions">
          <button className="btn danger" onClick={async () => {
            const wiped = await wipe()
            setConfirmWipe(false)
            if (!wiped.ok) return setMsg(tr(`wipe.${wiped.error}`))
            setMsg(tr("privacy.deleted"))
            go("/")
          }}>{tr("privacy.delete.confirm")}</button>
          <button className="btn" onClick={() => setConfirmWipe(false)}>{tr("privacy.cancel")}</button>
        </p>
      ) : (
        <button className="btn" onClick={() => setConfirmWipe(true)}>{tr("privacy.delete.title")}</button>
      )}
      <h2>{tr("privacy.funding.title")}</h2>
      <p>{tr("privacy.funding.text")}</p>
      <Support />
    </main>
  )
}
