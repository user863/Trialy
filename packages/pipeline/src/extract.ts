import { Schema as S } from "effect"
import {
  Criterion,
  GENES,
  Rule,
  type CancerTypeKey,
  type Gene,
  type LabAnalyte,
  type Stage,
  type TherapyCategory
} from "@trial-finder/domain"

type Kind = "inclusion" | "exclusion"


interface RawCriterion {
  readonly kind: Kind
  readonly text: string
}

const SECTION = /^\s*(?:key |main |other |additional )?(inclusion|exclusion)\s+criteria\b[^a-z]*$/i
const BULLET = /^(\s*)(?:[*\-•–]|\d+[.)]|\([a-z0-9]+\))\s+(.*)$/i

export const splitCriteria = (raw: string): RawCriterion[] => {
  const out: RawCriterion[] = []
  let kind: Kind | null = null
  let cur: string | null = null
  let baseIndent: number | null = null
  let afterBlank = true
  const flush = () => {
    if (cur && kind) {
      const text = cur.replace(/\s+/g, " ").trim()
      if (text.length >= 4) out.push({ kind, text })
    }
    cur = null
  }
  for (const line of raw.replace(/\r/g, "").split("\n")) {
    if (!line.trim()) {
      afterBlank = true
      continue
    }
    const sec = line.match(SECTION)
    if (sec) {
      flush()
      kind = sec[1]!.toLowerCase() as Kind
      baseIndent = null
      afterBlank = true
      continue
    }
    const b = line.match(BULLET)
    if (b) {
      const indent = b[1]!.length
      if (baseIndent === null) baseIndent = indent
      if (indent > baseIndent + 1 && cur !== null) cur += " " + b[2]!
      else {
        flush()
        cur = b[2]!
      }
    } else if (cur !== null && !afterBlank) {
      cur += " " + line.trim()
    } else {
      flush()
      if (!/:\s*$/.test(line.trim()) || line.trim().length > 90) cur = line.trim()
    }
    afterBlank = false
  }
  flush()
  return out
}


interface Hit {
  readonly tag: string
  readonly rule: Rule
  readonly narrow?: boolean
  readonly settingOK?: boolean
}
const SETTING_PHRASE = /\bfor\b[^.;]{0,30}\b(?:advanced|metastatic|recurrent|unresectable)\b[^.;]{0,25}|\bin the (?:advanced|metastatic)[^.;]{0,20}setting|\b(?:metastatic|advanced)[^.;]{0,20}settings?\b|\bnon-curable\b/gi

const NEG_START =
  /^(?:(?:patients?|participants?|subjects?|individuals?)\s+)?(?:(?:who\s+)?(?:has|have|had|did|does|do|must|should|can|cannot|may)\s*not\b|(?:has|have)\s+no\b|no\b|not\b|never\b|without\b|absence of|free of|negative for)/i
const MID_NEG =
  /\b(?:without|no (?:prior|previous|history|evidence)|(?:has|have|had|did|does|do|is|are) not|(?:has|have) no\b|never|free of|absence of|not (?:previously )?(?:received|treated|had))\b/i
const NEG_WORDS = /\b(?:naive|naïve|previously untreated|never received|not (?:previously|yet) (?:treated|received))\b/i

const QUAL = new RegExp(
  [
    "\\bunless\\b",
    "\\b(?:for|in) whom\\b",
    "\\bexcept(?:ion)?\\b",
    "\\bother than\\b",
    "\\boutside (?:of )?\\b",
    "\\bapart from\\b",
    "\\bwithin\\s+\\d",
    "\\bin the (?:past|last|previous)\\s+\\d",
    "\\d+\\s*(?:days?|weeks?|months?|years?)\\s*(?:prior|before|since|ago|after)",
    "\\brequiring\\b",
    "\\bthat required\\b",
    "\\bclinically significant\\b",
    "\\bonly if\\b",
    "\\bif\\b",
    "\\badjuvant\\b",
    "\\bneoadjuvant\\b",
    "\\bcurative\\b",
    "\\bdefinitive\\b",
    "\\brecurrent\\b",
    "\\brelaps",
    "\\bfor\\b[^.;]{0,30}\\b(?:advanced|metastatic|recurrent|unresectable)\\b",
    "\\bin the (?:advanced|metastatic)[^.;]{0,20}setting",
    "\\b(?:metastatic|advanced)[^.;]{0,20}settings?\\b",
    "\\b(?:intrathecal|intravesical|intrapleural|intratumou?ral|intra-?arterial|topical|locoregional)\\b",
    "-based\\b",
    "\\bcontaining\\b"
  ].join("|"),
  "i"
)

const PERMISSION = /\b(?:allowed|permitted|acceptable|eligible if|may be enrolled|can be enrolled|is not an exclusion|may have|no limit|no restriction|any number of|unlimited|can also be|may also|may be eligible|are eligible|can be eligible|not eligible|ineligible|are excluded|may be included|can be included|be included|will count|counts? as|counted as|defined as|usually|not necessarily|will be considered|considered (?:to be )?(?:post|pre)?menopaus|menopaus|child-?bearing|reproductive potential|contracepti)\b/i

