import { matchTrial } from "@trial-finder/domain"
import { useApp, useFullTrials } from "../app"
import { config } from "../config"
import { useI18n } from "../i18n"
import { A, Support, useFulfilledLine } from "../ui"

export function Shortlist() {
  const { t: tr, rich } = useI18n()
  const fulfilledLine = useFulfilledLine()
  const { shortlist, toggleShortlist, profile, home } = useApp()
  const { trials: items, ready: itemsReady } = useFullTrials(shortlist)
  return (
    <main className="page narrow">
      <h1>{tr("shortlist.title")}</h1>
      <p className="muted">{tr("shortlist.lead", { max: config.maxShortlist })}</p>
      {shortlist.length === 0 && <p>{rich("shortlist.empty", { link: (text) => <A to="/results">{text}</A> })}</p>}
      {shortlist.length > 0 && !itemsReady && <p aria-live="polite">{tr("trial.loading")}</p>}
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
      <Support />
    </main>
  )
}
