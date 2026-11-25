import fc from "fast-check"
import { describe, expect, it } from "vitest"
import { and, not, or } from "../src/logic.js"
import { tri } from "./arbitraries.js"

const list = fc.array(tri, { maxLength: 8 })

describe("three-valued logic", () => {
  it("not undoes itself", () => {
    fc.assert(fc.property(tri, (t) => not(not(t)) === t))
  })

  it("follows De Morgan", () => {
    fc.assert(
      fc.property(list, (ts) => not(and(ts)) === or(ts.map(not)) && not(or(ts)) === and(ts.map(not)))
    )
  })

  it("does not care about order", () => {
    fc.assert(
      fc.property(list, fc.nat(8), (ts, turn) => {
        const rotated = [...ts.slice(turn % (ts.length || 1)), ...ts.slice(0, turn % (ts.length || 1))]
        return and(ts) === and(rotated) && or(ts) === or(rotated)
      })
    )
  })

  it("does not care about grouping", () => {
    fc.assert(
      fc.property(list, list, (a, b) => and([and(a), and(b)]) === and([...a, ...b]) && or([or(a), or(b)]) === or([...a, ...b]))
    )
  })

  it("has the right identities", () => {
    expect(and([])).toBe("yes")
    expect(or([])).toBe("no")
  })

  it("lets a decisive answer win over unknowns", () => {
    fc.assert(fc.property(list, (ts) => and([...ts, "no"]) === "no" && or([...ts, "yes"]) === "yes"))
  })

  it("only ever gains certainty as answers come in", () => {
    const pairs = fc.array(fc.tuple(tri, tri), { maxLength: 8 })
    fc.assert(
      fc.property(pairs, (ps) => {
        const before = ps.map(([a]) => a)
        const after = ps.map(([a, b]) => (a === "unknown" ? b : a))
        return [and, or].every((op) => op(before) === "unknown" || op(before) === op(after))
      })
    )
  })
})
