import type { Trial } from "./schema.js"

export const phaseLabel = (p: string): string =>
  p === "NA"
    ? "n/a"
    : p === "EARLY_PHASE1"
      ? "Early phase 1"
      : p.replace(/^PHASE(\d)\/PHASE(\d)$/, "Phase $1/$2").replace(/^PHASE(\d)$/, "Phase $1")

const COMBINED: ReadonlyArray<readonly [string, string, string]> = [
  ["PHASE1", "PHASE2", "PHASE1/PHASE2"],
  ["PHASE2", "PHASE3", "PHASE2/PHASE3"]
]

const PHASE_RANK: Record<string, number> = {
  EARLY_PHASE1: 0.5,
  PHASE1: 1,
  "PHASE1/PHASE2": 1.5,
  PHASE2: 2,
  "PHASE2/PHASE3": 2.5,
  PHASE3: 3,
  PHASE4: 4
}

export const phaseRank = (phases: ReadonlyArray<string>): number =>
  Math.max(0, ...displayPhases(phases).map((p) => PHASE_RANK[p] ?? 0))

export const displayPhases = (phases: ReadonlyArray<string>): string[] => {
  let out = phases.filter((p) => p !== "NA")
  for (const [a, b, joined] of COMBINED) {
    if (out.includes(a) && out.includes(b)) {
      const at = out.indexOf(a)
      out = out.filter((p) => p !== a && p !== b)
      out.splice(Math.min(at, out.length), 0, joined)
    }
  }
  return out
}

export type Allocation = "randomized" | "nonRandomized" | "unstated"
export type Blinding = "open" | "blinded"

export interface PlainFacts {
  readonly tested: string[]
  readonly against: string[]
  readonly phases: ReadonlyArray<string>
  readonly allocation: Allocation
  readonly blinding: Blinding
  readonly hasPlacebo: boolean
}

export const plainFacts = (t: Trial): PlainFacts => {
  const hay = [...t.interventions.map((i) => i.name), ...t.armLabels].join(" ").toLowerCase()
  const alloc = t.design.allocation
  const mask = t.design.masking
  return {
    tested: t.interventions.map((i) => `${i.name} (${i.type.toLowerCase().replace(/_/g, " ")})`),
    against: t.armLabels.filter((l) => /standard|control|comparator|chemo|docetaxel|placebo|investigator/i.test(l)),
    phases: displayPhases(t.phases),
    allocation: alloc === "RANDOMIZED" ? "randomized" : alloc === "NON_RANDOMIZED" ? "nonRandomized" : "unstated",
    blinding: !mask || mask === "NONE" ? "open" : "blinded",
    hasPlacebo: /placebo|sham/.test(hay)
  }
}

export interface RegistryLink {
  readonly label: string
  readonly id: string
  readonly url: string
}

export const registryLinks = (t: Trial): RegistryLink[] => [
  { label: "ClinicalTrials.gov", id: t.nctId, url: `https://clinicaltrials.gov/study/${t.nctId}` },
  ...(t.otherIds.euCt ?? []).map((id) => ({
    label: "EU Clinical Trials Information System",
    id,
    url: `https://euclinicaltrials.eu/search-for-clinical-trials/?lang=en&EUCT=${encodeURIComponent(id)}`
  })),
  ...(t.otherIds.eudraCt ?? []).map((id) => ({
    label: "EU Clinical Trials Register (EudraCT)",
    id,
    url: `https://www.clinicaltrialsregister.eu/ctr-search/search?query=${encodeURIComponent(id)}`
  })),
  ...(t.otherIds.drks ?? []).map((id) => ({ label: "DRKS", id, url: `https://drks.de/search/en/trial/${encodeURIComponent(id)}` }))
]
