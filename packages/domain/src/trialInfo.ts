import type { Trial } from "./schema.js"

const PHASE_TEXT: Record<string, string> = {
  EARLY_PHASE1: "Early phase 1: a very first look at safety in a small group of people.",
  PHASE1: "Phase 1: mainly tests safety and the right dose in a small group of people.",
  PHASE2: "Phase 2: tests whether the treatment works and keeps being safe, in a larger group.",
  PHASE3: "Phase 3: compares the treatment with the current standard in a large group of people.",
  PHASE4: "Phase 4: studies an already approved treatment in everyday use.",
  NA: "No phase stated (often the case for non-drug studies)."
}

export const phaseLabel = (p: string): string =>
  p.replace("EARLY_PHASE1", "Early phase 1").replace("PHASE", "Phase ").replace("NA", "n/a").replace("/", " / ")

export interface PlainFacts {
  readonly tested: string[]
  readonly against: string[]
  readonly facts: Array<{ label: string; text: string }>
  readonly hasPlacebo: boolean
}

export const plainFacts = (t: Trial): PlainFacts => {
  const hay = [...t.interventions.map((i) => i.name), ...t.armLabels].join(" ").toLowerCase()
  const hasPlacebo = /placebo|sham/.test(hay)
  const tested = t.interventions.map((i) => `${i.name} (${i.type.toLowerCase().replace(/_/g, " ")})`)
  const against = t.armLabels.filter((l) => /standard|control|comparator|chemo|docetaxel|placebo|investigator/i.test(l))
  const facts: PlainFacts["facts"] = []
  for (const p of t.phases) facts.push({ label: "Phase", text: PHASE_TEXT[p] ?? p })
  const alloc = t.design.allocation
  facts.push({
    label: "Randomisation",
    text:
      alloc === "RANDOMIZED"
        ? "You may be assigned to a treatment group by chance (like a coin toss), so you may not get the new treatment."
        : alloc === "NON_RANDOMIZED"
          ? "Groups are not assigned by chance; assignment follows the study plan (for example by your tumour type)."
          : "The registry does not say how people are assigned."
  })
  const mask = t.design.masking
  facts.push({
    label: "Blinding",
    text:
      !mask || mask === "NONE"
        ? "Open label: you and your doctors know which treatment you receive."
        : "Blinded: you (and possibly your doctors) will not be told which treatment you receive until the study allows it."
  })
  facts.push({
    label: "Placebo",
    text: hasPlacebo
      ? "A placebo (dummy treatment) appears in this study's description. Ask whether it replaces or is added to active treatment."
      : "No placebo is named in the registry entry. Check the full protocol to be sure."
  })
  facts.push({ label: "Visits", text: "The registry data does not state the visit schedule. Ask the trial site." })
  return { tested, against, facts, hasPlacebo }
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
