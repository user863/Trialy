import { haversineKm, type Site, type Trial } from "@trial-finder/domain"

const MAX_CITY_SPREAD_KM = 50

const norm = (s: string) => s.trim().toLowerCase()
const facilityKey = (s: Site) => `${norm(s.facility)}|${norm(s.city)}|${norm(s.country)}`
const cityKey = (s: Site) => `${norm(s.city)}|${norm(s.country)}`
const hasCoords = (s: Site) => s.lat !== undefined && s.lon !== undefined

const median = (xs: number[]) => {
  const sorted = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

export const fillLocations = (trials: ReadonlyArray<Trial>): { trials: Trial[]; exact: number; approximate: number; missing: number } => {
  const facilities = new Map<string, { lat: number; lon: number }>()
  const cities = new Map<string, Array<{ lat: number; lon: number }>>()
  for (const t of trials)
    for (const s of t.sites) {
      if (!hasCoords(s) || s.approxLocation) continue
      const point = { lat: s.lat!, lon: s.lon! }
      if (!facilities.has(facilityKey(s))) facilities.set(facilityKey(s), point)
      if (s.city.trim()) cities.set(cityKey(s), [...(cities.get(cityKey(s)) ?? []), point])
    }

  const centroids = new Map<string, { lat: number; lon: number }>()
  for (const [key, points] of cities) {
    const centre = { lat: median(points.map((p) => p.lat)), lon: median(points.map((p) => p.lon)) }
    if (points.every((p) => haversineKm(centre, p) <= MAX_CITY_SPREAD_KM)) centroids.set(key, centre)
  }

  let exact = 0
  let approximate = 0
  let missing = 0
  const filled = trials.map((t) => {
    if (t.sites.every(hasCoords)) return t
    return {
      ...t,
      sites: t.sites.map((s): Site => {
        if (hasCoords(s)) return s
        const same = facilities.get(facilityKey(s))
        if (same) {
          exact++
          return { ...s, ...same }
        }
        const centre = s.city.trim() ? centroids.get(cityKey(s)) : undefined
        if (centre) {
          approximate++
          return { ...s, ...centre, approxLocation: true }
        }
        missing++
        return s
      })
    }
  })
  return { trials: filled, exact, approximate, missing }
}
