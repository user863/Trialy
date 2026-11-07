import { Schema as S } from "effect"
import { Rule, type Criterion, type FlagKey, type MsCourse, type MsTherapyCategory } from "@trial-finder/domain"
import { splitCriteria, structuredCriteria, type StructuredFields } from "./extract.js"

type Kind = "inclusion" | "exclusion"
type Confidence = "high" | "low" | "none"
export interface Extraction {
  readonly rule: Rule
  readonly confidence: Confidence
}

interface Hit {
  readonly key: string
  readonly rule: Rule
  readonly narrow: boolean
  readonly consumed: RegExp
}

const OTHER: Rule = { _tag: "other" }
const NONE: Extraction = { rule: OTHER, confidence: "none" }

const MAX_LENGTH = 400
const DAYS_PER_MONTH = 30.4375
const STEROID_QUESTION_MONTHS = 3
const EDSS_STEP = 0.5

const WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12 }
const COUNT = "\\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve"
const WINDOW = new RegExp(`(${COUNT})[\\s-]*(day|week|month|year)s?`, "i")

const toNumber = (s: string) => WORDS[s.toLowerCase()] ?? Number(s)

const monthsIn = (text: string): number | null => {
  const m = text.match(WINDOW)
  if (!m) return null
  const n = toNumber(m[1]!)
  const unit = m[2]!.toLowerCase()
  const months = unit === "day" ? n / DAYS_PER_MONTH : unit === "week" ? (n * 7) / DAYS_PER_MONTH : unit === "year" ? n * 12 : n
  return Math.round(months * 100) / 100
}

const FILLER =
  /\b(?:or|and|and\/or|the|a|an|of|with|without|who|are|is|be|being|were|was|have|has|had|having|patients?|subjects?|participants?|women|woman|female|females|men|man|mother|mothers|currently|known|any|during|study|course|trial|potentially|likely|at|time|screening|baseline|inclusion|enrol\w*|visit|prior|before|preceding|to|in|for|by|on|as|per|that|this|must|should|not|no|only|evidence|diagnosis|diagnosed|diagnostic|pre|first|between|person|hold|inclusive|both|participant|according|criteria|revised|defined|within|last|past|previous|previously|recent|recently|least|more|than|up|over|under)\b|[\d.,;:()\-–/<>≤≥=\s]+/gi

const leftover = (text: string, consumed: ReadonlyArray<RegExp>) =>
  consumed.reduce((rest, re) => rest.replace(re, " "), text).replace(FILLER, " ").trim()

const withNarrow = (rule: Rule, narrow: boolean): Rule => (narrow ? { _tag: "narrow", rule } : rule)

const COURSE_WORDS: ReadonlyArray<readonly [MsCourse, RegExp]> = [
  ["rrms", /\bRRMS\b|relapsing[- ]remitting|relapse[- ]remitting/i],
  ["spms", /\bSPMS\b|secondary[- ]progressive|relapse[- ]onset,?\s*secondary/i],
  ["ppms", /\bPPMS\b|primary[- ]progressive/i],
  ["cis", /clinically isolated|\bCIS\b/i]
]
const COURSE_GROUPS: ReadonlyArray<readonly [RegExp, ReadonlyArray<MsCourse>]> = [
  [/\brelapsing\s+(?:forms?\s+of\s+)?(?:MS|multiple sclerosis)\b|\bRMS\b/i, ["rrms", "spms"]],
  [/\b(?:primary|secondary)\s+(?:or|and|and\/or)\s+(?:primary|secondary)[- ]progressive/i, ["ppms", "spms"]],
  [/\bprogressive\s+(?:forms?\s+of\s+)?(?:MS|multiple sclerosis)\b|\bprogressive forms?\b/i, ["ppms", "spms"]]
]
const COURSE_QUAL = /\bactive\b|\bnon-?active\b|\bnot-?active\b|\binactive\b|superimposed|with or without|disease activity|clinical or radiological/i
const NEGATION = /\b(?:no|not|without|never|other than|apart from|besides|excluding|except)\b(?![- ]active)/i

