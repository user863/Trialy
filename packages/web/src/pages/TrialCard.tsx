import { memo } from "react"
import { displayPhases, phaseLabel } from "@trial-finder/domain"
import { config } from "../config"
import { useI18n } from "../i18n"
import { A, TierBadge, useFulfilledLine } from "../ui"
import type { Row } from "./resultRows"

type TrialCardProps = {
  row: Row
  divider: 0 | 1 | null
  stale: boolean
  saved: boolean
  full: boolean
  onSave: (id: string) => void
}

export const TrialCard = memo(function TrialCard({ row: { s, t }, divider, stale, saved, full, onSave }: TrialCardProps) {
  const { t: tr, countryName, tOr, formatKm } = useI18n()
  const fulfilledLine = useFulfilledLine()
  const site = s.siteIdx >= 0 ? t.sites[s.siteIdx] : undefined
  const total = s.met + s.notMet + s.unknown
  const decided = s.met + s.notMet > 0
  const countries = [...new Set(t.sites.map((x) => countryName(x.country)))].join(", ")

  return (
    <>
      {divider !== null && <li className="grid-divider">{tr(`divider.${divider}`)}</li>}
      <li className={`card trial-card${s.hidden || s.recruiting === 0 ? " dim" : ""}`}>
        <div className="pills">
          {s.hidden && <span className="pill">{tr("status.notMet")}</span>}
          <TierBadge tier={s.recruiting} sites={s.recruitingSites} />
          {displayPhases(t.phases).map((p) => <span className="pill" key={p}>{tOr(`phase.${p}`, phaseLabel(p))}</span>)}
          {stale && <span className="pill muted" title={tr("card.stale.title")}>{tr("card.stale")}</span>}
        </div>
        <h2 className="card-title"><A to={`/trial/${t.nctId}`}>{t.title}</A></h2>
        {decided && (
          <div className="meter" role="img" aria-label={fulfilledLine(s.met, total, s.notMet)}>
            <span style={{ width: `${total ? (s.met / total) * 100 : 0}%` }} />
          </div>
        )}
        <p className="meta">
          {decided ? fulfilledLine(s.met, total, s.notMet) : tr("card.toCheck", { count: total })}
          {site && s.distanceKm !== null ? ` · ${tr("card.nearest", { distance: formatKm(s.distanceKm), city: site.city, country: countryName(site.country) })}` : ` · ${countries}`}
          {` · `}<span className="nct">{t.nctId}</span>
        </p>
        <div className="actions">
          <button className="btn outline small" onClick={() => onSave(t.nctId)} disabled={!saved && full} aria-pressed={saved}>
            {saved ? tr("card.saved") : full ? tr("card.full", { max: config.maxShortlist }) : tr("card.add")}
          </button>
        </div>
      </li>
    </>
  )
})
