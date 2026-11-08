import { describe, expect, it } from "vitest"
import type { Trial } from "@trial-finder/domain"
import { sortRows, tierDivider, treatmentKinds, type Row } from "../src/pages/resultRows"
import type { Summary } from "../src/worker"

const row = (nctId: string, s: Partial<Summary>, t: Partial<Trial> = {}): Row => ({
  s: { nctId, met: 0, notMet: 0, unknown: 0, manual: 0, hidden: false, recruiting: 2, recruitingSites: 1, distanceKm: null, siteIdx: -1, ...s },
  t: { nctId, phases: [], lastUpdated: "2026-01-01", interventions: [], ...t } as Trial
})

const ids = (rows: Row[]) => rows.map((r) => r.t.nctId)

describe("sortRows", () => {
  const rows = [
    row("A", { distanceKm: 50, recruitingSites: 2 }, { phases: ["PHASE1"], lastUpdated: "2026-01-01" }),
    row("B", { distanceKm: 5, recruitingSites: 9 }, { phases: ["PHASE3"], lastUpdated: "2026-03-01" }),
    row("C", { distanceKm: null, recruitingSites: 4 }, { phases: [], lastUpdated: "2026-02-01" }),
    row("D", { distanceKm: 20, recruitingSites: 4, hidden: true }, { phases: ["PHASE4"], lastUpdated: "2026-04-01" })
  ]

  it("keeps the recommended order untouched", () => {
    expect(ids(sortRows(rows, "recommended"))).toEqual(["A", "B", "C", "D"])
  })

  it("puts the nearest first and unknown distances last", () => {
    expect(ids(sortRows(rows, "distance"))).toEqual(["B", "A", "C", "D"])
  })

  it("puts the latest phase first and no phase last", () => {
    expect(ids(sortRows(rows, "phase"))).toEqual(["B", "A", "C", "D"])
  })

  it("puts the newest update first", () => {
    expect(ids(sortRows(rows, "updated"))).toEqual(["B", "C", "A", "D"])
  })

  it("puts the most recruiting sites first and keeps ties in recommended order", () => {
    expect(ids(sortRows(rows, "sites"))).toEqual(["B", "C", "A", "D"])
  })

  it("always lists trials that do not fit last", () => {
    for (const key of ["distance", "phase", "updated", "sites"] as const) expect(ids(sortRows(rows, key)).at(-1)).toBe("D")
  })
})

describe("tierDivider", () => {
  it("only marks the first row of a weaker recruiting tier", () => {
    const open = row("A", { recruiting: 2 })
    const unclear = row("B", { recruiting: 1 })
    const closed = row("C", { recruiting: 0 })
    expect(tierDivider(open)).toBeNull()
    expect(tierDivider(unclear, open)).toBe(1)
    expect(tierDivider(unclear, unclear)).toBeNull()
    expect(tierDivider(closed, unclear)).toBe(0)
    expect(tierDivider(row("D", { recruiting: 0, hidden: true }), closed)).toBeNull()
  })
})

describe("treatmentKinds", () => {
  it("groups intervention types", () => {
    const kinds = treatmentKinds({ interventions: [{ type: "DRUG", name: "" }, { type: "BIOLOGICAL", name: "" }, { type: "RADIATION", name: "" }, { type: "DEVICE", name: "" }, { type: "BEHAVIORAL", name: "" }] } as Trial)
    expect([...kinds].sort()).toEqual(["medicine", "other", "procedure", "radiation"])
  })
})
