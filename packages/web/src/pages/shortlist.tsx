import { useState } from "react"
import { matchTrial } from "@trial-finder/domain"
import { useApp, useFullTrials } from "../app"
import { config } from "../config"
import { reminderCalendar } from "../ics"
import { useI18n } from "../i18n"
import { A, Support, useFulfilledLine } from "../ui"

export function Shortlist() {
  const { t: tr, rich } = useI18n()
  const fulfilledLine = useFulfilledLine()
  const { shortlist, toggleShortlist, profile, home, now } = useApp()
  const [months, setMonths] = useState(3)
  const { trials: items, ready: itemsReady } = useFullTrials(shortlist)
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
