import { useEffect, useMemo, useState, type ReactNode } from "react"
import { isStale, phaseLabel } from "@trial-finder/domain"
import { useApp } from "../app"
import { config } from "../config"
import { useI18n } from "../i18n"
import { A, Disclaimer, Support } from "../ui"
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
  const { t: tr, countryName, tOr } = useI18n()
  const { summaries, byId, trials, shortlist, toggleShortlist, postcodeStatus, bundle, loadError, started, now: clock, group } = useApp()
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
        <p className="actions">
          <A to="/questions" className={`btn small${started ? " outline" : " primary"}`}>{tr(started ? "results.edit" : "results.answer")}</A>
        </p>
      </header>
      <Disclaimer />

      <div className="card toolbar">
        <PostcodeBar />
      <details className="filters">
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
            <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
            {tr("filters.showNotFulfilled", { count: hiddenCount })}
          </label>
          <label className="check">
            <input type="checkbox" checked={hideStale} onChange={(e) => setHideStale(e.target.checked)} />
            {tr("filters.hideStale")}
          </label>
        </div>
      </details>
      </div>

      <p className="lead" aria-live="polite">{started ? tr("results.summary", { visible, total: rows.length }) : tr("results.total", { count: rows.length })}</p>
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