const HAZARD =
  /measurable|recist|bilirubin|\bAST\b|\bALT\b|creatinine(?! clearance)|\bINR\b|albumin|\bULN\b|upper limit|organ function|life expectancy|tissue|biops|archival|contracept|pregnan|lactat|\badequate\b|cardiac|ejection|QTc|hepatitis|\bHIV\b|infection/i

const num = (s: string) => Number(s.replace(/,/g, ""))


const cancerType = (t: string, kind: Kind): Hit | null => {
  if (kind === "exclusion") return null
  if (/\b(?:mixed|combined|component|effusion|association|associated|suspected|sample|specimen|tissue|biops|cytology positive)\b/i.test(t)) return null
  if (!/histolog|cytolog|patholog|diagnos|confirmed|documented|proven|\b(?:patients?|participants?|subjects?|individuals?) (?:with|who have)|\bhas (?:a |an )?|\bhave (?:a |an )?/i.test(t)) return null
  const stripped = t.replace(/non[- ]?small[- ]?cell( lung)?( cancer| carcinoma)?/gi, " NSCLC ")
  const types: CancerTypeKey[] = []
  const nonSq = /non[- ]?squamous/i.test(t)
  const noSq = stripped.replace(/non[- ]?squamous/gi, "")
  if (/\bNSCLC\b/.test(stripped)) types.push("nsclc")
  if (/small[- ]?cell|\bSCLC\b/i.test(stripped.replace(/NSCLC/g, ""))) types.push("sclc")
  if (/adenocarcinoma/i.test(noSq)) types.push("adenocarcinoma")
  if (/squamous/i.test(noSq)) types.push("squamous")
  if (nonSq && types.includes("squamous")) {
    types.splice(types.indexOf("squamous"), 1)
    if (!types.length) return null
    return { tag: "cancerType", narrow: true, rule: { _tag: "cancerType", types } }
  }
  if (!types.length && !nonSq) return null
  let histNarrow = false
  if (types.includes("nsclc") && (types.includes("adenocarcinoma") || types.includes("squamous"))) {
    for (const h of ["adenocarcinoma", "squamous"] as const) {
      const i = types.indexOf(h)
      if (i >= 0) types.splice(i, 1)
    }
    histNarrow = true
  }
  if (/\b(?:prior|previous(?:ly)?|treated|received|therapy|regimen|treatment)\b[^.;]{0,40}\b(?:for|of|in)\b[^.;]{0,25}(?:NSCLC|SCLC|lung|adenocarcinoma|squamous)/i.test(stripped)) return null
  const parts: Rule[] = []
  if (types.length) parts.push({ _tag: "cancerType", types })
  if (nonSq) parts.push({ _tag: "not", rule: { _tag: "cancerType", types: ["squamous"] } })
  return { tag: "cancerType", narrow: histNarrow, rule: parts.length === 1 ? parts[0]! : { _tag: "allOf", rules: parts } }
}

const ROMAN: Record<string, Stage> = { I: "I", II: "II", III: "III", IV: "IV" }
const STAGE_ORDER: Stage[] = ["I", "II", "III", "IV"]

const stage = (t: string, kind: Kind): Hit | null => {
  if (kind === "exclusion") return null
  if (/brain|cns|central nervous|leptomening|prior|previous|received|therapy|treated|surgery|resection|resected|operated|earlier|\bago\b|post-?operative/i.test(t)) return null
  const set = new Set<Stage>()
  let extent: "limited" | "extensive" | undefined
  let narrow = false
  if (/extensive[- ]stage|\bES-SCLC\b|extensive disease/i.test(t)) extent = "extensive"
  else if (/limited[- ]stage|\bLS-SCLC\b|limited disease/i.test(t)) extent = "limited"
  if (/exceed|up to|or (?:lower|less|earlier|higher|greater|more)|at most|at least|below|above|beyond|limited to|no more|not more/i.test(t)) return null
  const tt = t.replace(/\b(IV|III|II|I)\s+([ABC])\b/g, "$1$2").replace(/\b((?:IV|III|II|I)[ABC]?)\s*\/\s*[ABC]\b/g, "$1")
  const re = /stages?\s+((?:IV|III|II|I)[ABC]?\d?(?![A-Za-z0-9])(?:\s*(?:,|\/|or|and|-|–|to)\s*(?:stages?\s*)?(?:IV|III|II|I)[ABC]?\d?(?![A-Za-z0-9]))*)/gi
  let found = false
  for (const m of tt.matchAll(re)) {
    found = true
    const toks = m[1]!.split(/(\s*(?:,|\/|or|and|-|–|to)\s*)/i)
    let prev: Stage | null = null
    let range = false
    for (const tok of toks) {
      const r = tok.trim().replace(/^stages?\s*/i, "").match(/^(IV|III|II|I)[ABC]?\d?$/i)
      if (r) {
        const s2 = ROMAN[r[1]!.toUpperCase()]!
        if (range && prev) {
          const [a, b] = [STAGE_ORDER.indexOf(prev), STAGE_ORDER.indexOf(s2)]
          for (let i = Math.min(a, b); i <= Math.max(a, b); i++) set.add(STAGE_ORDER[i]!)
        } else set.add(s2)
        prev = s2
        range = false
      } else if (/^\s*(?:-|–|to)\s*$/i.test(tok)) range = true
    }
  }
  const metaAlt = /\bor\s+metastatic|metastatic\s+or\b|\band\/or\s+metastatic/i.test(t) && !/advanced\s*(?:or|and|\/)\s*metastatic|metastatic\s*(?:or|and|\/)\s*(?:locally\s+)?advanced|recurrent/i.test(t)
  if (metaAlt) return null
  if (/\bmetastatic\b/i.test(t) && !found) set.add("IV")
  if (/locally advanced|unresectable/i.test(t) && !found) {
    set.add("III")
    narrow = true
  }
  if (/\badvanced\b/i.test(t.replace(/locally advanced/gi, " ")) && !found) {
    set.add("III")
    set.add("IV")
    narrow = true
  }
  if (!set.size && !extent) return null
  return {
    tag: "stage",
    narrow,
    rule: { _tag: "stage", stages: extent ? [] : STAGE_ORDER.filter((s) => set.has(s)), ...(extent ? { extent } : {}) }
  }
}

