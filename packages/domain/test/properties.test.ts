import fc from "fast-check"
import { Schema as S } from "effect"
import { describe, expect, it } from "vitest"
import { emptyProfile, evalRule, matchTrial, Rule } from "../src/index.js"
import * as gen from "./arbitraries.js"

const resultOf = (rule: Rule, profile = emptyProfile()) => evalRule(rule, profile).result

describe("rules", () => {
  it("never settle anything without answers", () => {
    fc.assert(fc.property(gen.rule, (rule) => resultOf(rule) === "unknown"))
  })

  it("read the same after a double negation", () => {
    fc.assert(
      fc.property(gen.rule, gen.truth, (rule, profile) => {
        const twice: Rule = { _tag: "not", rule: { _tag: "not", rule } }
        return resultOf(twice, profile) === resultOf(rule, profile)
      })
    )
  })

  it("narrow turns a yes into unknown and leaves the rest alone", () => {
    fc.assert(
      fc.property(gen.rule, gen.truth, (rule, profile) => {
        const inner = resultOf(rule, profile)
        return resultOf({ _tag: "narrow", rule }, profile) === (inner === "yes" ? "unknown" : inner)
      })
    )
  })

  it("keep a decided result when more questions are answered", () => {
    fc.assert(
      fc.property(gen.rule, gen.truth, gen.forgetting, (rule, full, flags) => {
        const partial = gen.forget(full, flags)
        const before = resultOf(rule, partial)
        return before === "unknown" || resultOf(rule, full) === before
      }),
      { numRuns: 20000 }
    )
  })

  it("survive a round trip through the schema", () => {
    fc.assert(
      fc.property(gen.rule, (rule) => {
        const copy = S.decodeUnknownSync(Rule)(S.encodeSync(Rule)(rule))
        expect(copy).toEqual(rule)
      })
    )
  })
})

describe("trials", () => {
  it("are never hidden by an empty profile", () => {
    fc.assert(
      fc.property(fc.array(gen.criterion, { maxLength: 6 }), (criteria) => {
        const match = matchTrial(gen.trial(criteria), emptyProfile(), null)
        return !match.hidden && match.notMet === 0 && match.unknown === criteria.length
      })
    )
  })

  it("are hidden exactly when a criterion fails", () => {
    fc.assert(
      fc.property(fc.array(gen.criterion, { maxLength: 6 }), gen.truth, (criteria, profile) => {
        const match = matchTrial(gen.trial(criteria), profile, null)
        return match.hidden === match.notMet > 0 && match.met + match.notMet + match.unknown === criteria.length
      })
    )
  })
})
