// Developer examples from real registry text, not medically reviewed.
import type { Rule } from "@trial-finder/domain"

export interface Gold {
  readonly kind: "inclusion" | "exclusion"
  readonly text: string
  readonly expect: Rule | "other"
}

const bm = (gene: any, state: "positive" | "negative" = "positive"): Rule => ({ _tag: "biomarker", gene, state })
const th = (category: any): Rule => ({ _tag: "priorTherapy", category })

export const GOLD: Gold[] = [
  { kind: "inclusion", text: "Age ≥ 18 years", expect: { _tag: "age", min: 18 } },
  { kind: "inclusion", text: "Eastern Cooperative Oncology Group (ECOG) performance status of 0 or 1.", expect: { _tag: "performanceStatus", min: 0, max: 1 } },
  { kind: "inclusion", text: "Performance status ≤ 2.", expect: { _tag: "performanceStatus", min: 0, max: 2 } },
  { kind: "inclusion", text: "PD-L1 expression ≥50% (TPS) determined by an approved IHC test", expect: { _tag: "pdl1", min: 50 } },
  { kind: "inclusion", text: "PD-L1 < 50% using TPS scoring", expect: { _tag: "pdl1", max: 49.999 } },
  { kind: "inclusion", text: "Histologically confirmed NSCLC.", expect: { _tag: "cancerType", types: ["nsclc"] } },
  { kind: "inclusion", text: "Histologically or cytologically confirmed SCLC", expect: { _tag: "cancerType", types: ["sclc"] } },
  { kind: "inclusion", text: "Histologically or cytologically documented non-squamous NSCLC.", expect: { _tag: "allOf", rules: [{ _tag: "cancerType", types: ["nsclc"] }, { _tag: "not", rule: { _tag: "cancerType", types: ["squamous"] } }] } },
  { kind: "inclusion", text: "No prior systemic treatment for metastatic NSCLC.", expect: { _tag: "priorLines", max: 0 } },
  { kind: "inclusion", text: "EGFR wild-type", expect: { _tag: "not", rule: bm("EGFR") } },
  { kind: "inclusion", text: "Subjects must not have had prior immunotherapy (anti-PD-1 or anti-PD-L1).", expect: { _tag: "not", rule: th("immunotherapy") } },
  { kind: "inclusion", text: "ANC ≥ 1500/mm3 and platelets ≥ 100,000/mm3", expect: { _tag: "allOf", rules: [{ _tag: "lab", analyte: "anc", min: 1.5 }, { _tag: "lab", analyte: "platelets", min: 100 }] } },
  { kind: "exclusion", text: "Prior treatment with an immune checkpoint inhibitor", expect: th("immunotherapy") },
  { kind: "exclusion", text: "Symptomatic brain metastases.", expect: { _tag: "flag", flag: "brainMetsActive" } },
  { kind: "exclusion", text: "History of pneumonitis/interstitial lung disease", expect: { _tag: "flag", flag: "ild" } },
  { kind: "exclusion", text: "Has history of autoimmune disease.", expect: { _tag: "flag", flag: "autoimmune" } },
  { kind: "exclusion", text: "Actionable mutation or genomic alteration in EGFR, ALK or ROS1", expect: { _tag: "anyOf", rules: [bm("EGFR"), bm("ALK"), bm("ROS1")] } },
  { kind: "exclusion", text: "Known EGFR mutation or ALK rearrangement", expect: { _tag: "anyOf", rules: [bm("EGFR"), bm("ALK")] } },
  { kind: "exclusion", text: "Prior immunotherapy within 6 months of enrolment", expect: { _tag: "narrow", rule: th("immunotherapy") } },
  { kind: "exclusion", text: "Autoimmune disease, except vitiligo", expect: { _tag: "narrow", rule: { _tag: "flag", flag: "autoimmune" } } },
  { kind: "exclusion", text: "History of interstitial lung disease or pneumonitis that required steroids", expect: { _tag: "narrow", rule: { _tag: "flag", flag: "ild" } } },
  { kind: "exclusion", text: "Prior systemic anticancer therapy for advanced or metastatic NSCLC", expect: { _tag: "priorLines", min: 1 } },
  { kind: "exclusion", text: "Mixed small cell and non-small cell histology", expect: "other" },
  { kind: "exclusion", text: "Stage I disease", expect: "other" },
  { kind: "exclusion", text: "Disease considered for surgical treatment, such as Pancoast or superior sulcus tumors", expect: "other" },
  { kind: "inclusion", text: "Eligibility to first-line treatment with immune checkpoint inhibitor.", expect: "other" },
  { kind: "inclusion", text: "In the presence of an EGFR mutation the patient must have received at least one targeted therapy line", expect: "other" },
  { kind: "inclusion", text: "Prior radiotherapy is permitted", expect: "other" },
  { kind: "inclusion", text: "Cohort 3 (RCC): at most 2 prior lines of therapy", expect: "other" },
  { kind: "inclusion", text: "Stage not exceeding IIIB", expect: "other" },
  { kind: "inclusion", text: "Female patients must be of non-reproductive potential (≥60 years) or use contraception", expect: "other" },
  { kind: "inclusion", text: "Measurable disease per RECIST 1.1", expect: "other" },
  { kind: "exclusion", text: "History of radiation pneumonitis requiring treatment", expect: "other" },
  { kind: "inclusion", text: "Provides an archival tumor sample or a newly obtained biopsy with EGFR testing", expect: "other" },
  { kind: "exclusion", text: "Participants treated with more than two systemic chemotherapies", expect: "other" }
]
