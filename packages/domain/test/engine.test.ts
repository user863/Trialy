import { describe, expect, it } from "vitest"
import { Schema as S } from "effect"
import { emptyProfile, evalCriterion, matchTrial, matchTrials, Rule, type Criterion, type Profile, type Trial } from "../src/index.js"

const crit = (kind: Criterion["kind"], rule: Rule): Criterion => ({
  id: "c",
  kind,
  text: "t",
  rule,
  source: "registry-text",
  confidence: "high"
})
const profile = (p: Partial<Profile> = {}): Profile => ({ ...emptyProfile(), ...p })
const trial = (id: string, criteria: Criterion[], sites: Trial["sites"] = []): Trial => ({
  nctId: id,
  otherIds: {},
  title: id,
  status: "RECRUITING",
  phases: [],
  conditions: [],
  interventions: [],
  armLabels: [],
  design: {},
  lastUpdated: "2026-01-01",
  sites,
  criteria,
  eligibilityText: ""
})

describe("three-valued logic", () => {
  it("unknown answers never exclude", () => {
    const r = evalCriterion(crit("inclusion", { _tag: "stage", stages: ["IV"] }), profile())
    expect(r.status).toBe("unknown")
    const e = evalCriterion(crit("exclusion", { _tag: "biomarker", gene: "EGFR", state: "positive" }), profile())
    expect(e.status).toBe("unknown")
  })

  it("inclusion: yes = met, no = notMet", () => {
    const rule: Rule = { _tag: "stage", stages: ["IV"] }
    expect(evalCriterion(crit("inclusion", rule), profile({ stage: "IV" })).status).toBe("met")
    expect(evalCriterion(crit("inclusion", rule), profile({ stage: "II" })).status).toBe("notMet")
  })

  it("exclusion: yes = notMet, no = met", () => {
    const rule: Rule = { _tag: "flag", flag: "brainMetsActive" }
    expect(evalCriterion(crit("exclusion", rule), profile({ brainMets: "active" })).status).toBe("notMet")
    expect(evalCriterion(crit("exclusion", rule), profile({ brainMets: "none" })).status).toBe("met")
    expect(evalCriterion(crit("exclusion", rule), profile({ brainMets: "treated" })).status).toBe("met")
  })

  it("narrow: base 'yes' becomes unknown, base 'no' stays no", () => {
    const rule: Rule = { _tag: "narrow", rule: { _tag: "priorTherapy", category: "immunotherapy" } }
    const ex = crit("exclusion", rule)
    expect(evalCriterion(ex, profile({ priorTherapies: { ...emptyProfile().priorTherapies, immunotherapy: "yes" } })).status).toBe("unknown")
    expect(evalCriterion(ex, profile({ priorTherapies: { ...emptyProfile().priorTherapies, immunotherapy: "no" } })).status).toBe("met")
  })

  it("allOf with an unmodelled part can never be fully met", () => {
    const rule: Rule = { _tag: "allOf", rules: [{ _tag: "age", min: 18 }, { _tag: "other" }] }
    expect(evalCriterion(crit("inclusion", rule), profile({ age: 60 })).status).toBe("unknown")
    expect(evalCriterion(crit("inclusion", rule), profile({ age: 12 })).status).toBe("notMet")
  })

  it("systemic therapy derives from chemo / immuno / targeted and from lines", () => {
    const rule: Rule = { _tag: "priorTherapy", category: "systemic" }
    expect(evalCriterion(crit("exclusion", rule), profile({ priorLines: 2 })).status).toBe("notMet")
    const none = { chemotherapy: "no", immunotherapy: "no", targeted: "no", radiotherapy: "unknown", surgery: "unknown" } as const
    expect(evalCriterion(crit("exclusion", rule), profile({ priorTherapies: none })).status).toBe("met")
  })

  it("PD-L1 categories against thresholds", () => {
    const ge50: Rule = { _tag: "pdl1", min: 50 }
    expect(evalCriterion(crit("inclusion", ge50), profile({ pdl1: "ge50" })).status).toBe("met")
    expect(evalCriterion(crit("inclusion", ge50), profile({ pdl1: "1to49" })).status).toBe("notMet")
    const gt50: Rule = { _tag: "pdl1", min: 50.001 }
    expect(evalCriterion(crit("inclusion", gt50), profile({ pdl1: "ge50" })).status).toBe("unknown")
    const ge1: Rule = { _tag: "pdl1", min: 1 }
    expect(evalCriterion(crit("inclusion", ge1), profile({ pdl1: "1to49" })).status).toBe("met")
    expect(evalCriterion(crit("inclusion", ge1), profile({ pdl1: "lt1" })).status).toBe("notMet")
  })

  it("SCLC extent falls back to stage", () => {
    const ext: Rule = { _tag: "stage", stages: [], extent: "extensive" }
    expect(evalCriterion(crit("inclusion", ext), profile({ cancerType: "sclc", stage: "IV" })).status).toBe("met")
    expect(evalCriterion(crit("inclusion", ext), profile({ cancerType: "sclc", stage: "III" })).status).toBe("unknown")
    expect(evalCriterion(crit("inclusion", ext), profile({ cancerType: "nsclc" })).status).toBe("unknown")
  })

  it("histology rules: SCLC patients can't be adenocarcinoma", () => {
    const adeno: Rule = { _tag: "cancerType", types: ["adenocarcinoma"] }
    expect(evalCriterion(crit("inclusion", adeno), profile({ cancerType: "sclc" })).status).toBe("notMet")
    expect(evalCriterion(crit("inclusion", adeno), profile({ cancerType: "nsclc" })).status).toBe("unknown")
    expect(evalCriterion(crit("inclusion", adeno), profile({ cancerType: "nsclc", histology: "adenocarcinoma" })).status).toBe("met")
  })
})

