import fc from "fast-check"
import {
  emptyProfile,
  FlagKey,
  GENES,
  LabAnalyte,
  MS_THERAPIES,
  MsCourse,
  TherapyCategory,
  type Criterion,
  type Profile,
  type Rule,
  type Tri,
  type Trial
} from "../src/index.js"

export const tri = fc.constantFrom<Tri>("yes", "no", "unknown")

const bounds = { min: fc.integer({ min: 0, max: 100 }), max: fc.integer({ min: 0, max: 400 }) }

const ranged = <T extends string>(tag: T) =>
  fc.record({ _tag: fc.constant(tag), ...bounds }, { requiredKeys: ["_tag"] })

const leaf = fc.oneof(
  fc.record({
    _tag: fc.constant("cancerType" as const),
    types: fc.uniqueArray(fc.constantFrom("nsclc", "sclc", "adenocarcinoma", "squamous" as const), { minLength: 1 })
  }),
  fc.record(
    {
      _tag: fc.constant("stage" as const),
      stages: fc.uniqueArray(fc.constantFrom("I", "II", "III", "IV" as const), { minLength: 1 }),
      extent: fc.constantFrom("limited", "extensive" as const)
    },
    { requiredKeys: ["_tag", "stages"] }
  ),
  fc.record({
    _tag: fc.constant("biomarker" as const),
    gene: fc.constantFrom(...GENES),
    state: fc.constantFrom("positive", "negative" as const)
  }),
  ranged("pdl1"),
  ranged("priorLines"),
  ranged("age"),
  ranged("performanceStatus"),
  fc.record({ _tag: fc.constant("priorTherapy" as const), category: fc.constantFrom(...TherapyCategory.literals) }),
  fc.record({ _tag: fc.constant("currentTherapy" as const), category: fc.constantFrom(...TherapyCategory.literals) }),
  fc.record(
    { _tag: fc.constant("lab" as const), analyte: fc.constantFrom(...LabAnalyte.literals), ...bounds },
    { requiredKeys: ["_tag", "analyte"] }
  ),
  fc.record({ _tag: fc.constant("sex" as const), sex: fc.constantFrom("female", "male" as const) }),
  fc.record({ _tag: fc.constant("flag" as const), flag: fc.constantFrom(...FlagKey.literals) }),
  fc.record({ _tag: fc.constant("msCourse" as const), courses: fc.uniqueArray(fc.constantFrom(...MsCourse.literals), { minLength: 1 }) }),
  ranged("edss"),
  fc.record({ _tag: fc.constant("relapse" as const), withinMonths: fc.integer({ min: 1, max: 36 }) }),
  fc.record({ _tag: fc.constant("msTherapy" as const), category: fc.constantFrom(...MS_THERAPIES) }),
  fc.constant({ _tag: "other" as const })
)

export const rule = fc.letrec<{ rule: Rule }>((tie) => ({
  rule: fc.oneof(
    { depthSize: "small", withCrossShrink: true },
    leaf as fc.Arbitrary<Rule>,
    fc.record({
      _tag: fc.constantFrom("anyOf", "allOf" as const),
      rules: fc.array(tie("rule"), { minLength: 1, maxLength: 3 })
    }),
    fc.record({ _tag: fc.constantFrom("not", "narrow" as const), rule: tie("rule") })
  )
})).rule

const yesNo = (b: boolean): Tri => (b ? "yes" : "no")

