/// <reference lib="webworker" />
import { groupTrials, matchTrials, unknownImpact, type LatLon, type Profile, type Trial, type TrialIndex } from "@trial-finder/domain"

let trials: Trial[] = []

export interface Summary {
  nctId: string
  met: number
  notMet: number
  unknown: number
  manual: number
  hidden: boolean
  recruiting: 0 | 1 | 2
  recruitingSites: number
  distanceKm: number | null
  siteIdx: number
}

self.onmessage = (e: MessageEvent) => {
  const m = e.data as
    | { type: "init"; trials: Trial[] }
    | { type: "initIndex"; text: string; group: string }
    | { type: "match"; id: number; profile: Profile; home: LatLon | null }
  if (m.type === "init") {
    trials = m.trials
    ;(self as unknown as Worker).postMessage({ type: "ready" })
    return
  }
  if (m.type === "initIndex") {
    trials = groupTrials(JSON.parse(m.text) as TrialIndex, m.group)
    ;(self as unknown as Worker).postMessage({ type: "ready" })
    return
  }
  const ms = matchTrials(trials, m.profile, m.home)
  const summaries: Summary[] = ms.map((x) => ({
    nctId: x.trial.nctId,
    met: x.met,
    notMet: x.notMet,
    unknown: x.unknown,
    manual: x.manual,
    hidden: x.hidden,
    recruiting: x.recruiting,
    recruitingSites: x.recruitingSites,
    distanceKm: x.distanceKm,
    siteIdx: x.nearestSite ? x.trial.sites.indexOf(x.nearestSite) : -1
  }))
  ;(self as unknown as Worker).postMessage({ type: "result", id: m.id, summaries, impact: unknownImpact(ms).slice(0, 6) })
}
