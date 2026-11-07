import type { Site, Trial } from "@trial-finder/domain"
import { describe, expect, it } from "vitest"
import { recruitingStats } from "../src/stats"

const site = (country: string, status: string): Site => ({ facility: "x", city: "x", country, status })
const trial = (status: string, sites: ReadonlyArray<Site>) => ({ nctId: "N", status, sites }) as unknown as Trial

describe("recruitingStats", () => {
  it("leaves out trials that are not yet recruiting", () => {
    const out = recruitingStats([
      trial("RECRUITING", [site("Germany", "RECRUITING")]),
      trial("NOT_YET_RECRUITING", [site("Austria", "NOT_YET_RECRUITING")])
    ])
    expect(out).toEqual({ trials: 1, countries: 1 })
  })

  it("counts countries with a recruiting site only", () => {
    const out = recruitingStats([trial("RECRUITING", [site("Germany", "RECRUITING"), site("France", "COMPLETED")])])
    expect(out.countries).toBe(1)
  })
})
