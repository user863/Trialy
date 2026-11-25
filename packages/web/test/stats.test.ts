import type { Trial } from "@trial-finder/domain"
import { describe, expect, it } from "vitest"
import { recruitingStats } from "../src/stats"

const trial = (status: string) => ({ nctId: "N", status }) as unknown as Trial

describe("recruitingStats", () => {
  it("leaves out trials that are not yet recruiting", () => {
    expect(recruitingStats([trial("RECRUITING"), trial("NOT_YET_RECRUITING")])).toEqual({ trials: 1 })
  })
})
