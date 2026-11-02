import { useMemo, useState, type ReactNode } from "react"
import {
  isStale,
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
import { FIELD_LABEL, STEPS, STEP_FOR_FIELD } from "./questions"
import { CriteriaSections } from "./criteria"
import { decryptJson, encryptJson } from "./crypto"
import { A, Disclaimer, NO_RECRUITING_SITE, Support, TierBadge, formatKm, fulfilledLine, go } from "./ui"
import type { Summary } from "./worker"

export function Wizard({ stepId }: { stepId?: string }) {
  const { profile, setProfile, markStarted } = useApp()
  const steps = STEPS.filter((s) => !s.skip?.(profile))
  const idx = Math.max(0, stepId ? steps.findIndex((s) => s.id === stepId) : 0)
  const step = steps[idx]!
  const last = idx === steps.length - 1
  const next = () => {
    markStarted()
    go(last ? "/results" : `/questions/${steps[idx + 1]!.id}`)
  }
  return (
    <main className="page narrow">
      <p className="progress" aria-label={`Question ${idx + 1} of ${steps.length}`}>
        <span style={{ width: `${((idx + 1) / steps.length) * 100}%` }} />
      </p>
      <p className="meta">
        Question {idx + 1} of {steps.length} · saved automatically
      </p>
      <h1>{step.title}</h1>
      <details className="help">
        <summary>Where do I find this?</summary>
        <p>{step.help}</p>
      </details>
      <form onSubmit={(e) => e.preventDefault()}>{step.body(profile, setProfile)}</form>
      <p className="wizard-bar actions">
        {idx > 0 && (
          <A to={`/questions/${steps[idx - 1]!.id}`} className="btn">
            Back
          </A>
        )}
        <button className="btn primary" onClick={next}>
          {last ? "Show my results" : "Next"}
        </button>
        {!last && (
          <button className="btn quiet" onClick={next}>
            Skip
          </button>
        )}
      </p>
      <p className="meta">
        <A to="/results">Skip ahead to the results</A>. You can come back and answer more at any time, and the list updates straight away.
      </p>
    </main>
  )
}


type Row = { s: Summary; t: Trial }

const PHASES = ["EARLY_PHASE1", "PHASE1", "PHASE2", "PHASE3", "PHASE4"]
const MAX_ROWS = 500

const MEDICINE_TYPES = new Set(["DRUG", "BIOLOGICAL", "GENETIC", "COMBINATION_PRODUCT"])
const PROCEDURE_TYPES = new Set(["PROCEDURE", "DEVICE"])

const treatmentKinds = (t: Trial) => {
  const kinds = new Set<string>()
  for (const { type } of t.interventions) {
    if (MEDICINE_TYPES.has(type)) kinds.add("Medicine")
    else if (type === "RADIATION") kinds.add("Radiation")
    else if (PROCEDURE_TYPES.has(type)) kinds.add("Procedure or device")
    else kinds.add("Other")
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
  const { summaries, byId, trials, impact, prevSnapshot, dismissSnapshot, shortlist, toggleShortlist, postcodeStatus, bundle, loadError, started } = useApp()
  const [showHidden, setShowHidden] = useState(false)
  const [maxKm, setMaxKm] = useState(0)
  const [country, setCountry] = useState("")
  const [phase, setPhase] = useState("")
  const [kind, setKind] = useState("")
  const [status, setStatus] = useState("")
  const [hideStale, setHideStale] = useState(false)
  const [recruitingOnly, setRecruitingOnly] = useState(false)
  const now = useMemo(() => new Date(), [])

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

  if (loadError) return <main className="page narrow"><p className="error">{loadError}</p></main>
  if (!summaries || !bundle) return <main className="page narrow"><p aria-live="polite">Matching…</p></main>

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
        <h1>Matching trials</h1>
        <p className="lead" aria-live="polite">
          {visible} of {rows.length} trials may fit.
          {hiddenCount > 0 && (
            <>
              {" "}{hiddenCount} hidden because a criterion is not fulfilled.{" "}
              <button className="link" onClick={() => setShowHidden((v) => !v)}>
                {showHidden ? "Hide them" : "Show them"}
              </button>
            </>
          )}
        </p>
      </header>
      <Disclaimer />
      {!started && (
        <p className="callout">
          You haven’t answered any questions yet. <A to="/questions">Answer a few questions</A> to see which trials fit.
        </p>
      )}

      {diff && (
        <section className="card" aria-label="Since your last visit">
          <h2>Since your last visit</h2>
          <ul className="plain-list">
            {diff.added.length > 0 && <li>{diff.added.length} new: {diff.added.slice(0, 6).map((id) => <A key={id} to={`/trial/${id}`}>{id} </A>)}</li>}
            {diff.nowFit.length > 0 && <li>{diff.nowFit.length} now possible after your changes: {diff.nowFit.slice(0, 6).map((id) => <A key={id} to={`/trial/${id}`}>{id} </A>)}</li>}
            {diff.nowOut.length > 0 && <li>{diff.nowOut.length} no longer a fit after your changes</li>}
            {diff.closed.length > 0 && <li>{diff.closed.length} no longer recruiting or removed: {diff.closed.slice(0, 6).join(", ")}</li>}
          </ul>
          <button className="btn outline small" onClick={dismissSnapshot}>Got it</button>
        </section>
      )}

      <PostcodeBar />

      {impact.length > 0 && started && (
        <section className="card" aria-label="Answers that would help most">
          <h2>Answers that would narrow this down</h2>
          <ul className="plain-list">
            {impact.slice(0, 4).map((i) => (
              <li key={i.field}>
                <A to={`/questions/${STEP_FOR_FIELD(i.field)}`}>Your {FIELD_LABEL(i.field)}</A> is open in {i.trials} trial{i.trials > 1 ? "s" : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      <details className="card filters" open>
        <summary>Filters</summary>
        <div className="filter-grid">
          <FilterSelect label="Distance" value={maxKm} onChange={(v) => setMaxKm(Number(v))} disabled={postcodeStatus !== "found"}>
            <option value={0}>{postcodeStatus === "found" ? "Any distance" : "Enter a postcode to filter"}</option>
            {[50, 100, 200, 300, 500].map((k) => <option key={k} value={k}>within {k} km</option>)}
          </FilterSelect>
          <FilterSelect label="Country with a site" value={country} onChange={setCountry}>
            <option value="">All</option>
            {countries.map((c) => <option key={c}>{c}</option>)}
          </FilterSelect>
          <FilterSelect label="Phase" value={phase} onChange={setPhase}>
            <option value="">All</option>
            {PHASES.map((p) => <option key={p} value={p}>{phaseLabel(p)}</option>)}
          </FilterSelect>
          <FilterSelect label="Treatment type" value={kind} onChange={setKind}>
            <option value="">All</option>
            {["Medicine", "Radiation", "Procedure or device", "Other"].map((k) => <option key={k}>{k}</option>)}
          </FilterSelect>
          <FilterSelect label="Recruitment" value={status} onChange={setStatus}>
            <option value="">Recruiting or about to</option>
            <option value="RECRUITING">Recruiting now</option>
            <option value="NOT_YET_RECRUITING">Not yet recruiting</option>
          </FilterSelect>
          <label className="check">
            <input type="checkbox" checked={recruitingOnly} onChange={(e) => setRecruitingOnly(e.target.checked)} />
            Only trials with a recruiting site
          </label>
          <label className="check">
            <input type="checkbox" checked={hideStale} onChange={(e) => setHideStale(e.target.checked)} />
            Hide entries not updated for 6 months
          </label>
        </div>
      </details>

      <ol className="cards-grid">
        {filtered.slice(0, MAX_ROWS).map((row, i, list) => (
          <TrialCard
            key={row.t.nctId}
            row={row}
            divider={tierDivider(row, list[i - 1])}
            stale={isStale(row.t, now)}
            saved={shortlist.includes(row.t.nctId)}
            full={shortlist.length >= config.maxShortlist}
            onSave={() => toggleShortlist(row.t.nctId)}
          />
        ))}
      </ol>
      {filtered.length === 0 && <p className="meta">No trials match these filters.</p>}
      {filtered.length > MAX_ROWS && <p className="meta">Showing the first {MAX_ROWS}. Use the filters to narrow down.</p>}
      <Support />
    </main>
  )
}

function PostcodeBar() {
  const { profile, setProfile, postcodeStatus } = useApp()
  const length = config.postcodeLength[profile.country]
  const hints = {
    found: "Sorted by straight-line distance to the nearest recruiting site. Stays in your browser.",
    unknown: "Postcode not found. Distances stay hidden.",
    loading: "Keep typing…",
    empty: "Add it to see distances. Never sent anywhere."
  }

  return (
    <section className="card where" aria-label="Your location">
      <label className="field">
        <span>Country</span>
        <select value={profile.country} onChange={(e) => setProfile((p) => ({ ...p, country: e.target.value as Profile["country"], postcode: "" }))}>
          <option value="DE">Germany</option>
          <option value="AT">Austria</option>
          <option value="CH">Switzerland</option>
        </select>
      </label>
      <label className="field">
        <span>Postcode ({length} digits)</span>
        <input
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={length}
          placeholder={profile.country === "DE" ? "10115" : "1010"}
          value={profile.postcode}
          onChange={(e) => setProfile((p) => ({ ...p, postcode: e.target.value.replace(/\D/g, "") }))}
        />
      </label>
      <p className="meta" aria-live="polite">{hints[postcodeStatus]}</p>
    </section>
  )
}

const DIVIDER_TEXT = {
  0: "No site is listed as recruiting. Kept visible, ranked lower.",
  1: "Site recruitment status not stated. Confirm with the study team."
} as const

type TrialCardProps = {
  row: Row
  divider: 0 | 1 | null
  stale: boolean
  saved: boolean
  full: boolean
  onSave: () => void
}

function TrialCard({ row: { s, t }, divider, stale, saved, full, onSave }: TrialCardProps) {
  const site = s.siteIdx >= 0 ? t.sites[s.siteIdx] : undefined
  const total = s.met + s.notMet + s.unknown
  const countries = [...new Set(t.sites.map((x) => x.country))].join(", ")

  return (
    <>
      {divider !== null && <li className="grid-divider">{DIVIDER_TEXT[divider]}</li>}
      <li className={`card trial-card${s.hidden || s.recruiting === 0 ? " dim" : ""}`}>
        <div className="pills">
          {s.hidden && <span className="pill">Not fulfilled</span>}
          <TierBadge tier={s.recruiting} sites={s.recruitingSites} />
          {t.phases.map((p) => <span className="pill" key={p}>{phaseLabel(p)}</span>)}
          {stale && <span className="pill muted" title="The registry entry has not been updated for over 6 months. Check that it is still recruiting.">Possibly outdated</span>}
        </div>
        <h3><A to={`/trial/${t.nctId}`}>{t.title}</A></h3>
        <div className="meter" role="img" aria-label={fulfilledLine(s.met, total, s.notMet)}>
          <span style={{ width: `${total ? (s.met / total) * 100 : 0}%` }} />
        </div>
        <p className="meta">
          {fulfilledLine(s.met, total, s.notMet)}
          {site && s.distanceKm !== null ? ` · nearest site ${formatKm(s.distanceKm)} away (${site.city}, ${site.country})` : ` · ${countries}`}
          {` · `}<span className="nct">{t.nctId}</span>
        </p>
        <div className="actions">
          <A to={`/trial/${t.nctId}`} className="btn primary small">See criteria</A>
          <button className="btn outline small" onClick={onSave} disabled={!saved && full} aria-pressed={saved}>
            {saved ? "On my shortlist" : full ? `Shortlist full (${config.maxShortlist})` : "Add to shortlist"}
          </button>
        </div>
      </li>
    </>
  )
}

const isOpen = (s: { status?: string }) => s.status === "RECRUITING" || s.status === "NOT_YET_RECRUITING" || s.status === "ENROLLING_BY_INVITATION"

export function TrialPage({ id }: { id: string }) {
  const { byId, profile, home, shortlist, toggleShortlist } = useApp()
  const t = byId.get(id)
  const match = useMemo(() => (t ? matchTrial(t, profile, home) : null), [t, profile, home])
  if (!t || !match) return <main className="page narrow"><h1>Trial not found</h1><p>It may have stopped recruiting since your last visit. <A to="/results">Back to results</A></p></main>
  const facts = plainFacts(t)
  const links = registryLinks(t)
  const saved = shortlist.includes(t.nctId)
  const sites = [...t.sites]
    .map((s) => ({ s, d: home && s.lat !== undefined && s.lon !== undefined ? haversineKm(home, { lat: s.lat, lon: s.lon }) : null }))
    .sort((a, b) => Number(isOpen(b.s)) - Number(isOpen(a.s)) || (a.d ?? 1e9) - (b.d ?? 1e9))

  return (
    <main className="page">
      <p><A to="/results">← Back to results</A></p>
      <Disclaimer />
      <h1>{t.title}</h1>
      <p className="meta">
        <span className="nct">{t.nctId}</span> · {t.phases.map(phaseLabel).join(", ") || "no phase stated"} · registry entry updated {t.lastUpdated || "unknown"}
        {isStale(t, new Date()) && <span className="pill muted">Possibly outdated: confirm with the site</span>}
      </p>
      <p className="pills">
        <TierBadge tier={match.recruiting} sites={match.recruitingSites} />
        <span className="pill">{t.status === "RECRUITING" ? "Registry status: recruiting" : "Registry status: not yet recruiting"}</span>
      </p>
      {match.recruiting === 0 && <p className="callout">{NO_RECRUITING_SITE}</p>}
      <p className="actions noprint">
        <button className={`btn${saved ? "" : " primary"}`} onClick={() => toggleShortlist(t.nctId)} disabled={!saved && shortlist.length >= config.maxShortlist}>
          {saved ? "On my shortlist" : "Add to shortlist"}
        </button>
        <button className="btn" onClick={() => window.print()}>Print this trial</button>
      </p>

      <section>
        <h2>In plain terms</h2>
        <p className="meta">Assembled from structured registry fields, not written by a person or a language model. Read the full registry entry before deciding anything.</p>
        <dl className="facts">
          {facts.tested.length > 0 && (<><dt>What is tested</dt><dd>{facts.tested.join("; ")}</dd></>)}
          {facts.against.length > 0 && (<><dt>Compared with</dt><dd>{facts.against.join("; ")}</dd></>)}
          {facts.facts.map((f, i) => (<div key={`${f.label}-${i}`}><dt>{f.label}</dt><dd>{f.text}</dd></div>))}
        </dl>
        {t.briefSummary && (
          <details>
            <summary>Official summary from the registry (original wording)</summary>
            <p className="orig">{t.briefSummary}</p>
          </details>
        )}
      </section>

      <section>
        <h2>Eligibility criteria</h2>
        <p className="lead">{fulfilledLine(match.met, match.results.length, match.notMet)}</p>
        {match.notMet > 0 && <p className="callout">At least one criterion is not fulfilled based on your answers. Check that they are right: <A to="/questions">edit my answers</A>.</p>}
        {match.results.length === 0 ? <p className="meta">No eligibility criteria could be read from this entry.</p> : <CriteriaSections results={match.results} />}
        <details>
          <summary>Full eligibility text from the registry</summary>
          <pre className="orig">{t.eligibilityText || "—"}</pre>
        </details>
      </section>

      <section>
        <h2>Sites ({t.sites.length})</h2>
        <p className="meta">Distances are straight-line estimates from your postcode area, not travel times.{!home && " Enter your postcode in the questions to see them."}</p>
        <ul className="sites">
          {sites.slice(0, 40).map(({ s, d }, i) => (
            <li key={i}>
              {s.status ? (
                <span className={`pill${isOpen(s) ? " live" : " muted"}`}>{s.status.toLowerCase().replace(/_/g, " ")}</span>
              ) : (
                <span className="pill caution">status not stated</span>
              )}
              <strong>{s.facility}</strong>
              <span>{[s.city, s.country].filter(Boolean).join(", ")}{d !== null && ` · ${formatKm(d)}`}</span>
              {(s.contactName || s.contactPhone || s.contactEmail) && (
                <div className="meta">
                  {s.contactName} {s.contactPhone && <a href={`tel:${s.contactPhone.replace(/\s/g, "")}`}>{s.contactPhone}</a>} {s.contactEmail && <a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a>}
                </div>
              )}
            </li>
          ))}
        </ul>
        {t.sites.length > 40 && <p className="meta">…and {t.sites.length - 40} more on the registry page.</p>}
        {t.centralContact && (
          <p>
            <strong>Study contact:</strong> {t.centralContact.name} {t.centralContact.phone && <a href={`tel:${t.centralContact.phone.replace(/\s/g, "")}`}>{t.centralContact.phone}</a>}{" "}
            {t.centralContact.email && <a href={`mailto:${t.centralContact.email}`}>{t.centralContact.email}</a>}
          </p>
        )}
      </section>

      <section>
        <h2>Registry entries</h2>
        <ul>
          {links.map((l) => (
            <li key={l.url}>
              <a href={l.url} rel="noreferrer noopener" target="_blank">{l.label}: {l.id}</a>
            </li>
          ))}
        </ul>
        <p className="meta">Source: ClinicalTrials.gov. Opening these links contacts the registry directly; this site is not told which trial you open.</p>
      </section>
    </main>
  )
}


const pretty = (v: string | number | null | undefined, unknown = "not known / not answered") => (v === null || v === undefined || v === "unknown" ? unknown : String(v))

const profileLines = (p: Profile): Array<[string, string]> => {
  const cancer = p.cancerType === "nsclc" ? "Non-small cell lung cancer" : p.cancerType === "sclc" ? "Small cell lung cancer" : "not known"
  const hist = p.histology === "unknown" || p.cancerType === "sclc" ? "" : `, ${p.histology}`
  const markers = Object.entries(p.biomarkers).filter(([, v]) => v !== "unknown").map(([g, v]) => `${g} ${v === "positive" ? "alteration found" : "no alteration"}`)
  const prior = Object.entries(p.priorTherapies).map(([k, v]) => `${k}: ${v === "unknown" ? "not known" : v}`)
  return [
    ["Diagnosis", cancer + hist],
    ["Stage", p.cancerType === "sclc" && p.sclcExtent !== "unknown" ? `${p.sclcExtent} disease` : `${pretty(p.stage)}`],
    ["Gene results", markers.length ? markers.join("; ") : "none entered"],
    ["PD-L1", p.pdl1 === "unknown" ? "not known" : p.pdl1 === "ge50" ? "≥ 50%" : p.pdl1 === "1to49" ? "1–49%" : "< 1%"],
    ["Previous treatment", prior.join("; ")],
    ["Lines of drug treatment for advanced disease", pretty(p.priorLines)],
    ["Current treatment", pretty(p.currentTherapy)],
    ["Brain metastases", p.brainMets === "unknown" ? "not known" : p.brainMets === "none" ? "none" : p.brainMets === "treated" ? "yes, treated and stable" : "yes, untreated or symptomatic"],
    ["Interstitial lung disease / pneumonitis", pretty(p.ild)],
    ["Autoimmune disease", pretty(p.autoimmune)],
    ["Age / sex", `${pretty(p.age)} / ${pretty(p.sex)}`],
    ["ECOG performance status (patient-reported)", pretty(p.ecog)]
  ]
}

export function Shortlist() {
  const { shortlist, byId, toggleShortlist, profile, home } = useApp()
  const [months, setMonths] = useState(3)
  const items = shortlist.map((id) => byId.get(id)).filter((t): t is Trial => !!t)
  const reminder = () => {
    const d = new Date()
    d.setMonth(d.getMonth() + months)
    const ymd = d.toISOString().slice(0, 10).replace(/-/g, "")
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TrialBase prototype//EN", "BEGIN:VEVENT",
      `UID:${Date.now()}@trial-finder.local`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
      `DTSTART;VALUE=DATE:${ymd}`, "SUMMARY:Check again for clinical trials",
      "DESCRIPTION:Open TrialBase, update anything that changed (new scan, new treatment, new test result) and see what is new.", "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n")
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }))
    a.download = "check-trials-again.ics"
    a.click()
  }
  return (
    <main className="page narrow">
      <h1>My shortlist</h1>
      <p className="muted">Pick up to 5 trials to take to your doctor. Stored only on this device.</p>
      {items.length === 0 && <p>Nothing here yet. Use “Add to shortlist” on a trial in <A to="/results">the results</A>.</p>}
      <ol className="cards">
        {items.map((t) => {
          const m = matchTrial(t, profile, home)
          return (
            <li className="card" key={t.nctId}>
              <h3><A to={`/trial/${t.nctId}`}>{t.title}</A></h3>
              <p className="meta"><strong>{fulfilledLine(m.met, m.results.length, m.notMet)}</strong> · {t.nctId}{m.hidden && " · a criterion is now not met"}</p>
              <button className="btn small" onClick={() => toggleShortlist(t.nctId)}>Remove</button>
            </li>
          )
        })}
      </ol>
      {items.length > 0 && (
        <p className="actions">
          <A to="/summary" className="btn primary">Create the doctor summary</A>
        </p>
      )}
      <h2>Check again later</h2>
      <p className="muted">Trials open and close. Download a calendar reminder to come back after your next scan or treatment change.</p>
      <p className="actions">
        <label>
          Remind me in{" "}
          <select value={months} onChange={(e) => setMonths(Number(e.target.value))}>
            {[1, 2, 3, 6].map((m) => <option key={m} value={m}>{m} month{m > 1 ? "s" : ""}</option>)}
          </select>
        </label>
        <button className="btn" onClick={reminder}>Download reminder (.ics)</button>
      </p>
      <Support />
    </main>
  )
}

export function Summary() {
  const { shortlist, byId, profile, home } = useApp()
  const items = shortlist.map((id) => byId.get(id)).filter((t): t is Trial => !!t)
  return (
    <main className="page narrow">
      <p className="noprint actions">
        <A to="/shortlist" className="btn">← Back</A>
        <button className="btn primary" onClick={() => window.print()}>Print or save as PDF</button>
      </p>
      <h1>Clinical trial options to discuss</h1>
      <p className="meta">
        Prepared by the patient or a relative on {new Date().toISOString().slice(0, 10)} using TrialBase (prototype). The information below is self-reported and
        compared automatically with public registry data. It is not a medical assessment and may contain errors. Eligibility must be confirmed by the treating team and the trial site.
      </p>
      <h2>Situation as reported by the patient</h2>
      <table className="plain">
        <tbody>{profileLines(profile).map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}</tbody>
      </table>
      <h2>Trials selected ({items.length})</h2>
      {items.length === 0 && <p>No trials selected.</p>}
      {items.map((t) => {
        const m = matchTrial(t, profile, home)
        const open = m.results.filter((r) => r.status === "unknown" && r.criterion.rule._tag !== "other" || (r.status === "unknown" && r.criterion.source === "registry-text"))
        const failed = m.results.filter((r) => r.status === "notMet")
        const site = m.nearestSite
        return (
          <article key={t.nctId} className="sum-trial">
            <h3>{t.title}</h3>
            <p><strong>{t.nctId}</strong>{t.otherIds.euCt?.map((x) => ` · EU CT ${x}`)}{t.otherIds.eudraCt?.map((x) => ` · EudraCT ${x}`)}{t.otherIds.drks?.map((x) => ` · ${x}`)} · {t.phases.map(phaseLabel).join(", ") || "no phase stated"} · {t.status === "RECRUITING" ? "recruiting" : "not yet recruiting"} · registry entry updated {t.lastUpdated}</p>
            <p>Recruitment: {m.recruiting === 2 ? `${m.recruitingSites} listed site(s) say they are recruiting` : m.recruiting === 1 ? "site recruitment status not stated in the registry" : "no listed site says it is recruiting; confirm with the study team"}.</p>
            <p>Automatic comparison: {fulfilledLine(m.met, m.results.length, m.notMet)}.</p>
            {failed.length > 0 && (
              <>
                <p><strong>Possibly not met (please check):</strong></p>
                <ul>{failed.map((r) => <li key={r.criterion.id}>{r.criterion.text}</li>)}</ul>
              </>
            )}
            <p><strong>Open points for the doctor ({open.length}):</strong></p>
            <ul className="meta">
              {open.slice(0, 25).map((r) => <li key={r.criterion.id}>{r.criterion.kind === "inclusion" ? "Required: " : "Exclusion: "}{r.criterion.text}</li>)}
            </ul>
            {open.length > 25 && <p className="meta">…and {open.length - 25} more in the registry entry.</p>}
            <p className="meta">
              {site && <>Nearest site: {site.facility}, {site.city} ({formatKm(m.distanceKm)}). </>}
              {site?.contactName || site?.contactPhone || site?.contactEmail ? <>Contact: {[site?.contactName, site?.contactPhone, site?.contactEmail].filter(Boolean).join(", ")}. </> : null}
              {t.centralContact && <>Study contact: {[t.centralContact.name, t.centralContact.phone, t.centralContact.email].filter(Boolean).join(", ")}. </>}
              Registry: {registryLinks(t).map((l) => l.url).join("  ")}
            </p>
          </article>
        )
      })}
    </main>
  )
}


export function Privacy() {
  const { profile, shortlist, replaceAll, wipe, bundle } = useApp()
  const [pass, setPass] = useState("")
  const [msg, setMsg] = useState("")
  const [confirmWipe, setConfirmWipe] = useState(false)
  const doExport = async () => {
    if (pass.length < 8) return setMsg("Please choose a passphrase of at least 8 characters. We cannot recover it for you.")
    const blob = new Blob([await encryptJson({ profile, shortlist }, pass)], { type: "application/json" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "trialbase-profile.tfprofile"
    a.click()
    setMsg("Saved. Keep the passphrase safe: without it the file cannot be opened.")
  }
  const doImport = async (f: File | undefined) => {
    if (!f) return
    try {
      const d = (await decryptJson(await f.text(), pass)) as { profile: Profile; shortlist: string[] }
      replaceAll(d.profile, d.shortlist ?? [])
      setMsg("Imported. Your answers are loaded on this device.")
    } catch (e) {
      setMsg((e as Error).message)
    }
  }
  return (
    <main className="page narrow">
      <h1>Your data and privacy</h1>
      <h2>What stays in your browser</h2>
      <p>
        Your answers, your shortlist and your results are stored only in this browser (IndexedDB) and are never sent to any server. The matching is done by code
        running on your own device.
      </p>
      <h2>What the server sees</h2>
      <p>
        When you open this page your browser downloads the static page and one public trial file (<code>lung.json</code>
        {bundle && <>, {bundle.trials.length} trials</>}) plus a postcode table for your country. So the server can tell that someone interested in lung cancer
        trials visited, but nothing about you or your answers. There are no cookies, trackers, third-party fonts or analytics in this prototype.
      </p>
      <h2>How to check this yourself</h2>
      <p>
        Open your browser’s developer tools, choose the <em>Network</em> tab, then answer a question. You will see that no request is made when you answer. You can
        also switch off your internet connection after the page has loaded and everything keeps working.
      </p>
      <h2>Move to another device</h2>
      <p className="muted">Export your answers as an encrypted file. The site cannot recover a lost passphrase.</p>
      <label className="field">
        <span>Passphrase</span>
        <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="off" />
      </label>
      <p className="actions">
        <button className="btn" onClick={doExport}>Export encrypted file</button>
        <label className="btn">
          Import file
          <input type="file" accept=".tfprofile,application/json" hidden onChange={(e) => doImport(e.target.files?.[0])} />
        </label>
      </p>
      <p aria-live="polite" className="muted">{msg}</p>
      <h2>Delete everything</h2>
      <p>Removes your answers, shortlist and saved state from this browser in one step.</p>
      {confirmWipe ? (
        <p className="actions">
          <button className="btn danger" onClick={async () => { await wipe(); setConfirmWipe(false); setMsg("Everything was deleted from this browser."); go("/") }}>Yes, delete everything</button>
          <button className="btn" onClick={() => setConfirmWipe(false)}>Cancel</button>
        </p>
      ) : (
        <button className="btn" onClick={() => setConfirmWipe(true)}>Delete everything</button>
      )}
      <h2>Funding and sources</h2>
      <p>
        Trial data: ClinicalTrials.gov (U.S. National Library of Medicine). Postcode positions: GeoNames (CC BY 4.0). This prototype has no sponsor funding and no
        referral deals.
      </p>
      <Support />
    </main>
  )
}
