import { existsSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { Schema as S } from "effect"
import {
  Bundle,
  DetailBucket,
  TrialIndex,
  bucketCountFor,
  bucketOf,
  emptyProfile,
  fullTrial,
  groupTrials,
  matchTrials,
  tier,
  type Trial
} from "../src/index.js"

const dir = fileURLToPath(new URL("../../web/public/data/", import.meta.url))
const files = ["lung", "ms"].filter((g) => existsSync(`${dir}${g}.json`))
const bundles = files.map((g) => S.decodeUnknownSync(Bundle)(JSON.parse(readFileSync(`${dir}${g}.json`, "utf8"))))

const stable = (v: unknown): unknown => JSON.parse(JSON.stringify(v))

const minimal: Trial = {
  nctId: "NCT00000001",
  otherIds: { drks: ["DRKS00000001"] },
  title: "A trial",
  officialTitle: "An official title",
  briefSummary: "Summary",
  status: "RECRUITING",
  phases: ["PHASE2"],
  conditions: ["Condition"],
  interventions: [{ type: "DRUG", name: "Drug X" }],
  armLabels: ["Arm 1"],
  design: { allocation: "RANDOMIZED" },
  lastUpdated: "2026-01-01",
  centralContact: { name: "Contact" },
  sites: [
    { facility: "A", city: "Berlin", country: "Germany", lat: 52.5, lon: 13.4, status: "RECRUITING", zip: "10115", contactEmail: "a@example.org" },
    { facility: "B", city: "Bonn", country: "Germany" }
  ],
  criteria: [
    { id: "NCT00000001-age", kind: "inclusion", text: "Registry age limits: 18 Years", rule: { _tag: "age", min: 18 }, source: "registry-field", confidence: "high" },
    { id: "NCT00000001-0", kind: "inclusion", text: "Adults", rule: { _tag: "age", min: 18 }, source: "registry-text", confidence: "low" },
    { id: "NCT00000001-1", kind: "exclusion", text: "Something odd", rule: { _tag: "other" }, source: "registry-text", confidence: "none" }
  ],
  eligibilityText: "Inclusion: Adults\nExclusion: Something odd"
}

const bundleOf = (trials: Trial[], group = "g"): Bundle => ({
  group,
  groupLabel: "G",
  version: "1",
  generatedAt: "2026-01-01T00:00:00.000Z",
  source: "test",
  trials,
  changes: { since: null, added: [], removed: [] }
})

describe("tiered artefacts", () => {
  it("joining the index entry and its detail gives back the trial exactly", () => {
    const { index, buckets } = tier([bundleOf([minimal])])
    const detail = buckets.flatMap((b) => Object.entries(b)).find(([id]) => id === minimal.nctId)![1]
    expect(stable(fullTrial(index, index.trials[0]!, detail))).toEqual(stable(minimal))
  })

  it("a trial without detail keeps its structure and every criterion, but no text", () => {
    const { index } = tier([bundleOf([minimal])])
    const [slim] = groupTrials(index, "g")
    expect(slim!.criteria.map((c) => c.id)).toEqual(minimal.criteria.map((c) => c.id))
    expect(slim!.criteria.map((c) => c.rule)).toEqual(minimal.criteria.map((c) => c.rule))
    expect(slim!.eligibilityText).toBe("")
    expect(slim!.sites.map((s) => [s.city, s.lat, s.lon, s.status])).toEqual(minimal.sites.map((s) => [s.city, s.lat, s.lon, s.status]))
  })

  it("rejects trials whose text criteria are out of order", () => {
    const bad = { ...minimal, criteria: [minimal.criteria[0]!, { ...minimal.criteria[2]!, id: "NCT00000001-5" }] }
    expect(() => tier([bundleOf([bad])])).toThrow(/text position/)
  })

  it("the index and every bucket validate against their schemas", () => {
    const { index, buckets } = tier([bundleOf([minimal])])
    S.decodeUnknownSync(TrialIndex)(stable(index))
    buckets.forEach((b) => S.decodeUnknownSync(DetailBucket)(stable(b)))
  })

  it("assigns the same bucket everywhere and spreads trials out", () => {
    expect(bucketOf("NCT01234567", 16)).toBe(bucketOf("NCT01234567", 16))
    const counts = new Array(8).fill(0)
    for (let i = 0; i < 4000; i++) counts[bucketOf(`NCT${String(i).padStart(8, "0")}`, 8)]++
    expect(Math.min(...counts)).toBeGreaterThan(400)
    expect(bucketCountFor(50)).toBe(1)
    expect(bucketCountFor(57378)).toBe(256)
  })
})

describe.skipIf(!bundles.length)("tiered artefacts from the published bundles", () => {
  const { index, buckets } = tier(bundles)
  const detailOf = (id: string) => buckets[bucketOf(id, index.bucketCount)]![id]!

  it("every trial survives the round trip", () => {
    for (const b of bundles) {
      const entries = index.trials.filter((e) => e.group === b.group)
      expect(entries).toHaveLength(b.trials.length)
      b.trials.forEach((t, i) => expect(stable(fullTrial(index, entries[i]!, detailOf(t.nctId)))).toEqual(stable(t)))
    }
  })

  it("matching on the index alone gives the same counts and distances as matching on the full trials", () => {
    const home = { lat: 52.52, lon: 13.4 }
    const profile = { ...emptyProfile(), age: 61, sex: "female" as const }
    for (const b of bundles) {
      const full = matchTrials(b.trials, profile, home)
      const slim = matchTrials(groupTrials(index, b.group), profile, home)
      expect(slim.map((m) => [m.trial.nctId, m.met, m.notMet, m.unknown, m.manual, m.hidden, m.recruiting, m.distanceKm])).toEqual(
        full.map((m) => [m.trial.nctId, m.met, m.notMet, m.unknown, m.manual, m.hidden, m.recruiting, m.distanceKm])
      )
    }
  })

  it("carries no free text in the index", () => {
    const json = JSON.stringify(index)
    for (const b of bundles) for (const t of b.trials.slice(0, 20)) expect(json).not.toContain(t.eligibilityText.slice(0, 80))
  })
})