const GENE_RE: Record<Gene, RegExp> = {
  EGFR: /\bEGFR\b/,
  ALK: /\bALK\b/,
  ROS1: /\bROS-?1\b/,
  KRAS: /\bKRAS\b/,
  BRAF: /\bBRAF\b/,
  MET: /\bMET\b/,
  RET: /\bRET\b/,
  HER2: /\b(?:HER2|ERBB2)\b/,
  NTRK: /\bNTRK[123]?\b/,
  NRG1: /\bNRG1\b/
}
const POS_CUE =
  /mutation|mutant|mutated|alteration|rearrange|fusion|positive|amplification|exon|skipping|harbou?r|driver|translocation|activating|sensitizing|variant/i
const NEG_CUE = /wild[- ]?type|\bnegative\b|\bWT\b/i
const VARIANT = /G12[A-Z]|exon\s*\d+|T790M|L858R|V600E|del(?:etion)?\s*19|insertion|C797S|amplification|overexpression/i

const biomarker = (t: string, kind: Kind): Hit | null => {
  const genes = GENES.filter((g) => GENE_RE[g].test(t))
  if (!genes.length) return null
  if (/\b(?:EGFR|ALK|ROS1|KRAS|BRAF|MET|RET|HER2|NTRK)[- ]?(?:TKI|tyrosine|inhibitor|targeted|directed|antibod)/i.test(t)) return null
  if (/\bTKI\b|inhibitor|\banti-/i.test(t) && /prior|previous|received|treated|therapy/i.test(t)) return null
  if (/test(?:ed|ing)|assay|sample|tissue|biops|archival|sequenc|\bNGS\b|available|provide|submit|status|results?\b|documentation|confirmation/i.test(t)) return null
  const negStart = NEG_START.test(t)
  const negWord = NEG_CUE.test(t)
  const pos = POS_CUE.test(t)
  if (!negStart && !negWord && !pos) return null
  const narrow = VARIANT.test(t)
  const positives: Rule[] = genes.map((gene) => ({ _tag: "biomarker", gene, state: "positive" }))
  const negated = negStart || negWord
  if (negated) {
    if (kind === "exclusion") return null
    const inner: Rule = positives.length === 1 ? positives[0]! : { _tag: "anyOf", rules: positives }
    return { tag: "biomarker", narrow, rule: { _tag: "not", rule: inner } }
  }
  if (positives.length === 1) return { tag: "biomarker", narrow, rule: positives[0]! }
  const hasOr = /\bor\b|,|\//i.test(t)
  const hasAnd = /\band\b/i.test(t)
  if (hasAnd && hasOr) return null
  return { tag: "biomarker", narrow, rule: { _tag: hasAnd ? "allOf" : "anyOf", rules: positives } }
}

const pdl1 = (t: string): Hit | null => {
  if (!/PD-?L-?1/i.test(t)) return null
  if (/anti-?PD|PD-?L?1\s*(?:inhibitor|antibod|blocker|blockade|directed|targeted|therapy|axis)|checkpoint/i.test(t)) return null
  const pct = (s: string) => Number(s.replace(",", "."))
  let min: number | undefined
  let max: number | undefined
  let m: RegExpMatchArray | null
  if ((m = t.match(/(\d+(?:[.,]\d+)?)\s*%?\s*(?:-|–|to)\s*(\d+(?:[.,]\d+)?)\s*%/i))) {
    min = pct(m[1]!)
    max = pct(m[2]!) + 0.999
  } else if ((m = t.match(/(?:≥|>=|at least|greater than or equal to)\s*(\d+(?:[.,]\d+)?)\s*%/i))) min = pct(m[1]!)
  else if ((m = t.match(/(?:>|greater than|more than|above)\s*(\d+(?:[.,]\d+)?)\s*%/i))) min = pct(m[1]!) + 0.001
  else if ((m = t.match(/(?:≤|<=|at most|less than or equal to)\s*(\d+(?:[.,]\d+)?)\s*%/i))) max = pct(m[1]!)
  else if ((m = t.match(/(?:<|less than|below)\s*(\d+(?:[.,]\d+)?)\s*%/i))) max = pct(m[1]!) - 0.001
  else if (/negative/i.test(t)) max = 0.999
  else return null
  if (min === undefined && max === undefined) return null
  return { tag: "pdl1", rule: { _tag: "pdl1", ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}) } }
}

