import { MS_THERAPIES, matchTrial, displayPhases, phaseLabel, registryLinks, type Profile } from "@trial-finder/domain"
import { useApp, useFullTrials } from "../app"
import { config } from "../config"
import { useI18n, type Key } from "../i18n"
import { A, useFulfilledLine } from "../ui"

type Translate = (key: Key, vars?: Record<string, string | number>) => string

const profileLines = (tr: Translate, tOr: (key: string, fallback: string) => string, p: Profile): Array<[string, string]> => {
  const answer = (v: string | number | null | undefined) => (v === null || v === undefined || v === "unknown" ? tr("profile.unanswered") : tOr(`value.${v}`, String(v)))
  const triText = (v: string) => (v === "unknown" ? tr("profile.notKnown") : tOr(`value.${v}`, v))
  const cancer = p.cancerType === "unknown" ? tr("profile.notKnown") : tr(`condition.${p.cancerType}`)
  const hist = p.histology === "unknown" || p.cancerType === "sclc" ? "" : `, ${tr(`histology.${p.histology}`)}`
  const markers = Object.entries(p.biomarkers).filter(([, v]) => v !== "unknown").map(([gene, v]) => tr(v === "positive" ? "profile.gene.positive" : "profile.gene.negative", { gene }))
  const prior = Object.entries(p.priorTherapies).map(([k, v]) => `${tr(`therapy.${k as keyof typeof p.priorTherapies}`)}: ${triText(v)}`)
  const stage = p.cancerType === "sclc" && p.sclcExtent !== "unknown" ? tr(`profile.extent.${p.sclcExtent}`) : p.stage === "unknown" ? tr("profile.unanswered") : p.stage
  const pdl1 = p.pdl1 === "unknown" ? tr("profile.notKnown") : p.pdl1 === "ge50" ? "≥ 50%" : p.pdl1 === "1to49" ? "1-49%" : "< 1%"
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
    [tr("profile.age"), answer(p.age)],
    [tr("profile.sex"), answer(p.sex)],
    [tr("profile.ecog"), answer(p.ecog)]
  ]
}

const generalProfileLines = (tr: Translate, tOr: (key: string, fallback: string) => string, group: string, p: Profile): Array<[string, string]> => {
  const answer = (v: string | number | null | undefined) => (v === null || v === undefined || v === "unknown" ? tr("profile.unanswered") : tOr(`value.${v}`, String(v)))
  const diagnosis: [string, string] = [tr("profile.diagnosis"), tOr(`group.${group}`, group)]
  const person: Array<[string, string]> = [[tr("profile.age"), answer(p.age)], [tr("profile.sex"), answer(p.sex)]]
  if (group !== "ms") return [diagnosis, ...person]
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
    [tr("profile.psychiatric"), answer(p.psychiatric)],
    [tr("profile.otherAutoimmune"), answer(p.otherAutoimmune)],
    [tr("profile.otherTrial"), answer(p.otherTrial)],
    ...person
  ]
}

export function Summary() {
  const { t: tr, tOr, formatDate, formatKm } = useI18n()
  const fulfilledLine = useFulfilledLine()
  const { shortlist, profile, home, now, group } = useApp()
  const { trials: items, ready: itemsReady } = useFullTrials(shortlist)
  const phaseName = (p: string) => tOr(`phase.${p}`, phaseLabel(p))
  const lines = group === config.group ? profileLines(tr, tOr, profile) : generalProfileLines(tr, tOr, group, profile)
  const unanswered = new Set([tr("profile.unanswered"), tr("profile.notKnown")])
  const answered = lines.filter(([, v]) => !unanswered.has(v))
  return (
    <main className="page narrow">
      <p className="noprint actions">
        <A to="/shortlist" className="btn">{tr("summary.back")}</A>
        <button className="btn primary" onClick={() => window.print()}>{tr("summary.print")}</button>
      </p>
      <h1>{tr("summary.title")}</h1>
      <p className="meta">{tr("summary.intro", { date: formatDate(now()) })}</p>
      <h2>{tr("summary.situation")}</h2>
      <table className="plain">
        <tbody>{answered.map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}</tbody>
      </table>
      {answered.length < lines.length && <p className="meta">{tr("summary.unansweredCount", { count: lines.length - answered.length })}</p>}
      <h2>{tr("summary.selected", { count: items.length })}</h2>
      {items.length === 0 && <p aria-live="polite">{itemsReady ? tr("summary.none") : tr("trial.loading")}</p>}
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
            <p><strong>{t.nctId}</strong>{t.otherIds.euCt?.map((x) => ` · EU CT ${x}`)}{t.otherIds.eudraCt?.map((x) => ` · EudraCT ${x}`)}{t.otherIds.drks?.map((x) => ` · ${x}`)} · {displayPhases(t.phases).map(phaseName).join(", ") || tr("trial.noPhase")} · {t.status === "RECRUITING" ? tr("summary.status.recruiting") : tr("summary.status.notYet")} · {tr("trial.updated", { date: t.lastUpdated ? formatDate(t.lastUpdated) : tr("trial.unknownDate") })}</p>
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
