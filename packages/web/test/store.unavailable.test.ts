import { describe, expect, it } from "vitest"
import { kvGet, kvSet, wipeAll } from "../src/store"

describe("saved state without IndexedDB", () => {
  it("reports every operation as unavailable", async () => {
    expect(await kvGet("profile")).toEqual({ ok: false, error: "unavailable" })
    expect(await kvSet("profile", {})).toEqual({ ok: false, error: "unavailable" })
    expect(await wipeAll()).toEqual({ ok: false, error: "unavailable" })
  })
})
