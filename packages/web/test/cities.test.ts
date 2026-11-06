import type { Site, Trial } from "@trial-finder/domain"
import { describe, expect, it } from "vitest"
import { recruitingCities } from "../src/cities"

const site = (city: string, status: string, geo = true): Site => ({
  facility: `${city} hospital`,
  city,
  country: "Germany",
  status,
  ...(geo ? { lat: 52, lon: 13 } : {})
})

const trial = (nctId: string, sites: ReadonlyArray<Site>) => ({ nctId, sites }) as unknown as Trial

describe("recruitingCities", () => {
  it("counts a trial once per city and sorts by count", () => {
    const out = recruitingCities([
      trial("A", [site("Berlin", "RECRUITING"), site("Berlin", "RECRUITING"), site("Essen", "RECRUITING")]),
      trial("B", [site("Berlin", "RECRUITING")])
    ])
    expect(out.map((c) => [c.city, c.trials])).toEqual([["Berlin", 2], ["Essen", 1]])
  })

  it("skips sites that are not recruiting or have no coordinates", () => {
    const out = recruitingCities([trial("A", [site("Berlin", "COMPLETED"), site("Essen", "RECRUITING", false)])])
    expect(out).toEqual([])
  })
})
