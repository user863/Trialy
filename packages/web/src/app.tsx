import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { bucketOf, emptyProfile, fullTrial, groupTrials, type Bundle, type LatLon, type Profile, type Trial, type TrialDetail, type TrialIndex } from "@trial-finder/domain"
import { config } from "./config"
import { useI18n } from "./i18n"
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

export interface ManifestGroup {
  id: string
  label: string
  trials: number
  file: string
}

interface App {
  loaded: boolean
  groups: ReadonlyArray<ManifestGroup>
  group: string
  setGroup: (id: string) => void
  profile: Profile
  setProfile: (f: (p: Profile) => Profile) => void
  started: boolean
  markStarted: () => void
  shortlist: string[]
  toggleShortlist: (id: string) => void
  bundle: Bundle | null
  trials: ReadonlyArray<Trial>
  byId: Map<string, Trial>
  index: TrialIndex | null
  loadTrials: (ids: ReadonlyArray<string>) => Promise<Trial[]>
  loadError: string | null
  home: LatLon | null
  postcodeStatus: "empty" | "loading" | "found" | "unknown"
  summaries: Summary[] | null
  impact: Impact[]
  prevSnapshot: Snapshot | null
  dismissSnapshot: () => void
  replaceAll: (p: Profile, shortlist: string[], group?: string) => void
  wipe: () => Promise<Result<void, StoreError>>
  now: () => Date
  storageOk: boolean
}

export const systemClock = (): Date => new Date()

const scoped = (key: string, group: string) => (group === config.group ? key : `${key}:${group}`)

const loadScoped = async (group: string) => {
  const [shortlist, snapshot] = await Promise.all([kvGet<string[]>(scoped("shortlist", group)), kvGet<Snapshot>(scoped("snapshot", group))])
  return { shortlist: valueOr(shortlist, undefined) ?? [], snapshot: valueOr(snapshot, undefined) ?? null, ok: shortlist.ok && snapshot.ok }
}

const Ctx = createContext<App>(null as unknown as App)
export const useApp = () => useContext(Ctx)

type PostcodeTables = Record<string, Record<string, [number, number]>>

let postcodeTables: Promise<PostcodeTables> | null = null
const loadPostcodes = () => {
  postcodeTables ??= fetch(`${config.dataUrl}/postcodes.json`).then((r) => {
    if (!r.ok) throw new Error("no postcode table")
    return r.json() as Promise<PostcodeTables>
  })
  return postcodeTables
}

const detailBuckets = new Map<string, Promise<Record<string, TrialDetail>>>()
const loadBucket = (n: number) => {
  const file = `${String(n).padStart(3, "0")}.json`
  if (!detailBuckets.has(file))
    detailBuckets.set(
      file,
      fetch(`${config.dataUrl}/details/${file}`)
        .then((r) => (r.ok ? (r.json() as Promise<Record<string, TrialDetail>>) : Promise.reject(new Error(`HTTP ${r.status}`))))
        .catch((e) => {
          detailBuckets.delete(file)
          throw e
        })
    )
  return detailBuckets.get(file)!
}

const normalise = (p: Partial<Profile> | undefined): Profile => {
  const e = emptyProfile()
  if (!p) return e
  return {
    ...e,
    ...p,
    biomarkers: { ...e.biomarkers, ...(p.biomarkers ?? {}) },
    priorTherapies: { ...e.priorTherapies, ...(p.priorTherapies ?? {}) },
    msTherapies: { ...e.msTherapies, ...(p.msTherapies ?? {}) },
    labs: { ...e.labs, ...(p.labs ?? {}) }
  }
}