const THERAPY: Array<{ cat: TherapyCategory; generic: RegExp; specific?: RegExp }> = [
  {
    cat: "immunotherapy",
    generic: /immunotherap|checkpoint inhibitor|immune checkpoint/i,
    specific: /anti-?PD-?L?1|PD-?L?1 (?:inhibitor|antibod)|CTLA-?4|pembrolizumab|nivolumab|atezolizumab|durvalumab|cemiplimab|ipilimumab/i
  },
  {
    cat: "chemotherapy",
    generic: /chemotherap|cytotoxic/i,
    specific: /platinum|cisplatin|carboplatin|docetaxel|pemetrexed|paclitaxel|gemcitabine|etoposide|taxane/i
  },
  {
    cat: "targeted",
    generic: /targeted (?:therapy|treatment|agent)/i,
    specific: /\bTKIs?\b|tyrosine kinase inhibitors?|osimertinib|alectinib|lorlatinib|sotorasib|adagrasib|crizotinib|erlotinib|gefitinib|afatinib/i
  },
  { cat: "radiotherapy", generic: /radiotherap|radiation therapy|radiosurgery|\bradiation\b(?! pneumonitis)/i },
  { cat: "surgery", generic: /\bsurgery\b|\bresection\b/i },
  { cat: "systemic", generic: /systemic (?:anti-?cancer |anticancer )?(?:therapy|treatment|chemotherapy|regimen)|systemic therapy/i }
]
const PRIOR_CUE =
  /\b(?:prior(?!\s+to\b)|previous(?:ly)?|pre-?treated|history of|received|has had|have had|had|undergone|underwent|failed|progress(?:ed|ion)?\s+(?:on|after|following)|exposure to)\b/i
const THERAPY_CUE = PRIOR_CUE
const SETTING_ADV = /advanced|metastatic|stage\s+(?:IIIB|IIIC|IV)|\bIV\b|recurrent|unresectable|first[- ]line|1L\b/i

const THERAPY_NOISE =
  /must start|will start|to start|start of|initiat|prior to|before (?:the )?(?:start|first|surgery)|illness|medical condition|physical finding|abnormal|eligib|candidate|suitab|amenable|indicated|toxicit|adverse|neuropath|resolv|recover|induced|complicat|sensitiv|allerg|intoleran|reaction|pneumonitis|concurrent|concomitant|during (?:the )?(?:study|trial)|while (?:on|receiving)|planned|will (?:receive|require)|infect|antibiotic|steroid|immunosuppress|anticoag|medication|interaction|\bCYP|vaccin/i

const priorTherapy = (t: string, kind: Kind): Hit | null => {
  if (!THERAPY_CUE.test(t) && !NEG_WORDS.test(t) && !/\bno\b/i.test(t)) return null
  if (THERAPY_NOISE.test(t)) return null
  if (kind === "exclusion" && (NEG_START.test(t) || MID_NEG.test(t))) return null
  const cleaned = t.replace(/immunosuppress\w*/gi, " ")
  const cats: Array<{ cat: TherapyCategory; narrow: boolean }> = []
  for (const th of THERAPY) {
    const find = (re?: RegExp) => {
      if (!re) return false
      const m = re.exec(cleaned)
      if (!m) return false
      return PRIOR_CUE.test(cleaned.slice(Math.max(0, m.index - 70), m.index + m[0].length))
    }
    let g = find(th.generic)
    const s = find(th.specific)
    const named = th.cat === "targeted" && /\b[A-Z][A-Z0-9-]{1,}[- ]?(?:targeted|directed)\b/.test(cleaned)
    if (named) g = false
    if (g || s || named) cats.push({ cat: th.cat, narrow: (!g && s) || named || th.cat === "surgery" || th.cat === "radiotherapy" })
  }
  const negated = (NEG_START.test(t) || NEG_WORDS.test(t) || MID_NEG.test(t)) && !(kind === "exclusion" && (NEG_START.test(t) || MID_NEG.test(t)))
  const naive = /treatment[- ]naive|\bnaive\b|previously untreated|\bno (?:prior|previous|history of)\b/i.test(t) && /treatment|therapy|systemic|\blines?\b|chemo|immuno/i.test(t)
  const systemicOnly = cats.every((c) => c.cat === "systemic")
  const namedTherapy = THERAPY.some((th) => th.generic.test(t) || th.specific?.test(t))
  if (naive && !cats.length && namedTherapy) return null
  if (naive && (!cats.length || systemicOnly)) {
    return SETTING_ADV.test(t)
      ? { tag: "priorLines", rule: { _tag: "priorLines", max: 0 }, settingOK: true }
      : { tag: "priorTherapy", rule: { _tag: "not", rule: { _tag: "priorTherapy", category: "systemic" } } }
  }
  if (!cats.length) return null
  if (/(?:more|fewer|less) than|at least|at most|≥|≤|>|<|\b(?:one|two|three|four|\d+)\s+or more\b|\b(?:one|two|three|four|\d)\s+(?:prior\s+)?(?:lines?|regimens?|chemotherap\w+|systemic)/i.test(t)) {
    const l = priorLines(t)
    return l ? { ...l, narrow: true } : null
  }
  if (cats.some((c) => c.cat === "systemic") && SETTING_ADV.test(t) && !negated) {
    return { tag: "priorLines", rule: { _tag: "priorLines", min: 1 }, settingOK: true }
  }
  if (cats.some((c) => c.cat === "systemic") && SETTING_ADV.test(t) && negated) {
    return { tag: "priorLines", rule: { _tag: "priorLines", max: 0 }, settingOK: true }
  }
  if (/\blines?\b|\bregimens?\b/i.test(t)) {
    const lines = priorLines(t)
    if (lines) return lines
  }
  const leaves: Rule[] = cats.map((c) => {
    const base: Rule = { _tag: "priorTherapy", category: c.cat }
    return c.narrow ? { _tag: "narrow", rule: base } : base
  })
  const inner: Rule = leaves.length === 1 ? leaves[0]! : { _tag: "anyOf", rules: leaves }
  if (leaves.length > 1 && /\band\b/i.test(t) && !/\bor\b/i.test(t) && !negated) return null
  if (leaves.length > 1 && /in combination|combined with|\bplus\b|together with|followed by|\+/i.test(t)) return null
  return { tag: "priorTherapy", rule: negated ? { _tag: "not", rule: inner } : inner }
}

const WORDNUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, no: 0, zero: 0 }
const toN = (s: string) => (s.toLowerCase() in WORDNUM ? WORDNUM[s.toLowerCase()]! : Number(s))

const priorLines = (t: string): Hit | null => {
  let m: RegExpMatchArray | null
  const N = "(\\d|one|two|three|four|zero)"
  if ((m = t.match(new RegExp(`${N}\\s*(?:-|–|to|or)\\s*${N}\\s*(?:prior|previous)?\\s*(?:lines?|regimens?)`, "i"))))
    return { tag: "priorLines", rule: { _tag: "priorLines", min: toN(m[1]!), max: toN(m[2]!) } }
  if ((m = t.match(new RegExp(`(?:no more than|not more than|maximum of|up to|at most|≤|<=)\\s*${N}\\s*(?:prior|previous)?\\s*(?:lines?|regimens?)`, "i"))))
    return { tag: "priorLines", rule: { _tag: "priorLines", max: toN(m[1]!) } }
  if ((m = t.match(new RegExp(`(?:more than|greater than|>)\\s*${N}\\s*(?:prior|previous)?\\s*(?:systemic\\s*)?(lines?|regimens?|chemotherap\\w+)`, "i"))))
    return { tag: "priorLines", narrow: !/^(?:line|regimen)/i.test(m[2]!), rule: { _tag: "priorLines", min: toN(m[1]!) + 1 } }
  if ((m = t.match(new RegExp(`(?:fewer than|less than|<)\\s*${N}\\s*(?:prior|previous)?\\s*(?:lines?|regimens?)`, "i"))))
    return { tag: "priorLines", rule: { _tag: "priorLines", max: toN(m[1]!) - 1 } }
  if ((m = t.match(new RegExp(`(?:at least|≥|>=|minimum of|one or more)\\s*${N}?\\s*(?:prior|previous)?\\s*(?:lines?|regimens?)`, "i"))))
    return { tag: "priorLines", rule: { _tag: "priorLines", min: m[1] ? toN(m[1]) : 1 } }
  return null
}

const age = (t: string): Hit | null => {
  if (!/\bage[d]?\b|years? (?:old|of age)|years or (?:older|above|over)|older/i.test(t)) return null
  let m: RegExpMatchArray | null
  let min: number | undefined
  let max: number | undefined
  if ((m = t.match(/between\s+(\d{2})\s+and\s+(\d{2})/i)) || (m = t.match(/(\d{2})\s*(?:-|–|to)\s*(\d{2})\s*years/i))) {
    min = num(m[1]!)
    max = num(m[2]!)
  } else {
    if ((m = t.match(/(?:≥|>=|at least|greater than or equal to|over|older than)\s*(\d{2})/i))) min = num(m[1]!)
    else if ((m = t.match(/>\s*(\d{2})/))) min = num(m[1]!) + 1
    else if ((m = t.match(/(\d{2})\s*(?:years?|yrs?)?\s*(?:of age\s*)?(?:or|and)\s*(?:older|above|over|more)/i))) min = num(m[1]!)
    if ((m = t.match(/(?:≤|<=|at most|no more than|younger than|under)\s*(\d{2})/i))) max = num(m[1]!)
    else if ((m = t.match(/<\s*(\d{2})/))) max = num(m[1]!) - 1
  }
  const ok = (n?: number) => n === undefined || (n >= 12 && n <= 110)
  if ((min === undefined && max === undefined) || !ok(min) || !ok(max)) return null
  return { tag: "age", rule: { _tag: "age", ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}) } }
}

