import "fake-indexeddb/auto"
import { afterEach, describe, expect, it, vi } from "vitest"
import { kvGet, kvSet, wipeAll } from "../src/store"

afterEach(() => vi.unstubAllGlobals())

describe("saved state", () => {
  it("reads nothing before anything was saved", async () => {
    expect(await kvGet("profile")).toEqual({ ok: true, value: undefined })
  })

  it("reads back what was saved", async () => {
    expect(await kvSet("shortlist", ["NCT00000001"])).toEqual({ ok: true, value: undefined })
    expect(await kvGet("shortlist")).toEqual({ ok: true, value: ["NCT00000001"] })
  })

  it("deletes everything while a connection is open", async () => {
    vi.stubGlobal("localStorage", { clear: () => undefined })
    vi.stubGlobal("sessionStorage", { clear: () => undefined })
    await kvSet("profile", { age: 62 })
    expect(await wipeAll()).toEqual({ ok: true, value: undefined })
    expect(await kvGet("profile")).toEqual({ ok: true, value: undefined })
  })

  it("does not claim success when the browser refuses to clear site data", async () => {
    vi.stubGlobal("localStorage", {
      clear: () => {
        throw new Error("denied")
      }
    })
    vi.stubGlobal("sessionStorage", { clear: () => undefined })
    expect(await wipeAll()).toEqual({ ok: false, error: "unavailable" })
  })
})
