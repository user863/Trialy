import { useEffect, useMemo, useState, type ReactNode } from "react"
import { isStale, phaseLabel } from "@trial-finder/domain"
import { useApp } from "../app"
import { config } from "../config"
import { fieldLabel, STEP_FOR_FIELD } from "../questions"
import { useI18n } from "../i18n"
import { A, Disclaimer, RegistryEnglishNote, Support } from "../ui"
import { PostcodeBar } from "./PostcodeBar"
import { TrialCard } from "./TrialCard"
import { KINDS, PHASES, sortRows, SORTS, tierDivider, treatmentKinds, type Row, type SortKey } from "./resultRows"

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
  const [sort, setSort] = useState<SortKey>("recommended")
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

  useEffect(() => setLimit(config.pageSize), [showHidden, maxKm, country, phase, kind, status, hideStale, recruitingOnly, sort])

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

  const sortOf = sort === "distance" && postcodeStatus !== "found" ? "recommended" : sort
  const filtered = sortRows(rows.filter(matches), sortOf)
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

      <details className="card filters">
        <summary>{tr("filters.title")}</summary>
        <div className="filter-grid">
          <FilterSelect label={tr("filters.sort")} value={sort} onChange={(v) => setSort(v as SortKey)}>
            {SORTS.map((k) => <option key={k} value={k} disabled={k === "distance" && postcodeStatus !== "found"}>{tr(`sort.${k}`)}{k === "distance" && postcodeStatus !== "found" ? ` (${tr("sort.needPostcode")})` : ""}</option>)}
          </FilterSelect>
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
            divider={sortOf === "recommended" ? tierDivider(row, list[i - 1]) : null}
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
