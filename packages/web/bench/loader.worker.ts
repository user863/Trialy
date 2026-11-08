import { emptyProfile, matchTrials, type LatLon, type Trial } from "@trial-finder/domain"

let trials: Trial[] = []

self.onmessage = async (e: MessageEvent) => {
  const m = e.data as { type: "load"; url: string } | { type: "match"; home: LatLon }
  if (m.type === "load") {
    const t0 = performance.now()
    const r = await fetch(m.url)
    const text = await r.text()
    const t1 = performance.now()
    trials = (JSON.parse(text) as { trials: Trial[] }).trials
    const t2 = performance.now()
    ;(self as unknown as Worker).postMessage({ type: "loaded", fetchMs: t1 - t0, parseMs: t2 - t1, trials: trials.length })
    return
  }
  const t0 = performance.now()
  const n = matchTrials(trials, { ...emptyProfile(), age: 45, sex: "female" }, m.home).length
  ;(self as unknown as Worker).postMessage({ type: "matched", ms: performance.now() - t0, n })
}
