import { Schema as S } from "effect"


export const Tri = S.Literal("yes", "no", "unknown")
export type Tri = typeof Tri.Type

export const Stage = S.Literal("I", "II", "III", "IV")
export type Stage = typeof Stage.Type

export const TherapyCategory = S.Literal(
  "chemotherapy",
  "immunotherapy",
  "targeted",
  "radiotherapy",
  "surgery",
  "systemic"
)
export type TherapyCategory = typeof TherapyCategory.Type

export const Gene = S.Literal("EGFR", "ALK", "ROS1", "KRAS", "BRAF", "MET", "RET", "HER2", "NTRK", "NRG1")
export type Gene = typeof Gene.Type
export const GENES = Gene.literals

export const CancerTypeKey = S.Literal("nsclc", "sclc", "adenocarcinoma", "squamous")
export type CancerTypeKey = typeof CancerTypeKey.Type

export const FlagKey = S.Literal("brainMetsAny", "brainMetsActive", "ild", "autoimmune")
export type FlagKey = typeof FlagKey.Type

export const LabAnalyte = S.Literal("anc", "platelets", "hemoglobin", "crcl")
export type LabAnalyte = typeof LabAnalyte.Type

// A rule is a *predicate about the patient*. Whether the predicate must be
// true (inclusion) or false (exclusion) is decided by the criterion's kind.

const CancerTypeRule = S.Struct({ _tag: S.Literal("cancerType"), types: S.Array(CancerTypeKey) })
const StageRule = S.Struct({
  _tag: S.Literal("stage"),
  stages: S.Array(Stage),
  extent: S.optional(S.Literal("limited", "extensive"))
})
const BiomarkerRule = S.Struct({
  _tag: S.Literal("biomarker"),
  gene: Gene,
  state: S.Literal("positive", "negative")
})
const Pdl1Rule = S.Struct({ _tag: S.Literal("pdl1"), min: S.optional(S.Number), max: S.optional(S.Number) })
const PriorTherapyRule = S.Struct({ _tag: S.Literal("priorTherapy"), category: TherapyCategory })
const PriorLinesRule = S.Struct({
  _tag: S.Literal("priorLines"),
  min: S.optional(S.Number),
  max: S.optional(S.Number)
})
const CurrentTherapyRule = S.Struct({ _tag: S.Literal("currentTherapy"), category: TherapyCategory })
const LabRule = S.Struct({
  _tag: S.Literal("lab"),
  analyte: LabAnalyte,
  min: S.optional(S.Number),
  max: S.optional(S.Number)
})
const AgeRule = S.Struct({ _tag: S.Literal("age"), min: S.optional(S.Number), max: S.optional(S.Number) })
const SexRule = S.Struct({ _tag: S.Literal("sex"), sex: S.Literal("female", "male") })
const PerformanceStatusRule = S.Struct({
  _tag: S.Literal("performanceStatus"),
  min: S.optional(S.Number),
  max: S.optional(S.Number)
})
const FlagRule = S.Struct({ _tag: S.Literal("flag"), flag: FlagKey })
const OtherRule = S.Struct({ _tag: S.Literal("other") })

type Leaf =
  | typeof CancerTypeRule.Type
  | typeof StageRule.Type
  | typeof BiomarkerRule.Type
  | typeof Pdl1Rule.Type
  | typeof PriorTherapyRule.Type
  | typeof PriorLinesRule.Type
  | typeof CurrentTherapyRule.Type
  | typeof LabRule.Type
  | typeof AgeRule.Type
  | typeof SexRule.Type
  | typeof PerformanceStatusRule.Type
  | typeof FlagRule.Type
  | typeof OtherRule.Type

export type Rule =
  | Leaf
  | { readonly _tag: "anyOf"; readonly rules: ReadonlyArray<Rule> }
  | { readonly _tag: "allOf"; readonly rules: ReadonlyArray<Rule> }
  | { readonly _tag: "not"; readonly rule: Rule }
  // The text restricts more than the rule: "yes" becomes unknown, "no" stays "no".
  | { readonly _tag: "narrow"; readonly rule: Rule }

export const Rule: S.Schema<Rule> = S.Union(
  CancerTypeRule,
  StageRule,
  BiomarkerRule,
  Pdl1Rule,
  PriorTherapyRule,
  PriorLinesRule,
  CurrentTherapyRule,
  LabRule,
  AgeRule,
  SexRule,
  PerformanceStatusRule,
  FlagRule,
  OtherRule,
  S.Struct({ _tag: S.Literal("anyOf"), rules: S.Array(S.suspend((): S.Schema<Rule> => Rule).annotations({ identifier: "Rule" })) }),
  S.Struct({ _tag: S.Literal("allOf"), rules: S.Array(S.suspend((): S.Schema<Rule> => Rule).annotations({ identifier: "Rule" })) }),
  S.Struct({ _tag: S.Literal("not"), rule: S.suspend((): S.Schema<Rule> => Rule).annotations({ identifier: "Rule" }) }),
  S.Struct({ _tag: S.Literal("narrow"), rule: S.suspend((): S.Schema<Rule> => Rule).annotations({ identifier: "Rule" }) })
)