const ecog = (t: string): Hit | null => {
  const i = t.search(/ECOG|Eastern Cooperative|WHO (?:performance|PS)|performance status/i)
  if (i < 0) return null
  const w = t.slice(i, i + 110)
  if (/karnofsky|\bKPS\b|lansky/i.test(t) && !/ECOG/i.test(t)) return null
  let m: RegExpMatchArray | null
  let min: number | undefined
  let max: number | undefined
  if ((m = w.match(/\b([0-4])\s*(?:-|–|to|or|\/|,|and)\s*([0-4])\b/i))) {
    min = Number(m[1])
    max = Number(m[2])
    if (min > max) [min, max] = [max, min]
  } else if ((m = w.match(/(?:≤|<=|at most|no greater than|not greater than|less than or equal to|maximum of)\s*([0-4])/i))) {
    min = 0
    max = Number(m[1])
  } else if ((m = w.match(/(?:<|less than)\s*([0-4])/i))) {
    min = 0
    max = Number(m[1]) - 1
  } else if ((m = w.match(/(?:≥|>=|at least|greater than or equal to)\s*([0-4])/i))) {
    min = Number(m[1])
    max = 4
  } else if ((m = w.match(/(?:>|greater than)\s*([0-4])/i))) {
    min = Number(m[1]) + 1
    max = 4
  } else if ((m = w.match(/\b([0-4])\b/))) {
    min = max = Number(m[1])
  } else return null
  return { tag: "performanceStatus", rule: { _tag: "performanceStatus", min, max } }
}

const flags = (t: string, kind: Kind): Hit | null => {
  if (/(?:brain|cns|central nervous system|leptomeningeal)[^.;]{0,50}(?:metasta|lesion|involvement)|metasta[^.;]{0,40}(?:brain|cns)|leptomeningeal/i.test(t)) {
    const active = /untreated|\bactive\b|(?<!a)symptomatic|uncontrolled|unstable|progressi|leptomeningeal/i.test(t)
    const eased = /\bstable\b|(?<!un)treated|asymptomatic|controlled|\bunless\b|\bexcept|indication|therap|treatment|surgery|radiotherapy|steroid|symptom|neurolog|including/i.test(t)
    const base: Rule = { _tag: "flag", flag: active ? "brainMetsActive" : "brainMetsAny" }
    const negated = NEG_START.test(t) || MID_NEG.test(t)
    if (negated && kind === "exclusion") return null
    if (!negated && kind === "inclusion") return null
    return { tag: "flag", narrow: eased && !active, rule: negated ? { _tag: "not", rule: base } : base }
  }
  const one = (re: RegExp, flag: "ild" | "autoimmune"): Hit | null => {
    if (!re.test(t)) return null
    const negated = NEG_START.test(t) || MID_NEG.test(t)
    if (negated && kind === "exclusion") return null
    if (!negated && kind === "inclusion") return null
    const base: Rule = { _tag: "flag", flag }
    return { tag: "flag", rule: negated ? { _tag: "not", rule: base } : base }
  }
  return (
    one(/interstitial lung disease|\bILD\b|pneumonitis|pulmonary fibrosis/i, "ild") ??
    one(/autoimmune/i, "autoimmune")
  )
}

const currentTherapy = (t: string): Hit | null => {
  if (!/\bcurrently\s+(?:receiving|on|undergoing|taking|treated)/i.test(t)) return null
  for (const th of THERAPY) {
    if (th.cat === "surgery" || th.cat === "systemic") continue
    if (th.generic.test(t)) return { tag: "currentTherapy", rule: { _tag: "currentTherapy", category: th.cat }, narrow: true }
  }
  return null
}

const LAB_SPECS: Array<{ analyte: LabAnalyte; re: RegExp }> = [
  { analyte: "anc", re: /absolute neutrophil count|\bANC\b|neutrophils?\b/i },
  { analyte: "platelets", re: /platelets?/i },
  { analyte: "hemoglobin", re: /h(?:a)?emoglobin|\bHb\b|\bHgb\b/i },
  { analyte: "crcl", re: /creatinine clearance|\bCrCl\b|\bCCr\b|\bGFR\b/i }
]

const labs = (t: string): Hit[] => {
  const hits: Hit[] = []
  for (const spec of LAB_SPECS) {
    const i = t.search(spec.re)
    if (i < 0) continue
    const w = t.slice(i, i + 90)
    const m = w.match(/(≥|>=|>|greater than(?: or equal to)?|at least|<=|≤|<|less than|no more than|below)\s*([\d.,]+)\s*(.{0,24})/i)
    if (!m || /\bULN\b|upper limit|\bxULN/i.test(m[3]!)) continue
    const op = m[1]!.toLowerCase()
    const upper = /^(?:<=|≤|<|less|no more|below)/.test(op)
    let v = num(m[2]!.replace(/[.,]+$/, ""))
    const unit = m[3]!.toLowerCase()
    if (!Number.isFinite(v)) continue
    if (spec.analyte === "anc") {
      if (v >= 100) v /= 1000
    } else if (spec.analyte === "platelets") {
      if (v >= 1000) v /= 1000
    } else if (spec.analyte === "hemoglobin") {
      if (/mmol/.test(unit)) continue
      if (v > 30) v /= 10
    } else if (spec.analyte === "crcl") {
      if (!/ml/.test(unit)) continue
    }
    const gt = op === ">" && !op.includes("=") ? "strict" : "incl"
    const bound = upper ? { max: v } : { min: gt === "strict" ? v + 0.001 : v }
    hits.push({ tag: `lab:${spec.analyte}`, rule: { _tag: "lab", analyte: spec.analyte, ...bound } })
  }
  return hits
}