const courseHit = (text: string): Hit | null => {
  const named = COURSE_WORDS.filter(([, re]) => re.test(text)).map(([c]) => c)
  const unnamed = COURSE_WORDS.reduce((t, [, re]) => t.replace(re, " "), text)
  const grouped = COURSE_GROUPS.filter(([re]) => re.test(re === COURSE_GROUPS[1]![0] ? text : unnamed)).flatMap(([, cs]) => cs)
  const courses = [...new Set([...named, ...grouped])]
  if (!courses.length) return null
  if (NEGATION.test(text.replace(/without (?:a )?relapses?[^.]*$/i, ""))) return null
  const consumed = /\bRRMS\b|\bSPMS\b|\bPPMS\b|\bRMS\b|\bCIS\b|\bMS\b|relapsing|remitting|relapse[- ]remitting|relapse[- ]onset|onset|secondary|primary|progressive|clinically isolated|syndrome|multiple sclerosis|forms?|active|inactive|non-?active|not-?active|mc ?donald'?s?|mac ?donald'?s?|lublin|reingold|revised|\d{4}|classification|onset|thompson|et al|lancet|neurol|criteria|diagnostic/gi
  return { key: "course", rule: { _tag: "msCourse", courses }, narrow: grouped.length > 0 || COURSE_QUAL.test(text), consumed }
}

const EDSS_FRAGMENT = /(?:expanded disability status scale|\bEDSS\b)/i
const EDSS_MOVEMENT = /\b(?:progress\w*|worsen\w*|increase\w*|decrease\w*|chang\w*|improv\w*|declin\w*|deteriorat\w*|stable|stabili\w*)\b/i
const EDSS_SUBSCORE = /pyramidal|cerebellar|brainstem|sensory|bowel|bladder|visual|cerebral|ambulation|functional|sub-?scores?/i
const NUM = "(\\d+(?:[.,]\\d+)?)"
const point = (s: string) => Number(s.replace(",", "."))

const edssHit = (text: string): Hit | null => {
  const at = text.search(EDSS_FRAGMENT)
  if (at < 0) return null
  const seg = text.slice(at, at + 90)
  if (EDSS_MOVEMENT.test(text) || EDSS_SUBSCORE.test(seg)) return null
  const between = seg.match(new RegExp(`${NUM}\\s*(?:to|-|–|—|and|through)\\s*(?:≤\\s*)?${NUM}`, "i"))
  let min: number | undefined
  let max: number | undefined
  if (between) {
    min = point(between[1]!)
    max = point(between[2]!)
  } else {
    const upper = seg.match(new RegExp(`(≤|<=|<|at most|up to|no more than|maximum of|less than or equal to|less than|below|under)\\s*${NUM}`, "i"))
    const upperAfter = seg.match(new RegExp(`${NUM}\\s*(?:or (?:less|lower|below))`, "i"))
    const lower = seg.match(new RegExp(`(≥|>=|>|at least|minimum of|greater than or equal to|greater than|more than|above|over)\\s*${NUM}`, "i"))
    const lowerAfter = seg.match(new RegExp(`${NUM}\\s*(?:or (?:more|higher|greater|above))`, "i"))
    if (upper) {
      const strict = /^(?:<|less than|below|under)$/i.test(upper[1]!)
      max = point(upper[2]!) - (strict ? EDSS_STEP : 0)
    } else if (upperAfter) max = point(upperAfter[1]!)
    if (lower) {
      const strict = /^(?:>|greater than|more than|above|over)$/i.test(lower[1]!)
      min = point(lower[2]!) + (strict ? EDSS_STEP : 0)
    } else if (lowerAfter) min = point(lowerAfter[1]!)
  }
  if (min === undefined && max === undefined) return null
  if ([min, max].some((v) => v !== undefined && (v < 0 || v > 10))) return null
  if (min !== undefined && max !== undefined && min > max) return null
  const consumed = new RegExp(`expanded disability status(?: scale| score)?|\\bEDSS\\b|scores?|scale|inclusive|both|points?|≤|<=|<|>=|≥|>|at most|up to|no more than|maximum of|less than|greater than|more than|or equal to|at least|minimum of|below|above|over|under|or (?:less|lower|more|higher|greater|below|above)|${NUM}`, "gi")
  return { key: "edss", rule: { _tag: "edss", ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}) }, narrow: false, consumed }
}

const RELAPSE_WORD = /\b(?:relapses?|exacerbations?)\b/i
const RELAPSE_NEGATED = /\b(?:no|not|absence of|lack of|free of|without|never)\b[^.;]{0,50}\b(?:relapses?|exacerbations?)\b|relapse[- ]free|\b(?:have|has) not had\b/i
const MULTIPLE = /(?:at least|≥|>=)\s*(?:two|2|three|3)\s+(?:\w+\s+){0,2}(?:relapses|exacerbations|attacks)|\b(?:two|three|2|3) or more\s+(?:\w+\s+){0,2}(?:relapses|exacerbations)|\b(?:two|three|2|3)\s+(?:documented\s+|clinical\s+)?relapses/i
const NOT_ABOUT_RELAPSES = /independent of|irrespective|regardless|progression|\b(?:COPD|ALS|asthma|pulmonary|amyotrophic)\b|(?:more|longer|greater) than\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s*(?:day|week|month|year)/i
const RECENCY = new RegExp(`(?:within|in|during|over|for|since|past|last|previous|prior|preceding|before)\\s+(?:the\\s+)?(?:(?:last|past|previous|prior|preceding)\\s+)?(${COUNT})[\\s-]*(day|week|month|year)s?|(${COUNT})[\\s-]*(day|week|month|year)s?\\s+(?:before|prior|preceding|ago|post)|(?:at least|≥|>=)\\s*(${COUNT})[\\s-]*(day|week|month|year)s?`, "gi")

