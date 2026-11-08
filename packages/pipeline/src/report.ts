import type { Rule, Trial } from "@trial-finder/domain"

const REVIEW_SAMPLE_ONE_IN = 20

const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7)

const textCriteria = (trials: ReadonlyArray<Trial>) => trials.flatMap((t) => t.criteria.filter((c) => c.source === "registry-text"))

const countRuleTypes = (rules: ReadonlyArray<Rule>): Record<string, number> => {
  const counts: Record<string, number> = {}
  const visit = (rule: Rule) => {
    if (rule._tag === "anyOf" || rule._tag === "allOf") rule.rules.forEach(visit)
    else if (rule._tag === "not" || rule._tag === "narrow") visit(rule.rule)
    else counts[rule._tag] = (counts[rule._tag] ?? 0) + 1
  }
  rules.forEach(visit)
  return counts
}

export const coverageStats = (trials: ReadonlyArray<Trial>) => {
  const criteria = textCriteria(trials)
  const structured = criteria.filter((c) => c.confidence !== "none")
  return {
    trials: trials.length,
    textCriteria: criteria.length,
    structured: structured.length,
    coverage: criteria.length ? Math.round((structured.length / criteria.length) * 1000) / 10 : 0,
    highConfidence: criteria.filter((c) => c.confidence === "high").length,
    lowConfidence: criteria.filter((c) => c.confidence === "low").length,
    ruleTypes: countRuleTypes(criteria.map((c) => c.rule))
  }
}

export const reviewQueue = (trials: ReadonlyArray<Trial>) =>
  trials.flatMap((t) =>
    textCriteria([t])
      .filter((c) => c.confidence === "low" || (c.confidence === "high" && hash(c.id) % REVIEW_SAMPLE_ONE_IN === 0))
      .map((c) => ({ trial: t.nctId, id: c.id, kind: c.kind, confidence: c.confidence, text: c.text, rule: c.rule }))
  )
