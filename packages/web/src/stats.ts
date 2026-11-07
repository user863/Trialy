import { recruitingSites, type Trial } from "@trial-finder/domain"

export const recruitingStats = (trials: ReadonlyArray<Trial>) => {
  const recruiting = trials.filter((t) => t.status === "RECRUITING")
  const countries = new Set(recruiting.flatMap(recruitingSites).map((s) => s.country))
  return { trials: recruiting.length, countries: countries.size }
}