const recencyMonths = (text: string): number | null => {
  const found = new Set<number>()
  for (const m of text.matchAll(RECENCY)) {
    const [n, unit] = m[1] ? [m[1], m[2]] : m[3] ? [m[3], m[4]] : [m[5], m[6]]
    const months = monthsIn(`${n} ${unit}`)
    if (months !== null) found.add(months)
  }
  for (const m of text.matchAll(/(?:the\s+)?(?:last|past|previous|prior|preceding)\s+(year|month)\b/gi)) found.add(m[1]!.toLowerCase() === "year" ? 12 : 1)
  return found.size === 1 ? [...found][0]! : null
}

const relapseHit = (text: string, kind: Kind): Hit | null => {
  const plain = text.replace(/relapsing[- ]remitting|relapse[- ]remitting|relapse[- ]onset|relapsing/gi, " ")
  if (!RELAPSE_WORD.test(plain) || NOT_ABOUT_RELAPSES.test(text)) return null
  if (!/exacerbation/i.test(plain) === false && !/relapse/i.test(plain) && !/\bMS\b|multiple sclerosis|neurolog/i.test(text)) return null
  const months = recencyMonths(text)
  if (months === null) return null
  const negated = RELAPSE_NEGATED.test(plain)
  if (negated && kind === "exclusion") return null
  const base: Rule = { _tag: "relapse", withinMonths: months }
  const consumed = new RegExp(`relapses?|exacerbations?|clinical|definite|documented|confirmed|acute|evidence|current|recent|ms|multiple sclerosis|attacks?|free|period|absence|lack|${COUNT}|days?|weeks?|months?|years?|at least|least|one|occurrence|having|had|occurred|post|\\bno\\b`, "gi")
  return { key: "relapse", rule: negated ? { _tag: "not", rule: base } : base, narrow: MULTIPLE.test(text) || /require|steroid|treatment|severity|other than|motor|optic/i.test(text), consumed }
}

const THERAPY_WORDS: ReadonlyArray<readonly [MsTherapyCategory, RegExp]> = [
  ["interferon", /interferons?|\bIFN\b|avonex|rebif|betaferon|betaseron|plegridy|extavia/i],
  ["glatiramer", /glatiramer|copaxone|glatopa/i],
  ["natalizumab", /natalizumab|tysabri|tyruko/i],
  ["antiCd20", /ocrelizumab|ocrevus|ofatumumab|kesimpta|rituximab|ublituximab|briumvi|anti[- ]?CD20|\bRTX\b|\bOCR\b|B[- ]cell[- ]depleting/i],
  ["s1p", /fingolimod|gilenya|siponimod|mayzent|ozanimod|zeposia|ponesimod|ponvory|\bS1P\b|sphingosine/i],
  ["fumarate", /fumarate|\bDMF\b|tecfidera|vumerity|dimethylfumarate/i],
  ["teriflunomide", /teriflunomide|aubagio/i],
  ["cladribine", /cladribine|mavenclad/i],
  ["alemtuzumab", /alemtuzumab|lemtrada|campath/i]
]
const TREATMENT_WORD = /\b(?:treat\w*|therap\w*|receiv\w*|prior|previous\w*|ever|exposure|use of|taking|administ\w*|ongoing|current\w*)\b/i
const OTHER_DRUGS = /mitoxantrone|cyclophosphamide|daclizumab|azathioprine|methotrexate|mycophenolate|stem cell|HSCT|immunosuppress|immunomodulat|other (?:ms |disease)|any other|disease[- ]modifying|\bDMTs?\b|first[- ]line|second[- ]line/i
const THERAPY_TIMING = /within|in the (?:last|past)|at least|\bago\b|prior to|preceding|before|since|stable|for \w+ (?:month|year|week)|dose|washout|discontinu|\bover\b|\bfor\b/i

