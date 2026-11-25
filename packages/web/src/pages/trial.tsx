import { useMemo } from "react"
import { isStale, matchTrial, displayPhases, phaseLabel, plainFacts, registryLinks, haversineKm } from "@trial-finder/domain"
import { useApp, useFullTrials } from "../app"
import { config } from "../config"
import { CriteriaSections } from "../criteria"
import { useI18n } from "../i18n"
import { A, TierBadge, useFulfilledLine } from "../ui"

const isOpen = (s: { status?: string }) => s.status === "RECRUITING" || s.status === "NOT_YET_RECRUITING" || s.status === "ENROLLING_BY_INVITATION"

export function TrialPage({ id }: { id: string }) {
  const { t: tr, rich, formatDate, formatKm, countryName, tOr } = useI18n()
  const fulfilledLine = useFulfilledLine()
  const { byId, profile, home, shortlist, toggleShortlist, now, bundle, loadError } = useApp()
  const slim = byId.get(id)
  const ids = useMemo(() => [id], [id])
  const { trials: loaded, ready, error } = useFullTrials(ids)
  const t = loaded[0]
  const match = useMemo(() => (t ? matchTrial(t, profile, home) : null), [t, profile, home])
  if (loadError) return <main className="page narrow"><p className="error">{loadError}</p></main>
  if (!bundle) return <main className="page narrow"><p aria-live="polite">{tr("results.matching")}</p></main>
  if (!slim) return <main className="page narrow"><h1>{tr("trial.notFound")}</h1><p>{rich("trial.notFound.text", { link: (text) => <A to="/results">{text}</A> })}</p></main>
  if (!t || !match)
    return (
      <main className="page narrow">
        <p><A to="/results">{tr("trial.back")}</A></p>
        <h1>{slim.title}</h1>
        {error ? <p className="error">{tr("error.dataLoad", { reason: error })}</p> : <p aria-live="polite">{ready ? tr("trial.notFound") : tr("trial.loading")}</p>}
      </main>
    )
  const facts = plainFacts(t)
  const phaseName = (p: string) => tOr(`phase.${p}`, phaseLabel(p))
  const phases = displayPhases(t.phases).map(phaseName).join(", ")
  const links = registryLinks(t)
  const saved = shortlist.includes(t.nctId)
  const central = t.centralContact
  const sameContact = (s: { contactName?: string }) => !!central?.name && s.contactName === central.name
  const sites = [...t.sites]
    .map((s) => ({ s, d: home && s.lat !== undefined && s.lon !== undefined ? haversineKm(home, { lat: s.lat, lon: s.lon }) : null }))
    .sort((a, b) => Number(isOpen(b.s)) - Number(isOpen(a.s)) || (a.d ?? 1e9) - (b.d ?? 1e9))

  return (
    <main className="page">
      <p><A to="/results">{tr("trial.back")}</A></p>
      <h1>
        <a className="title-link" href={links[0]!.url} target="_blank" rel="noreferrer noopener" aria-label={`${t.title} (${tr("trial.openRegistry", { registry: links[0]!.label })})`} title={tr("trial.openRegistry", { registry: links[0]!.label })}>
          {t.title.split(" ").slice(0, -1).join(" ")}{" "}
          <span className="nowrap">
            {t.title.split(" ").slice(-1)[0]}
            <svg viewBox="0 0 24 24" width="0.9em" height="0.9em" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <path d="M15 3h6v6" />
            <path d="M10 14 21 3" />
          </svg>
          </span>
        </a>
      </h1>
      <p className="pills">
        <TierBadge tier={match.recruiting} sites={match.recruitingSites} />
        {!(match.recruiting === 2 && t.status === "RECRUITING") && <span className="pill">{t.status === "RECRUITING" ? tr("trial.registryRecruiting") : tr("trial.registryNotYet")}</span>}
        {isStale(t, now()) && <span className="pill muted">{tr("trial.outdated")}</span>}
      </p>
      <p className="meta">
        <span className="nct">{t.nctId}</span>
        {phases && ` · ${phases}`} · {tr("trial.updated", { date: t.lastUpdated ? formatDate(t.lastUpdated) : tr("trial.unknownDate") })}
      </p>
      {match.recruiting === 0 && <p className="callout">{tr("tier.none.title")}</p>}
      <p className="actions noprint">
        <button className={`btn${saved ? "" : " primary"}`} onClick={() => toggleShortlist(t.nctId)} disabled={!saved && shortlist.length >= config.maxShortlist}>
          {saved ? tr("card.remove") : tr("card.add")}
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
          {facts.allocation !== "unstated" && <div><dt>{tr("plain.randomisation")}</dt><dd>{tr(`allocation.${facts.allocation}`)}</dd></div>}
          <div><dt>{tr("plain.blinding")}</dt><dd>{tr(`blinding.${facts.blinding}`)}</dd></div>
          {facts.hasPlacebo && <div><dt>{tr("plain.placebo")}</dt><dd>{tr("placebo.yes")}</dd></div>}
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
                <span className={`pill${isOpen(s) ? " live" : " muted"}`}>{tOr(`siteStatus.${s.status}`, s.status.charAt(0) + s.status.slice(1).toLowerCase().replace(/_/g, " "))}</span>
              ) : (
                <span className="pill caution">{tr("sites.unstated")}</span>
              )}
              <strong>{s.facility}</strong>
              <span>{[s.city, countryName(s.country)].filter(Boolean).join(", ")}{d !== null && ` - ${formatKm(d)}`}</span>
              {(s.contactName || s.contactPhone || s.contactEmail) && !sameContact(s) && (
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

      {links.length > 1 ? (
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
      ) : (
        <p className="meta">{tr("registry.source")}</p>
      )}
    </main>
  )
}
