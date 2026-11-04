import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { emptyProfile, type Bundle, type LatLon, type Profile, type Trial } from "@trial-finder/domain"
import { config } from "./config"
import { valueOr, type Result } from "./result"
import { kvGet, kvSet, wipeAll, type StoreError } from "./store"
import type { Summary } from "./worker"

interface Impact {
  field: string
  trials: number
  criteria: number
}
interface Snapshot {
  version: string
  at: string
  fits: Record<string, { met: number; unknown: number; hidden: boolean }>
}

interface App {
  loaded: boolean
  profile: Profile
  setProfile: (f: (p: Profile) => Profile) => void
  started: boolean
  markStarted: () => void
  shortlist: string[]
  toggleShortlist: (id: string) => void
  bundle: Bundle | null
  trials: ReadonlyArray<Trial>
  byId: Map<string, Trial>
  loadError: string | null
  home: LatLon | null
  postcodeStatus: "empty" | "loading" | "found" | "unknown"
  summaries: Summary[] | null
  impact: Impact[]
  prevSnapshot: Snapshot | null
  dismissSnapshot: () => void
  replaceAll: (p: Profile, shortlist: string[]) => void
  wipe: () => Promise<Result<void, StoreError>>
  now: () => Date
  storageOk: boolean
}

export const systemClock = (): Date => new Date()

const Ctx = createContext<App>(null as unknown as App)
export const useApp = () => useContext(Ctx)

const postcodeTables = new Map<string, Promise<Record<string, [number, number]>>>()
const loadPostcodes = (cc: string) => {
  if (!postcodeTables.has(cc))
    postcodeTables.set(
      cc,
      fetch(`${config.dataUrl}/postcodes-${cc}.json`).then((r) => {
        if (!r.ok) throw new Error("no postcode table")
        return r.json()
      })
    )
  return postcodeTables.get(cc)!
}

const normalise = (p: Partial<Profile> | undefined): Profile => {
  const e = emptyProfile()
  if (!p) return e
  return {
    ...e,
    ...p,
    biomarkers: { ...e.biomarkers, ...(p.biomarkers ?? {}) },
    priorTherapies: { ...e.priorTherapies, ...(p.priorTherapies ?? {}) },
    labs: { ...e.labs, ...(p.labs ?? {}) }
  }
}

