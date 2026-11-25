import type { Trial } from "@trial-finder/domain"

export const recruitingStats = (trials: ReadonlyArray<Trial>) => ({
  trials: trials.filter((t) => t.status === "RECRUITING").length
})
