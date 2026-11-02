import { existsSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { Schema as S } from "effect"
import { Bundle, emptyProfile, matchTrials, type Profile } from "../src/index.js"

const file = fileURLToPath(new URL("../../web/public/data/lung.json", import.meta.url))
const has = existsSync(file)

describe.skipIf(!has)("published bundle (real registry data)", () => {
  const bundle = has ? S.decodeUnknownSync(Bundle)(JSON.parse(readFileSync(file, "utf8"))) : null!

  it("validates against the shared schema", () => {
    expect(bundle.trials.length).toBeGreaterThan(0)
  })

  it("an empty profile never hides a trial: unknown answers do not exclude (P2)", () => {
    const ms = matchTrials(bundle.trials, emptyProfile(), null)
    expect(ms.filter((m) => m.hidden)).toHaveLength(0)
  })

  it("every rule keeps a link to its original text (D6)", () => {
    for (const t of bundle.trials) for (const c of t.criteria) expect(c.text.length).toBeGreaterThan(0)
  })

  it("an SCLC patient does not see NSCLC-only trials as a fit, and vice versa", () => {
    const sclc: Profile = { ...emptyProfile(), cancerType: "sclc" }
    const nsclc: Profile = { ...emptyProfile(), cancerType: "nsclc" }
    const onlyNsclc = bundle.trials.filter((t) => t.criteria.some((c) => c.source === "registry-field" && c.rule._tag === "cancerType" && (c.rule as any).types[0] === "nsclc"))
    expect(onlyNsclc.length).toBeGreaterThan(0)
    const hiddenForSclc = matchTrials(onlyNsclc, sclc, null).filter((m) => m.hidden).length
    const hiddenForNsclc = matchTrials(onlyNsclc, nsclc, null).filter((m) => m.hidden).length
    expect(hiddenForSclc).toBe(onlyNsclc.length)
    expect(hiddenForNsclc).toBe(0)
  })

  it("matches all trials fast (D5: under 2 s, here on a desktop)", () => {
    const p: Profile = { ...emptyProfile(), cancerType: "nsclc", stage: "IV", age: 62, ecog: 1, priorLines: 1 }
    const t0 = performance.now()
    matchTrials(bundle.trials, p, { lat: 52.5, lon: 13.4 })
    expect(performance.now() - t0).toBeLessThan(2000)
  })
})