export const truth: fc.Arbitrary<Profile> = fc
  .record({
    sclc: fc.boolean(),
    histology: fc.constantFrom("adenocarcinoma", "squamous", "other" as const),
    stage: fc.constantFrom("I", "II", "III", "IV" as const),
    markers: fc.array(fc.constantFrom("positive", "negative" as const), { minLength: GENES.length, maxLength: GENES.length }),
    pdl1: fc.constantFrom("lt1", "1to49", "ge50" as const),
    therapies: fc.array(fc.boolean(), { minLength: 5, maxLength: 5 }),
    lines: fc.integer({ min: 0, max: 6 }),
    current: fc.constantFrom("none", "chemotherapy", "immunotherapy", "targeted", "radiotherapy" as const),
    age: fc.integer({ min: 18, max: 95 }),
    sex: fc.constantFrom("female", "male" as const),
    ecog: fc.integer({ min: 0, max: 4 }),
    brainMets: fc.constantFrom("none", "treated", "active" as const),
    ild: fc.boolean(),
    autoimmune: fc.boolean(),
    labs: fc.array(fc.integer({ min: 0, max: 400 }), { minLength: 4, maxLength: 4 }),
    msCourse: fc.constantFrom(...MsCourse.literals),
    edss: fc.integer({ min: 0, max: 20 }),
    lastRelapse: fc.constantFrom("lt1", "1to3", "3to12", "12to24", "gt24" as const),
    msTherapies: fc.array(fc.boolean(), { minLength: MS_THERAPIES.length, maxLength: MS_THERAPIES.length }),
    flags: fc.array(fc.boolean(), { minLength: 5, maxLength: 5 })
  })
  .map((t): Profile => {
    const [chemo, immuno, targeted, radio, surgery] = t.therapies as [boolean, boolean, boolean, boolean, boolean]
    const [pregnancy, mriUnsuitable, recentSteroids, chronicInfection, cancerHistory] = t.flags as [boolean, boolean, boolean, boolean, boolean]
    const systemic: [boolean, boolean, boolean] = t.lines === 0 ? [false, false, false] : chemo || immuno || targeted ? [chemo, immuno, targeted] : [true, immuno, targeted]
    return {
      ...emptyProfile(),
      cancerType: t.sclc ? "sclc" : "nsclc",
      histology: t.sclc ? "unknown" : t.histology,
      stage: t.stage,
      sclcExtent: t.sclc ? (t.stage === "IV" ? "extensive" : "limited") : "unknown",
      biomarkers: Object.fromEntries(GENES.map((g, i) => [g, t.markers[i]])) as Profile["biomarkers"],
      pdl1: t.pdl1,
      priorTherapies: {
        chemotherapy: yesNo(systemic[0]),
        immunotherapy: yesNo(systemic[1]),
        targeted: yesNo(systemic[2]),
        radiotherapy: yesNo(radio),
        surgery: yesNo(surgery)
      },
      priorLines: t.lines,
      currentTherapy: t.current,
      age: t.age,
      sex: t.sex,
      ecog: t.ecog,
      brainMets: t.brainMets,
      ild: yesNo(t.ild),
      autoimmune: yesNo(t.autoimmune),
      labs: { anc: t.labs[0]!, platelets: t.labs[1]!, hemoglobin: t.labs[2]!, crcl: t.labs[3]! },
      msCourse: t.msCourse,
      edss: t.edss / 2,
      lastRelapse: t.lastRelapse,
      msTherapies: Object.fromEntries(MS_THERAPIES.map((c, i) => [c, yesNo(t.msTherapies[i]!)])) as Profile["msTherapies"],
      pregnancy: yesNo(pregnancy && t.sex === "female"),
      mriUnsuitable: yesNo(mriUnsuitable),
      recentSteroids: yesNo(recentSteroids),
      chronicInfection: yesNo(chronicInfection),
      cancerHistory: yesNo(cancerHistory)
    }
  })

type Path = ReadonlyArray<string>

const PATHS: ReadonlyArray<Path> = [
  ["cancerType"],
  ["histology"],
  ["stage"],
  ["sclcExtent"],
  ...GENES.map((g) => ["biomarkers", g]),
  ["pdl1"],
  ...["chemotherapy", "immunotherapy", "targeted", "radiotherapy", "surgery"].map((t) => ["priorTherapies", t]),
  ["priorLines"],
  ["currentTherapy"],
  ["age"],
  ["sex"],
  ["ecog"],
  ["brainMets"],
  ["ild"],
  ["autoimmune"],
  ...["anc", "platelets", "hemoglobin", "crcl"].map((l) => ["labs", l]),
  ["msCourse"],
  ["edss"],
  ["lastRelapse"],
  ...MS_THERAPIES.map((c) => ["msTherapies", c]),
  ["pregnancy"],
  ["mriUnsuitable"],
  ["recentSteroids"],
  ["chronicInfection"],
  ["cancerHistory"]
]

type Tree = Record<string, unknown>

const readAt = (tree: Tree, [key, ...rest]: Path): unknown => (rest.length === 0 ? tree[key!] : readAt(tree[key!] as Tree, rest))

const writeAt = (tree: Tree, [key, ...rest]: Path, value: unknown): Tree =>
  rest.length === 0 ? { ...tree, [key!]: value } : { ...tree, [key!]: writeAt(tree[key!] as Tree, rest, value) }

export const forgetting = fc.array(fc.boolean(), { minLength: PATHS.length, maxLength: PATHS.length })

export const forget = (profile: Profile, flags: ReadonlyArray<boolean>): Profile => {
  const blank = emptyProfile() as unknown as Tree
  return PATHS.reduce((acc, path, i) => (flags[i] ? writeAt(acc, path, readAt(blank, path)) : acc), profile as unknown as Tree) as unknown as Profile
}

export const criterion: fc.Arbitrary<Criterion> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 6 }),
  kind: fc.constantFrom("inclusion", "exclusion" as const),
  text: fc.constant("text"),
  rule,
  source: fc.constant("registry-text" as const),
  confidence: fc.constantFrom("high", "low", "none" as const)
})

export const trial = (criteria: ReadonlyArray<Criterion>): Trial => ({
  nctId: "NCT00000001",
  otherIds: {},
  title: "generated",
  status: "RECRUITING",
  phases: [],
  conditions: [],
  interventions: [],
  armLabels: [],
  design: {},
  lastUpdated: "2026-01-01",
  sites: [],
  criteria,
  eligibilityText: ""
})
