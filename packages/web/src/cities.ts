import { recruitingSites, type Trial } from "@trial-finder/domain"

export type City = {
  readonly city: string
  readonly country: string
  readonly lat: number
  readonly lon: number
  readonly trials: number
}

type Row = Omit<City, "trials"> & { readonly nctId: string }

const rows = (t: Trial): ReadonlyArray<Row> =>
  recruitingSites(t).flatMap(({ city, country, lat, lon }) =>
    lat === undefined || lon === undefined ? [] : [{ city, country, lat, lon, nctId: t.nctId }]
  )

export const recruitingCities = (trials: ReadonlyArray<Trial>): ReadonlyArray<City> => {
  const groups = new Map<string, ReadonlyArray<Row>>()
  for (const row of trials.flatMap(rows)) {
    const key = `${row.country}|${row.city}`
    groups.set(key, [...(groups.get(key) ?? []), row])
  }
  return [...groups.values()]
    .map((g) => {
      const { city, country, lat, lon } = g[0]!
      return { city, country, lat, lon, trials: new Set(g.map((r) => r.nctId)).size }
    })
    .sort((a, b) => b.trials - a.trials || a.city.localeCompare(b.city))
}