export function AppProvider({ children, now = systemClock }: { children: ReactNode; now?: () => Date }) {
  const { t } = useI18n()
  const [loaded, setLoaded] = useState(false)
  const [group, setGroupState] = useState<string>(config.group)
  const [storageOk, setStorageOk] = useState(true)
  const [profile, setProfileState] = useState<Profile>(emptyProfile())
  const [started, setStarted] = useState(false)
  const [shortlist, setShortlist] = useState<string[]>([])
  const [index, setIndex] = useState<TrialIndex | null>(null)
  const indexText = useRef("")
  const [loadReason, setLoadReason] = useState<string | null>(null)
  const loadError = loadReason === null ? null : t("error.dataLoad", { reason: loadReason })
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
      const stored = await kvGet<string>("group")
      const initial = valueOr(stored, undefined) ?? config.group
      const [p, st, scopedData] = await Promise.all([kvGet<Partial<Profile>>("profile"), kvGet<boolean>("started"), loadScoped(initial)])
      if (!stored.ok || !p.ok || !st.ok || !scopedData.ok) setStorageOk(false)
      setGroupState(initial)
      setProfileState(normalise(valueOr(p, undefined)))
      setShortlist(scopedData.shortlist)
      setStarted(!!valueOr(st, undefined))
      setPrevSnapshot(scopedData.snapshot)
      setLoaded(true)
    })()
  }, [])

  useEffect(() => {
    if (!loaded) return
    fetch(`${config.dataUrl}/index.json`)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((text) => {
        indexText.current = text
        setIndex(JSON.parse(text) as TrialIndex)
        setLoadReason(null)
      })
      .catch((e) => setLoadReason(e.message))
    void loadPostcodes().catch(() => undefined)
  }, [loaded])

  const groups = useMemo<ReadonlyArray<ManifestGroup>>(() => (index?.groups ?? []).map((g) => ({ id: g.id, label: g.label, trials: g.trials, file: "" })), [index])

  useEffect(() => {
    if (groups.length && !groups.some((g) => g.id === group)) setGroupState(config.group)
  }, [groups, group])

  const bundle = useMemo<Bundle | null>(() => {
    const g = index?.groups.find((x) => x.id === group)
    if (!index || !g) return null
    return { group: g.id, groupLabel: g.label, version: g.version, generatedAt: g.generatedAt, source: g.source, trials: groupTrials(index, g.id), changes: g.changes }
  }, [index, group])

  useEffect(() => setSummaries(null), [bundle])

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
    w.postMessage({ type: "initIndex", text: indexText.current, group })
    return () => w.terminate()
  }, [trials, group])
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
    loadPostcodes()
      .then((tables) => {
        if (cancelled) return
        const hit = tables[profile.country]?.[code]
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
    if (!summaries || !bundle || bundle.group !== group || !started || !snapshotPending.current) return
    snapshotPending.current = false
    const snap: Snapshot = {
      version: bundle.version,
      at: now().toISOString(),
      fits: Object.fromEntries(summaries.map((s) => [s.nctId, { met: s.met, unknown: s.unknown, hidden: s.hidden }]))
    }
    persist(scoped("snapshot", group), snap)
  }, [summaries, bundle, group, started, persist, now])

  const setGroup = useCallback(
    (id: string) => {
      if (id === group) return
      setGroupState(id)
      persist("group", id)
      void loadScoped(id).then((data) => {
        setShortlist(data.shortlist)
        setPrevSnapshot(data.snapshot)
        if (!data.ok) setStorageOk(false)
      })
    },
    [group, persist]
  )

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
      persist(scoped("shortlist", group), next)
      return next
    })
  }, [persist, group])

  const replaceAll = useCallback((p: Profile, sl: string[], importedGroup?: string) => {
    const n = normalise(p)
    const target = importedGroup && groups.some((g) => g.id === importedGroup) ? importedGroup : group
    setProfileState(n)
    setGroupState(target)
    setPrevSnapshot(null)
    setShortlist(sl)
    setStarted(true)
    persist("profile", n)
    persist("group", target)
    persist(scoped("shortlist", target), sl)
    persist("started", true)
  }, [persist, groups, group])

  const loadTrials = useCallback(
    async (ids: ReadonlyArray<string>): Promise<Trial[]> => {
      if (!index) return []
      const entries = ids.flatMap((id) => {
        const entry = index.trials.find((e) => e.nctId === id && e.group === group) ?? index.trials.find((e) => e.nctId === id)
        return entry ? [entry] : []
      })
      const buckets = await Promise.all([...new Set(entries.map((e) => bucketOf(e.nctId, index.bucketCount)))].map(async (n) => [n, await loadBucket(n)] as const))
      const byBucket = new Map(buckets)
      return entries.flatMap((e) => {
        const detail = byBucket.get(bucketOf(e.nctId, index.bucketCount))?.[e.nctId]
        return detail ? [fullTrial(index, e, detail)] : []
      })
    },
    [index, group]
  )

  const wipe = useCallback(async () => {
    const wiped = await wipeAll()
    if (!wiped.ok) return wiped
    setProfileState(emptyProfile())
    setGroupState(config.group)
    setShortlist([])
    setStarted(false)
    setPrevSnapshot(null)
    snapshotPending.current = false
    return wiped
  }, [])

  const value: App = {
    loaded,
    groups,
    group,
    setGroup,
    profile,
    setProfile,
    started,
    markStarted,
    shortlist,
    toggleShortlist,
    bundle,
    trials,
    byId,
    index,
    loadTrials,
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


export function useFullTrials(ids: ReadonlyArray<string>): { trials: Trial[]; ready: boolean; error: string | null } {
  const { loadTrials } = useApp()
  const key = ids.join(",")
  const [state, setState] = useState<{ key: string; trials: Trial[]; error: string | null } | null>(null)
  useEffect(() => {
    let cancelled = false
    loadTrials(key ? key.split(",") : []).then(
      (trials) => !cancelled && setState({ key, trials, error: null }),
      (e: Error) => !cancelled && setState({ key, trials: [], error: e.message })
    )
    return () => {
      cancelled = true
    }
  }, [key, loadTrials])
  return { trials: state?.key === key ? state.trials : [], ready: state?.key === key, error: state?.key === key ? state.error : null }
}
