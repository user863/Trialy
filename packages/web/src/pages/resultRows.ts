import { phaseRank, type Trial } from "@trial-finder/domain"
import type { Summary } from "../worker"

export type Row = { s: Summary; t: Trial }

export const PHASES = ["EARLY_PHASE1", "PHASE1", "PHASE2", "PHASE3", "PHASE4"]
export const KINDS = ["medicine", "radiation", "procedure", "other"] as const

const MEDICINE_TYPES = new Set(["DRUG", "BIOLOGICAL", "GENETIC", "COMBINATION_PRODUCT"])
const PROCEDURE_TYPES = new Set(["PROCEDURE", "DEVICE"])

export const treatmentKinds = (t: Trial) => {
  const kinds = new Set<string>()
  for (const { type } of t.interventions) {
    if (MEDICINE_TYPES.has(type)) kinds.add("medicine")
    else if (type === "RADIATION") kinds.add("radiation")
    else if (PROCEDURE_TYPES.has(type)) kinds.add("procedure")
    else kinds.add("other")
  }
  return kinds
}

export const SORTS = ["recommended", "distance", "phase", "updated", "sites"] as const
export type SortKey = (typeof SORTS)[number]

export const sortRows = (rows: Row[], key: SortKey): Row[] => {
  if (key === "recommended") return rows
  const by: Record<Exclude<SortKey, "recommended">, (a: Row, b: Row) => number> = {
    distance: (a, b) => {
      const x = a.s.distanceKm ?? Infinity
      const y = b.s.distanceKm ?? Infinity
      return x === y ? 0 : x - y
    },
    phase: (a, b) => phaseRank(b.t.phases) - phaseRank(a.t.phases),
    updated: (a, b) => b.t.lastUpdated.localeCompare(a.t.lastUpdated),
    sites: (a, b) => b.s.recruitingSites - a.s.recruitingSites
  }
  return rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => Number(a.row.s.hidden) - Number(b.row.s.hidden) || by[key](a.row, b.row) || a.i - b.i)
    .map((x) => x.row)
}

export const tierDivider = (row: Row, previous?: Row): 0 | 1 | null => {
  if (row.s.hidden || row.s.recruiting === 2) return null
  if (previous && !previous.s.hidden && previous.s.recruiting === row.s.recruiting) return null
  return row.s.recruiting
}
