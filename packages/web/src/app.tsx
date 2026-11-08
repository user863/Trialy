import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { emptyProfile, type Bundle, type LatLon, type Profile, type Trial, type TrialIndex } from "@trial-finder/domain"
import { config } from "./config"
import { bundleOf, loadFullTrials } from "./data"
import { useI18n } from "./i18n"
import { valueOr, type Result } from "./result"
import { kvGet, kvSet, wipeAll, type StoreError } from "./store"
import { useMatching, type Impact } from "./useMatching"
import { usePostcode, type PostcodeStatus } from "./usePostcode"
import { useTrialIndex } from "./useTrialIndex"
import type { Summary } from "./worker"

interface Snapshot {
  version: string
  at: string
  fits: Record<string, { met: number; unknown: number; hidden: boolean }>
}

export interface ManifestGroup {
  id: string
  label: string
  trials: number
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
  postcodeStatus: PostcodeStatus
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
  const [prevSnapshot, setPrevSnapshot] = useState<Snapshot | null>(null)
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

  const { index, indexText, error } = useTrialIndex(loaded)
  const loadError = error === null ? null : t("error.dataLoad", { reason: error })

  const groups = useMemo<ReadonlyArray<ManifestGroup>>(() => (index?.groups ?? []).map((g) => ({ id: g.id, label: g.label, trials: g.trials })), [index])

  useEffect(() => {
    if (groups.length && !groups.some((g) => g.id === group)) setGroupState(config.group)
  }, [groups, group])

  const bundle = useMemo(() => bundleOf(index, group), [index, group])
  const trials = useMemo<ReadonlyArray<Trial>>(() => bundle?.trials ?? [], [bundle])
  const byId = useMemo(() => new Map(trials.map((t) => [t.nctId, t])), [trials])

  const { home, status: postcodeStatus } = usePostcode(profile.country, profile.postcode)
  const { summaries, impact } = useMatching({
    trials,
    indexText,
    group,
    profile,
    home,
    enabled: loaded,
    onRequest: () => (snapshotPending.current = true)
  })

  useEffect(() => {
    if (!summaries || !bundle || bundle.group !== group || !started || !snapshotPending.current) return
    snapshotPending.current = false
    const snapshot: Snapshot = {
      version: bundle.version,
      at: now().toISOString(),
      fits: Object.fromEntries(summaries.map((s) => [s.nctId, { met: s.met, unknown: s.unknown, hidden: s.hidden }]))
    }
    persist(scoped("snapshot", group), snapshot)
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

  const setProfile = useCallback(
    (update: (p: Profile) => Profile) => {
      setProfileState((p) => {
        const next = update(p)
        persist("profile", next)
        return next
      })
    },
    [persist]
  )

  const markStarted = useCallback(() => {
    setStarted(true)
    persist("started", true)
  }, [persist])

  const toggleShortlist = useCallback(
    (id: string) => {
      setShortlist((current) => {
        const next = current.includes(id) ? current.filter((x) => x !== id) : current.length >= config.maxShortlist ? current : [...current, id]
        persist(scoped("shortlist", group), next)
        return next
      })
    },
    [persist, group]
  )

  const replaceAll = useCallback(
    (imported: Profile, importedShortlist: string[], importedGroup?: string) => {
      const next = normalise(imported)
      const target = importedGroup && groups.some((g) => g.id === importedGroup) ? importedGroup : group
      setProfileState(next)
      setGroupState(target)
      setPrevSnapshot(null)
      setShortlist(importedShortlist)
      setStarted(true)
      persist("profile", next)
      persist("group", target)
      persist(scoped("shortlist", target), importedShortlist)
      persist("started", true)
    },
    [persist, groups, group]
  )

  const loadTrials = useCallback(
    async (ids: ReadonlyArray<string>) => (index ? loadFullTrials(index, group, ids) : []),
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
  const current = state?.key === key ? state : null
  return { trials: current?.trials ?? [], ready: current !== null, error: current?.error ?? null }
}
