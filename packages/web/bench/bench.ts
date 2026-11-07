import { bucketOf, emptyProfile, fullTrial, groupTrials, type TrialDetail, type TrialIndex } from "@trial-finder/domain"

const params = new URLSearchParams(location.search)
const file = params.get("file") ?? "covered.json"
const mode = params.get("mode") ?? "main"
const runs = Number(params.get("runs") ?? 5)
const home = { lat: 52.52, lon: 13.405 }
const url = `/bench-data/${file}`

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!
const once = <T>(w: Worker, type: string, msg: unknown) =>
  new Promise<T>((resolve) => {
    const on = (e: MessageEvent) => {
      if (e.data.type === type) {
        w.removeEventListener("message", on)
        resolve(e.data as T)
      }
    }
    w.addEventListener("message", on)
    w.postMessage(msg)
  })

const runTiered = async () => {
  const t0 = performance.now()
  const text = await (await fetch(`/bench-data/tiered/index.json`)).text()
  const t1 = performance.now()
  const index = JSON.parse(text) as TrialIndex
  const t2 = performance.now()
  const slim = groupTrials(index, "all")
  const t3 = performance.now()
  const w = new Worker(new URL("../src/worker.ts", import.meta.url), { type: "module" })
  await new Promise<void>((resolve) => {
    w.addEventListener("message", (e) => e.data.type === "ready" && resolve())
    w.postMessage({ type: "initIndex", text, group: "all" })
  })
  const t4 = performance.now()
  const ms: number[] = []
  for (let i = 0; i < runs; i++) {
    const s = performance.now()
    await new Promise<void>((resolve) => {
      const on = (e: MessageEvent) => {
        if (e.data.type === "result") {
          w.removeEventListener("message", on)
          resolve()
        }
      }
      w.addEventListener("message", on)
      w.postMessage({ type: "match", id: i + 1, profile: { ...emptyProfile(), age: 45, sex: "female" }, home })
    })
    ms.push(performance.now() - s)
  }
  const entry = index.trials[Math.floor(index.trials.length / 2)]!
  const d0 = performance.now()
  const n = bucketOf(entry.nctId, index.bucketCount)
  const bucket = (await (await fetch(`/bench-data/tiered/details/${String(n).padStart(3, "0")}.json`)).json()) as Record<string, TrialDetail>
  const full = fullTrial(index, entry, bucket[entry.nctId]!)
  const detailMs = performance.now() - d0
  return {
    mode,
    file: "tiered",
    trials: slim.length,
    fetchMs: t1 - t0,
    parseMs: t2 - t1,
    buildMs: t3 - t2,
    cloneMs: t4 - t3,
    loadTotalMs: t4 - t0,
    matchMs: ms,
    matchMedianMs: median(ms),
    detailOpenMs: detailMs,
    detailCriteria: full.criteria.length,
    heapMB: heap()
  }
}

const run = async () => {
  if (mode === "tiered") return runTiered()
  if (mode === "worker") {
    const w = new Worker(new URL("./loader.worker.ts", import.meta.url), { type: "module" })
    const t0 = performance.now()
    const loaded = await once<{ fetchMs: number; parseMs: number; trials: number }>(w, "loaded", { type: "load", url })
    const total = performance.now() - t0
    const ms: number[] = []
    for (let i = 0; i < runs; i++) ms.push((await once<{ ms: number }>(w, "matched", { type: "match", home })).ms)
    return { mode, file, trials: loaded.trials, fetchMs: loaded.fetchMs, parseMs: loaded.parseMs, cloneMs: 0, loadTotalMs: total, matchMs: ms, matchMedianMs: median(ms), heapMB: heap() }
  }
  const t0 = performance.now()
  const r = await fetch(url)
  const text = await r.text()
  const t1 = performance.now()
  const data = JSON.parse(text) as { trials: unknown[] }
  const t2 = performance.now()
  const w = new Worker(new URL("../src/worker.ts", import.meta.url), { type: "module" })
  await new Promise<void>((resolve) => {
    w.addEventListener("message", (e) => e.data.type === "ready" && resolve())
    w.postMessage({ type: "init", trials: data.trials })
  })
  const t3 = performance.now()
  const ms: number[] = []
  for (let i = 0; i < runs; i++) {
    const s = performance.now()
    await new Promise<void>((resolve) => {
      const on = (e: MessageEvent) => {
        if (e.data.type === "result") {
          w.removeEventListener("message", on)
          resolve()
        }
      }
      w.addEventListener("message", on)
      w.postMessage({ type: "match", id: i + 1, profile: { ...emptyProfile(), age: 45, sex: "female" }, home })
    })
    ms.push(performance.now() - s)
  }
  return { mode, file, trials: data.trials.length, fetchMs: t1 - t0, parseMs: t2 - t1, cloneMs: t3 - t2, loadTotalMs: t3 - t0, matchMs: ms, matchMedianMs: median(ms), heapMB: heap() }
}

const heap = () => Math.round(((performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0) / 1048576)

run().then(
  (r) => {
    ;(window as unknown as { __bench: unknown }).__bench = r
    document.getElementById("out")!.textContent = JSON.stringify(r, null, 2)
  },
  (e) => {
    ;(window as unknown as { __bench: unknown }).__bench = { error: String(e) }
    document.getElementById("out")!.textContent = String(e)
  }
)