export const Criterion = S.Struct({
  id: S.String,
  kind: S.Literal("inclusion", "exclusion"),
  text: S.String,
  rule: Rule,
  source: S.Literal("registry-text", "registry-field"),
  confidence: S.Literal("high", "low", "none")
})
export type Criterion = typeof Criterion.Type


export const Site = S.Struct({
  facility: S.String,
  city: S.String,
  country: S.String,
  zip: S.optional(S.String),
  status: S.optional(S.String),
  lat: S.optional(S.Number),
  lon: S.optional(S.Number),
  contactName: S.optional(S.String),
  contactEmail: S.optional(S.String),
  contactPhone: S.optional(S.String)
})
export type Site = typeof Site.Type

export const Trial = S.Struct({
  nctId: S.String,
  otherIds: S.Struct({
    euCt: S.optional(S.Array(S.String)),
    eudraCt: S.optional(S.Array(S.String)),
    drks: S.optional(S.Array(S.String))
  }),
  title: S.String,
  officialTitle: S.optional(S.String),
  briefSummary: S.optional(S.String),
  status: S.Literal("RECRUITING", "NOT_YET_RECRUITING", "OTHER"),
  phases: S.Array(S.String),
  conditions: S.Array(S.String),
  interventions: S.Array(S.Struct({ type: S.String, name: S.String })),
  armLabels: S.Array(S.String),
  design: S.Struct({
    allocation: S.optional(S.String),
    model: S.optional(S.String),
    masking: S.optional(S.String)
  }),
  lastUpdated: S.String,
  statusVerified: S.optional(S.String),
  centralContact: S.optional(
    S.Struct({ name: S.optional(S.String), email: S.optional(S.String), phone: S.optional(S.String) })
  ),
  sites: S.Array(Site),
  criteria: S.Array(Criterion),
  eligibilityText: S.String
})
export type Trial = typeof Trial.Type

export const Bundle = S.Struct({
  group: S.String,
  groupLabel: S.String,
  version: S.String,
  generatedAt: S.String,
  source: S.String,
  trials: S.Array(Trial),
  changes: S.Struct({
    since: S.NullOr(S.String),
    added: S.Array(S.String),
    removed: S.Array(S.String)
  })
})
export type Bundle = typeof Bundle.Type


export const BiomarkerState = S.Literal("positive", "negative", "unknown")
export const Pdl1Level = S.Literal("lt1", "1to49", "ge50", "unknown")
export const BrainMets = S.Literal("none", "treated", "active", "unknown")

export const Profile = S.Struct({
  cancerType: S.Literal("nsclc", "sclc", "unknown"),
  histology: S.Literal("adenocarcinoma", "squamous", "other", "unknown"),
  stage: S.Literal("I", "II", "III", "IV", "unknown"),
  sclcExtent: S.Literal("limited", "extensive", "unknown"),
  biomarkers: S.Record({ key: Gene, value: BiomarkerState }),
  pdl1: Pdl1Level,
  priorTherapies: S.Record({
    key: S.Literal("chemotherapy", "immunotherapy", "targeted", "radiotherapy", "surgery"),
    value: Tri
  }),
  priorLines: S.NullOr(S.Number),
  currentTherapy: S.Literal("none", "chemotherapy", "immunotherapy", "targeted", "radiotherapy", "unknown"),
  age: S.NullOr(S.Number),
  sex: S.Literal("female", "male", "unknown"),
  ecog: S.NullOr(S.Number),
  brainMets: BrainMets,
  ild: Tri,
  autoimmune: Tri,
  labs: S.Struct({
    anc: S.NullOr(S.Number),
    platelets: S.NullOr(S.Number),
    hemoglobin: S.NullOr(S.Number),
    crcl: S.NullOr(S.Number)
  }),
  country: S.Literal("DE", "AT", "CH"),
  postcode: S.String
})
export type Profile = typeof Profile.Type

export const emptyProfile = (): Profile => ({
  cancerType: "unknown",
  histology: "unknown",
  stage: "unknown",
  sclcExtent: "unknown",
  biomarkers: Object.fromEntries(GENES.map((g) => [g, "unknown"])) as Profile["biomarkers"],
  pdl1: "unknown",
  priorTherapies: {
    chemotherapy: "unknown",
    immunotherapy: "unknown",
    targeted: "unknown",
    radiotherapy: "unknown",
    surgery: "unknown"
  },
  priorLines: null,
  currentTherapy: "unknown",
  age: null,
  sex: "unknown",
  ecog: null,
  brainMets: "unknown",
  ild: "unknown",
  autoimmune: "unknown",
  labs: { anc: null, platelets: null, hemoglobin: null, crcl: null },
  country: "DE",
  postcode: ""
})