export function AppProvider({ children, now = systemClock }: { children: ReactNode; now?: () => Date }) {
  const [loaded, setLoaded] = useState(false)
  const [storageOk, setStorageOk] = useState(true)
  const [profile, setProfileState] = useState<Profile>(emptyProfile())
  const [started, setStarted] = useState(false)
  const [shortlist, setShortlist] = useState<string[]>([])
  const [bundle, setBundle] = useState<Bundle | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [home, setHome] = useState<LatLon | null>(null)
  const [postcodeStatus, setPostcodeStatus] = useState<App["postcodeStatus"]>("empty")
  const [summaries, setSummaries] = useState<Summary[] | null>(null)
  const [impact, setImpact] = useState<Impact[]>([])
  const [prevSnapshot, setPrevSnapshot] = useState<Snapshot | null>(null)
  const worker = useRef<Worker | null>(null)
  const workerReady = useRef(false)
  const reqId = useRef(0)
  const snapshotPending = useRef(false)

  const persist = useCallback((key: string, value: unknown) => {
    void kvSet(key, value).then((saved) => {
      if (!saved.ok) setStorageOk(false)
    })
  }, [])

  useEffect(() => {
    ;(async () => {
      const reads = await Promise.all([
        kvGet<Partial<Profile>>("profile"),
        kvGet<string[]>("shortlist"),
        kvGet<boolean>("started"),
        kvGet<Snapshot>("snapshot")
      ])
      const [p, s, st, snap] = reads
      if (reads.some((read) => !read.ok)) setStorageOk(false)
      setProfileState(normalise(valueOr(p, undefined)))
      setShortlist(valueOr(s, undefined) ?? [])
      setStarted(!!valueOr(st, undefined))
      setPrevSnapshot(valueOr(snap, undefined) ?? null)
      setLoaded(true)
    })()
  }, [])

  useEffect(() => {
    fetch(`${config.dataUrl}/${config.group}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<Bundle>
      })
      .then(setBundle)
      .catch((e) =>
        setLoadError(`The trial data could not be loaded (${e.message}). Run "npm run pipeline" to build it, then reload.`)
      )
  }, [])

  const trials = useMemo<ReadonlyArray<Trial>>(() => bundle?.trials ?? [], [bundle])
  const byId = useMemo(() => new Map(trials.map((t) => [t.nctId, t])), [trials])

  useEffect(() => {
    if (!trials.length) return
    const w = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" })
    worker.current = w
    workerReady.current = false
    w.onmessage = (e) => {
      const m = e.data
      if (m.type === "ready") {
        workerReady.current = true
        setReady((n) => n + 1)
      } else if (m.type === "result" && m.id === reqId.current) {
        setSummaries(m.summaries)
        setImpact(m.impact)
      }
    }
    w.postMessage({ type: "init", trials })
    return () => w.terminate()
  }, [trials])
  const [ready, setReady] = useState(0)

  useEffect(() => {
    const code = profile.postcode.trim()
    const len = config.postcodeLength[profile.country]
    if (!code) {
      setHome(null)
      setPostcodeStatus("empty")
      return
    }
    if (code.length < len) {
      setHome(null)
      setPostcodeStatus("loading")
      return
    }
    let cancelled = false
    loadPostcodes(profile.country)
      .then((t) => {
        if (cancelled) return
        const hit = t[code]
        setHome(hit ? { lat: hit[0], lon: hit[1] } : null)
        setPostcodeStatus(hit ? "found" : "unknown")
      })
      .catch(() => {
        if (!cancelled) {
          setHome(null)
          setPostcodeStatus("unknown")
        }
      })
    return () => {
      cancelled = true
    }
  }, [profile.postcode, profile.country])

  useEffect(() => {
    if (!workerReady.current || !worker.current || !loaded) return
    const id = ++reqId.current
    worker.current.postMessage({ type: "match", id, profile, home })
    snapshotPending.current = true
  }, [profile, home, ready, loaded])

  useEffect(() => {
    if (!summaries || !bundle || !started || !snapshotPending.current) return
    snapshotPending.current = false
    const snap: Snapshot = {
      version: bundle.version,
      at: now().toISOString(),
      fits: Object.fromEntries(summaries.map((s) => [s.nctId, { met: s.met, unknown: s.unknown, hidden: s.hidden }]))
    }
    persist("snapshot", snap)
  }, [summaries, bundle, started, persist, now])

  const setProfile = useCallback((f: (p: Profile) => Profile) => {
    setProfileState((p) => {
      const next = f(p)
      persist("profile", next)
      return next
    })
  }, [persist])

  const markStarted = useCallback(() => {
    setStarted(true)
    persist("started", true)
  }, [persist])

  const toggleShortlist = useCallback((id: string) => {
    setShortlist((s) => {
      const next = s.includes(id) ? s.filter((x) => x !== id) : s.length >= config.maxShortlist ? s : [...s, id]
      persist("shortlist", next)
      return next
    })
  }, [persist])

  const replaceAll = useCallback((p: Profile, sl: string[]) => {
    const n = normalise(p)
    setProfileState(n)
    setShortlist(sl)
    setStarted(true)
    persist("profile", n)
    persist("shortlist", sl)
    persist("started", true)
  }, [persist])

  const wipe = useCallback(async () => {
    const wiped = await wipeAll()
    if (!wiped.ok) return wiped
    setProfileState(emptyProfile())
    setShortlist([])
    setStarted(false)
    setPrevSnapshot(null)
    snapshotPending.current = false
    return wiped
  }, [])

  const value: App = {
    loaded,
    profile,
    setProfile,
    started,
    markStarted,
    shortlist,
    toggleShortlist,
    bundle,
    trials,
    byId,
    loadError,
    home,
    postcodeStatus,
    summaries,
    impact,
    prevSnapshot,
    dismissSnapshot: () => setPrevSnapshot(null),
    replaceAll,
    wipe,
    now,
    storageOk
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useHashRoute(): [string, (to: string) => void] {
  const get = () => window.location.hash.replace(/^#/, "") || "/"
  const [route, setRoute] = useState(get)
  useEffect(() => {
    const on = () => {
      setRoute(get())
      window.scrollTo(0, 0)
    }
    window.addEventListener("hashchange", on)
    return () => window.removeEventListener("hashchange", on)
  }, [])
  return [route, (to) => (window.location.hash = to)]
}

