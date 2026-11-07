import { describe, expect, it } from "vitest"
import type { Site, Trial } from "@trial-finder/domain"
import { fillLocations } from "../src/locations.js"
import { parsePostcodes, postcodeKey } from "../src/geo.js"

const trial = (nctId: string, sites: Site[]): Trial => ({
  nctId,
  otherIds: {},
  title: "t",
  status: "RECRUITING",
  phases: [],
  conditions: [],
  interventions: [],
  armLabels: [],
  design: {},
  lastUpdated: "",
  sites,
  criteria: [],
  eligibilityText: ""
})

const site = (facility: string, city: string, lat?: number, lon?: number): Site => ({
  facility,
  city,
  country: "Germany",
  ...(lat !== undefined ? { lat, lon } : {})
})

describe("fillLocations", () => {
  it("copies the coordinates of the same hospital from another trial", () => {
    const out = fillLocations([trial("A", [site("Charité", "Berlin", 52.5, 13.4)]), trial("B", [site("Charité", "Berlin")])])
    expect(out.trials[1]!.sites[0]).toMatchObject({ lat: 52.5, lon: 13.4 })
    expect(out.trials[1]!.sites[0]!.approxLocation).toBeUndefined()
    expect(out.exact).toBe(1)
  })

  it("uses the city centre for an unknown hospital and says so", () => {
    const out = fillLocations([trial("A", [site("Charité", "Berlin", 52.5, 13.4), site("Vivantes", "Berlin", 52.52, 13.3)]), trial("B", [site("Helios", "Berlin")])])
    const filled = out.trials[1]!.sites[0]!
    expect(filled.approxLocation).toBe(true)
    expect(filled.lat).toBeCloseTo(52.51, 2)
    expect(out.approximate).toBe(1)
  })

  it("does not guess when the same city name is far apart", () => {
    const out = fillLocations([trial("A", [site("X", "Neustadt", 48.0, 8.0), site("Y", "Neustadt", 53.9, 10.8)]), trial("B", [site("Z", "Neustadt")])])
    expect(out.trials[1]!.sites[0]!.lat).toBeUndefined()
    expect(out.missing).toBe(1)
  })

  it("leaves sites without a city alone and never treats filled sites as sources", () => {
    const once = fillLocations([trial("A", [site("X", "Berlin", 52.5, 13.4)]), trial("B", [site("Y", "Berlin"), site("Z", "")])])
    expect(once.trials[1]!.sites[1]!.lat).toBeUndefined()
    const twice = fillLocations(once.trials)
    expect(twice.trials).toEqual(once.trials)
  })
})

describe("postcode tables", () => {
  it("reduces codes to their digits", () => {
    expect(postcodeKey("00-002", 5)).toBe("00002")
    expect(postcodeKey("110 00", 5)).toBe("11000")
    expect(postcodeKey("L-1111", 4)).toBe("1111")
    expect(postcodeKey("75009 CEDEX 09", 5)).toBe("75009")
    expect(postcodeKey("123", 5)).toBe("")
  })

  it("averages places that share a code", () => {
    const line = (code: string, lat: number, lon: number) => ["PL", code, "", "", "", "", "", "", "", lat, lon].join("\t")
    const table = parsePostcodes("PL", [line("00-002", 52, 21), line("00-002", 54, 23)].join("\n"))
    expect(table).toEqual({ "00002": [53, 22] })
  })
})