interface Extraction {
  readonly rule: Rule
  readonly confidence: "high" | "low" | "none"
}

const OTHER: Rule = { _tag: "other" }

const narrowRule = (r: Rule): Rule => {
  switch (r._tag) {
    case "not":
      return { _tag: "not", rule: narrowRule(r.rule) }
    case "anyOf":
    case "allOf":
      return { _tag: r._tag, rules: r.rules.map(narrowRule) }
    case "narrow":
    case "other":
      return r
    default:
      return { _tag: "narrow", rule: r }
  }
}
const COHORT =
  /\b(?:cohort|arm|part|module|stratum|substudy)s?\s*(?:\d+|[A-Z]\b)|\bfor (?:the )?(?:cohort|arm|part)\b|^\s*(?:expansion\s+)?(?:cohort|arm|part|module|stratum|sub-?study|dose[- ]expansion|phase\s*[123][ab]?)\b|^[^:]{0,40}\b(?:cohorts?|arms?|parts?|modules?|sub-?stud(?:y|ies))\b[^:]{0,15}:/i
const SAMPLE_CONTEXT = /availab|provid(?:e|ed|ing)\b|submit|biops|tissue|specimen|archival|\bsample/i
const OFFTOPIC =
  /\b(?:esophag\w*|oesophag\w*|gastro\w*|stomach|TNBC|HNSCC|ESCC|CRC|NPC|solid tumou?rs?|renal|RCC|colorectal|colon|breast|melanoma|ovarian|prostate|pancrea\w*|hepatocellular|HCC|gastric|urothelial|bladder|head and neck|sarcoma|lymphoma|leuk[a]?emia|myeloma|cervical|endometrial|thyroid|glioma|glioblastoma|cholangio\w*|esophageal|mesothelioma)\b/i
const CONDITIONAL_ANY = /^\s*(?:for|in|among)\s+(?:the\s+)?(?:patients|participants|subjects|those)\b/i
const CONDITIONAL_INC =
  /^\s*(?:patients|participants|subjects)\s+with\b[^.]{0,120}\b(?:must|should|need to|are required|is required|have to)\b|^\s*(?:patients|participants|subjects)\s+with\b[^:]{0,100}:|\bin case\b|(?:^|\s)\(?(?:ii|iii|iv)[.)]\s+\S/i
const CONDITIONAL = /^\s*(?:in the presence of|in case of|if\b|for (?:patients|participants|subjects) with)|\bin the presence of\b|\bin case of\b|\bwhen the\b|\bdepending on\b/i

export const classify = (text: string, kind: Kind): Extraction => {
  if (text.length > 420 || PERMISSION.test(text)) return { rule: OTHER, confidence: "none" }
  if (SAMPLE_CONTEXT.test(text)) return { rule: OTHER, confidence: "none" }
  if (COHORT.test(text) || (OFFTOPIC.test(text) && !/lung|nsclc|sclc/i.test(text))) return { rule: OTHER, confidence: "none" }
  if (CONDITIONAL_ANY.test(text)) return { rule: OTHER, confidence: "none" }
  if (kind === "inclusion" && (CONDITIONAL.test(text) || CONDITIONAL_INC.test(text))) return { rule: OTHER, confidence: "none" }
  const hits: Hit[] = []
  const push = (h: Hit | null) => h && hits.push(h)
  const th = priorTherapy(text, kind)
  const lines = th ? null : priorLines(text)
  push(th)
  push(lines)
  push(cancerType(text, kind))
  push(stage(text, kind))
  if (!th) push(biomarker(text, kind))
  push(pdl1(text))
  push(age(text))
  push(ecog(text))
  push(flags(text, kind))
  push(currentTherapy(text))
  hits.push(...labs(text))

  if (!hits.length) return { rule: OTHER, confidence: "none" }
  if (OFFTOPIC.test(text) && hits.some((h) => h.tag !== "cancerType")) return { rule: OTHER, confidence: "none" }
  if (kind === "exclusion" && hits.length > 1) return { rule: OTHER, confidence: "none" }
  const tags = new Set(hits.map((h) => h.tag.split(":")[0]))
  if (kind === "inclusion") {
    const masked = text
      .replace(/\b(IV|III|II|I)\s+([ABC])\b/g, "$1$2")
      .replace(/\b((?:IV|III|II|I)[ABC]?)\s*\/\s*[ABC]\b/g, "$1")
      .replace(/non[- ]small[- ]cell/gi, "")
      .replace(/\d\s*(?:or|and|to)\s*\d/gi, "")
      .replace(/\b(?:IV|III|II|I)[ABC]?\d?(?:\s*,\s*|\s+or\s+|\s+to\s+)(?=(?:stages?\s*)?(?:IV|III|II|I)[ABC]?\d?\b)/gi, "")
      .replace(/\b(?:NSCLC|SCLC)\s+or\s+(?=NSCLC|SCLC)/g, "")
      .replace(/\bor\s+(?:older|above|over|more|higher|greater|less|lower)\b/gi, "")
      .replace(/\b(?:male or female|men or women|female or male)\b/gi, "")
    const listTags = new Set(["cancerType", "biomarker", "priorTherapy", "stage"])
    const selfContained = [...tags].every((x) => listTags.has(x!))
    if (/\b(?:or|either)\b/i.test(masked) && (tags.size > 1 || !selfContained)) return { rule: OTHER, confidence: "none" }
    if (/\bor\s+(?:must|have|has|had|progress\w*|are|is|were|who|those|if)\b/i.test(masked)) return { rule: OTHER, confidence: "none" }
  }

  const longExclusion = kind === "exclusion" && text.length > 220
  const qualFor = (h: Hit) => longExclusion || QUAL.test(h.settingOK ? text.replace(SETTING_PHRASE, " ") : text)
  const qual = hits.some(qualFor)
  const parts = hits.map((h): Rule => (h.narrow || qualFor(h) ? narrowRule(h.rule) : h.rule))
  const hazard = HAZARD.test(text) || (kind === "inclusion" && text.length > 170)
  const all = hazard ? [...parts, OTHER] : parts
  const rule: Rule = all.length === 1 ? all[0]! : { _tag: "allOf", rules: all }
  const clean = !qual && !hits.some((h) => h.narrow) && !hazard
  return { rule, confidence: clean ? "high" : "low" }
}