describe("trial matching and ranking", () => {
  const stage4: Criterion = crit("inclusion", { _tag: "stage", stages: ["IV"] })
  const ecog: Criterion = crit("inclusion", { _tag: "performanceStatus", min: 0, max: 1 })
  const near = { facility: "Near", city: "A", country: "Germany", lat: 52.5, lon: 13.4, status: "RECRUITING" }
  const far = { facility: "Far", city: "B", country: "Germany", lat: 48.1, lon: 11.6, status: "RECRUITING" }

  it("hides trials with a failed criterion; ranks by met, unknown, distance", () => {
    const p = profile({ stage: "IV", ecog: 1 })
    const home = { lat: 52.52, lon: 13.4 }
    const ms = matchTrials(
      [
        trial("FAIL", [crit("inclusion", { _tag: "stage", stages: ["II"] })], [near]),
        trial("UNKNOWN", [stage4, crit("inclusion", { _tag: "other" })], [near]),
        trial("BOTHFAR", [stage4, ecog], [far]),
        trial("BOTHNEAR", [stage4, ecog], [near])
      ],
      p,
      home
    )
    expect(ms.map((m) => m.trial.nctId)).toEqual(["BOTHNEAR", "BOTHFAR", "UNKNOWN", "FAIL"])
    expect(ms[3]!.hidden).toBe(true)
    expect(ms[0]!.distanceKm).toBeLessThan(5)
  })

  it("ignores closed sites for distance", () => {
    const closed = { ...near, status: "COMPLETED" }
    const m = matchTrial(trial("X", [], [closed, far]), profile(), { lat: 52.52, lon: 13.4 })
    expect(m.nearestSite?.facility).toBe("Far")
  })

  it("keeps trials with no recruiting site but ranks them below recruiting ones, even when they fit better", () => {
    const home = { lat: 52.52, lon: 13.4 }
    const p = profile({ stage: "IV", ecog: 1 })
    const closedSite = { ...near, status: "ACTIVE_NOT_RECRUITING" }
    const ms = matchTrials(
      [
        trial("CLOSED", [stage4, ecog], [closedSite]),
        trial("OPEN", [stage4, crit("inclusion", { _tag: "other" })], [{ ...far, status: "RECRUITING" }]),
        trial("UNSTATED", [stage4], [{ facility: "S", city: "C", country: "Germany", lat: 50, lon: 8 }])
      ],
      p,
      home
    )
    expect(ms.map((m) => [m.trial.nctId, m.recruiting, m.hidden])).toEqual([
      ["OPEN", 2, false],
      ["UNSTATED", 1, false],
      ["CLOSED", 0, false]
    ])
  })
})

describe("schema", () => {
  it("round-trips nested rules", () => {
    const rule: Rule = { _tag: "allOf", rules: [{ _tag: "narrow", rule: { _tag: "not", rule: { _tag: "age", min: 3 } } }] }
    expect(S.decodeUnknownSync(Rule)(rule)).toEqual(rule)
  })
  it("rejects unknown rule types", () => {
    expect(() => S.decodeUnknownSync(Rule)({ _tag: "magic" })).toThrow()
  })
})
