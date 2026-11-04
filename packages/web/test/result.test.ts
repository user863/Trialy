import { describe, expect, it } from "vitest"
import { attempt, attemptSync, err, ok, valueOr } from "../src/result"

describe("result", () => {
  it("wraps a value and an error", () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 })
    expect(err("no")).toEqual({ ok: false, error: "no" })
  })

  it("falls back only on failure", () => {
    expect(valueOr(ok(1), 0)).toBe(1)
    expect(valueOr(err("no"), 0)).toBe(0)
  })

  it("turns a throw into an error value", async () => {
    expect(attemptSync(() => JSON.parse("{"), () => "bad")).toEqual(err("bad"))
    expect(await attempt(async () => Promise.reject(new Error("x")), () => "bad")).toEqual(err("bad"))
    expect(await attempt(async () => 2, () => "bad")).toEqual(ok(2))
  })
})