export interface StructuredFields {
  readonly minAge?: string
  readonly maxAge?: string
  readonly sex?: string
  readonly conditions: ReadonlyArray<string>
}

const yearsOf = (s?: string): number | undefined => {
  const m = s?.match(/(\d+)\s*(Years?|Months?)/i)
  if (!m) return undefined
  return /month/i.test(m[2]!) ? Math.floor(Number(m[1]) / 12) : Number(m[1])
}

export const structuredCriteria = (f: StructuredFields, idPrefix: string): Criterion[] => {
  const out: Criterion[] = []
  const min = yearsOf(f.minAge)
  const max = yearsOf(f.maxAge)
  if (min !== undefined || max !== undefined) {
    out.push({
      id: `${idPrefix}-age`,
      kind: "inclusion",
      text: `Registry age limits: ${f.minAge ?? "no minimum"} to ${f.maxAge ?? "no maximum"}`,
      rule: { _tag: "age", ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}) },
      source: "registry-field",
      confidence: "high"
    })
  }
  const sex = f.sex?.toUpperCase()
  if (sex === "FEMALE" || sex === "MALE") {
    out.push({
      id: `${idPrefix}-sex`,
      kind: "inclusion",
      text: `Registry sex: ${sex.toLowerCase()} only`,
      rule: { _tag: "sex", sex: sex.toLowerCase() as "female" | "male" },
      source: "registry-field",
      confidence: "high"
    })
  }
  const lung = f.conditions.filter((c) => /lung|nsclc|sclc|pulmonary/i.test(c))
  if (f.conditions.length && lung.length === f.conditions.length) {
    const joined = lung.join(" | ")
    const small = /(^|[^n]\b)small[- ]?cell|\bSCLC\b/i.test(joined.replace(/non[- ]?small[- ]?cell|NSCLC/gi, ""))
    const nonSmall = /non[- ]?small[- ]?cell|\bNSCLC\b|adenocarcinoma|squamous/i.test(joined)
    if (small !== nonSmall) {
      out.push({
        id: `${idPrefix}-cond`,
        kind: "inclusion",
        text: `Registry conditions: ${f.conditions.join("; ")}`,
        rule: { _tag: "cancerType", types: [small ? "sclc" : "nsclc"] },
        source: "registry-field",
        confidence: "high"
      })
    }
  }
  return out
}

export const extractCriteria = (nctId: string, eligibilityText: string, f: StructuredFields): Criterion[] => {
  const decode = S.decodeUnknownSync(Rule)
  const items = splitCriteria(eligibilityText)
  const fromText = items.map((it, i): Criterion => {
    const ex = classify(it.text, it.kind)
    let rule: Rule
    try {
      rule = decode(ex.rule)
    } catch {
      return { id: `${nctId}-${i}`, kind: it.kind, text: it.text, rule: OTHER, source: "registry-text", confidence: "none" }
    }
    return { id: `${nctId}-${i}`, kind: it.kind, text: it.text, rule, source: "registry-text", confidence: ex.confidence }
  })
  return [...structuredCriteria(f, nctId), ...fromText]
}

export const generalCriteria = (nctId: string, eligibilityText: string, f: StructuredFields): Criterion[] => [
  ...structuredCriteria({ ...f, conditions: [] }, nctId),
  ...splitCriteria(eligibilityText).map(
    (it, i): Criterion => ({ id: `${nctId}-${i}`, kind: it.kind, text: it.text, rule: OTHER, source: "registry-text", confidence: "none" })
  )
]