const therapyHit = (text: string, kind: Kind): Hit | null => {
  if (kind !== "exclusion") return null
  const categories = THERAPY_WORDS.filter(([, re]) => re.test(text)).map(([c]) => c)
  if (!categories.length || !TREATMENT_WORD.test(text)) return null
  if (/\b(?:allerg\w*|hypersensitiv\w*|reaction|intoleran\w*|infusion|negative|JC virus|contra-?indicat\w*|eligible and willing|willing to|indication|makes?|worsen\w*|exacerbat\w*|interact\w*|conflict\w*|related to|ancillary|concomitant)\b/i.test(text)) return null
  const rule: Rule = categories.length === 1 ? { _tag: "msTherapy", category: categories[0]! } : { _tag: "anyOf", rules: categories.map((category): Rule => ({ _tag: "msTherapy", category })) }
  const names = THERAPY_WORDS.map(([, re]) => re.source).join("|")
  const consumed = new RegExp(`${names}|treatment|therapy|therapies|treated|previous|prior|ever|received|receiving|ongoing|current|currently|use of|taking|exposed|exposure|monoclonal|antibod\\w*|agents?|drugs?|modulators?|inhibitors?|receptor|ms|multiple sclerosis|beta|acetate|first|second|1a|1b`, "gi")
  return { key: "therapy", rule, narrow: THERAPY_TIMING.test(text) || OTHER_DRUGS.test(text), consumed }
}

const flagHit = (key: string, flag: FlagKey, trigger: RegExp, narrow: boolean, extra: RegExp): Hit => ({
  key,
  rule: { _tag: "flag", flag },
  narrow,
  consumed: new RegExp(`${trigger.source}|${extra.source}`, "gi")
})

const PREGNANCY = /pregnan\w*|breast[- ]?feed\w*|lactat\w*|nursing|gravid/i
const PREGNANCY_HAZARD = /contracepti\w*|childbearing|child-?bearing|reproductive|\btest\b|\bwish\w*|\bplan\w*|delivery|miscarriage|abortion|\bIVF\b|fertil\w*/i
const pregnancyHit = (text: string, kind: Kind): Hit | null => {
  if (kind !== "exclusion" || !PREGNANCY.test(text) || PREGNANCY_HAZARD.test(text)) return null
  if (/MRI|radiation|PET|scan|contraindicat/i.test(text)) return null
  return flagHit("pregnancy", "pregnancy", PREGNANCY, false, /potentially|currently|woman|women|mothers?|female/)
}

const MRI = /(?:contra-?indicat\w*|unable|inability|impossib\w*|cannot|not able|unwilling|refus\w*|intoleran\w*|precludes?|does not allow)[^.;]{0,60}\b(?:MRI|magnetic resonance)|\b(?:MRI|magnetic resonance)[^.;]{0,40}contra-?indicat|claustrophob\w*|pace-?maker/i
const mriHit = (text: string, kind: Kind): Hit | null => {
  if (kind !== "exclusion" || !MRI.test(text)) return null
  if (PREGNANCY.test(text) || /gadolinium|contrast|EEG|PET|CT\b|allerg|informed|abnormal/i.test(text)) return null
  return flagHit("mri", "mriUnsuitable", MRI, false, /MRI|magnetic resonance|scans?|examinations?|exams?/)
}

const STEROID = /corticosteroids?|glucocorticoids?|glucocorticosteroids?|steroids?|methylprednisolone|prednisolone|prednisone|\bACTH\b/i
const steroidHit = (text: string, kind: Kind): Hit | null => {
  if (kind !== "exclusion" || !STEROID.test(text)) return null
  const months = monthsIn(text)
  if (months === null || months > STEROID_QUESTION_MONTHS) return null
  if (/allerg|hypersensitiv|intoleran|contraindicat|chronic|except/i.test(text)) return null
  return flagHit("steroids", "recentSteroids", STEROID, true, /treatment|therapy|course|bolus|high[- ]dose|infusions?|intravenous|oral|systemic|received|receiving|having|\bIV\b|mg|day|days|week|weeks|month|months/)
}

const INFECTION = /\bHIV\b|human immunodeficiency|hepatitis\s*(?:B|C)\b|hepatitis (?:virus|B, C)|\bHBV\b|\bHCV\b|tubercul\w*|\bTB\b|HTLV|syphilis/i
const INFECTION_QUAL = /active|latent|chronic|positive|antibod\w*|antigen|PCR|test\w*|screen\w*|history|unless|treated|serolog\w*|detectable|including|known/i
const infectionHit = (text: string, kind: Kind): Hit | null => {
  if (kind !== "exclusion" || !INFECTION.test(text)) return null
  return flagHit("infection", "chronicInfection", INFECTION, INFECTION_QUAL.test(text), /hepatitis|virus|infections?|infectious|diseases?|surface|antigen|HBsAg|antibod\w*|positiv\w*|negativ\w*|active|latent|chronic|history|known|including|tests?|testing|result|quantiferon|gold|syphilis|HTLV|[ABC]\b/)
}

const CANCER = /malignan\w*|cancers?|carcinoma|neoplas\w*|tumou?rs?/i
const CANCER_QUAL = /except|unless|other than|exception|within|\bin situ\b|basal|skin|years?|disease[- ]free|no recurrence|active|history|prior|previous|known|current|treated|adequately|actual|signs/i
const CANCER_HISTORY_CONTEXT = /(?:history of|prior|previous|known|active|current|having had|had)[^.;]{0,40}(?:malignan\w*|cancers?|neoplas\w*)|(?:malignan\w*|cancers?|neoplas\w*)[^.;]{0,30}(?:within|in the last|in the past)/i
const cancerHit = (text: string, kind: Kind): Hit | null => {
  if (kind !== "exclusion" || !CANCER.test(text) || !CANCER_HISTORY_CONTEXT.test(text)) return null
  if (/bladder|pelvic|liver|heart|kidney|prostate|mammary|lung|pulmonary|breast|cervical|screening|MRI/i.test(text.replace(/except for[^.]*$/i, ""))) return null
  return flagHit("cancer", "cancerHistory", CANCER, CANCER_QUAL.test(text), /malignan\w*|cancers?|neoplas\w*|history|prior|previous|known|active|current|actual|signs?|except|unless|other than|exception|basal|squamous|cell|skin|in situ|adequately|treated|years?|disease[- ]free|recurrence|recurrent|within|having had|\bhad\b/)
}

export const classifyMs = (raw: string, kind: Kind): Extraction => {
  const text = raw.replace(/\\([<>[\]_*~#-])/g, "$1").replace(/\s+/g, " ").trim()
  if (text.length > MAX_LENGTH) return NONE
  if (/\b(?:allowed|permitted|acceptable|may be (?:included|enrolled)|eligible if|only if|if\b|for patients (?:only|under)|for (?:healthy )?(?:controls|subjects)|healthy)\b/i.test(text)) return NONE
  if (kind === "inclusion" && /\b(?:unless|except|exception|other than)\b/i.test(text)) return NONE

  const found = [
    courseHit(text),
    edssHit(text),
    relapseHit(text, kind),
    therapyHit(text, kind),
    pregnancyHit(text, kind),
    mriHit(text, kind),
    steroidHit(text, kind),
    infectionHit(text, kind),
    cancerHit(text, kind)
  ].filter((h): h is Hit => h !== null)
  if (!found.length) return NONE

  const rest = found.reduce((s, h) => s.replace(h.consumed, " "), text)
  const extra = leftover(text, found.map((h) => h.consumed))
  const hazard = extra.length > 0
  const hasOr = /\b(?:or|and\/or)\b/i.test(rest) && hazard

  if (found.length > 1 && (kind === "exclusion" || hasOr || hazard)) return NONE

  const hit = found[0]!
  const narrow = found.some((h) => h.narrow)
  if (found.length > 1) {
    const rule: Rule = { _tag: "allOf", rules: found.map((h) => withNarrow(h.rule, h.narrow)) }
    return { rule, confidence: narrow ? "low" : "high" }
  }
  if (!hazard) return { rule: withNarrow(hit.rule, narrow), confidence: narrow ? "low" : "high" }
  if (kind === "inclusion" && hit.key === "course") return NONE
  if (kind === "exclusion") return { rule: { _tag: "anyOf", rules: [withNarrow(hit.rule, true), OTHER] }, confidence: "low" }
  return { rule: { _tag: hasOr ? "anyOf" : "allOf", rules: [withNarrow(hit.rule, narrow), OTHER] }, confidence: "low" }
}

export const msCriteria = (nctId: string, eligibilityText: string, f: StructuredFields): Criterion[] => {
  const decode = S.decodeUnknownSync(Rule)
  const fromText = splitCriteria(eligibilityText).map((it, i): Criterion => {
    const ex = classifyMs(it.text, it.kind)
    const base = { id: `${nctId}-${i}`, kind: it.kind, text: it.text, source: "registry-text" as const }
    try {
      return { ...base, rule: decode(ex.rule), confidence: ex.confidence }
    } catch {
      return { ...base, rule: OTHER, confidence: "none" }
    }
  })
  return [...structuredCriteria({ ...f, conditions: [] }, nctId), ...fromText]
}
