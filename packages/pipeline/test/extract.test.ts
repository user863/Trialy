import { describe, expect, it } from "vitest"
import { classify, splitCriteria, structuredCriteria } from "../src/extract.js"

const rule = (text: string, kind: "inclusion" | "exclusion" = "inclusion") => classify(text, kind).rule

describe("splitCriteria", () => {
  it("splits sections, bullets and wrapped lines", () => {
    const out = splitCriteria(
      `Inclusion Criteria:\n\n* Age >= 18 years\n* ECOG 0-1\n  and adequate organs\n  * sub item\n\nExclusion Criteria:\n\n* Known brain metastases\n`
    )
    expect(out.map((o) => o.kind)).toEqual(["inclusion", "inclusion", "exclusion"])
    expect(out[1]!.text).toContain("adequate organs")
    expect(out[1]!.text).toContain("sub item")
  })
})

describe("classify: structured", () => {
  it("age", () => expect(rule("Age ≥ 18 years")).toEqual({ _tag: "age", min: 18 }))
  it("ecog pair", () => expect(rule("ECOG performance status of 0 or 1")).toEqual({ _tag: "performanceStatus", min: 0, max: 1 }))
  it("ecog <=2", () => expect(rule("ECOG PS ≤ 2")).toEqual({ _tag: "performanceStatus", min: 0, max: 2 }))
  it("stage list", () =>
    expect(rule("Histologically confirmed non-small cell lung cancer, stage IIIA, IIIB or IV")).toMatchObject({
      _tag: "allOf",
      rules: [{ _tag: "cancerType", types: ["nsclc"] }, { _tag: "stage", stages: ["III", "IV"] }]
    }))
  it("exclusion EGFR", () =>
    expect(rule("Known EGFR mutation or ALK rearrangement", "exclusion")).toEqual({
      _tag: "anyOf",
      rules: [
        { _tag: "biomarker", gene: "EGFR", state: "positive" },
        { _tag: "biomarker", gene: "ALK", state: "positive" }
      ]
    }))
  it("inclusion wild type", () =>
    expect(rule("EGFR wild-type")).toEqual({ _tag: "not", rule: { _tag: "biomarker", gene: "EGFR", state: "positive" } }))
  it("PD-L1 thresholds", () => {
    expect(rule("PD-L1 TPS ≥ 50%")).toEqual({ _tag: "pdl1", min: 50 })
    expect(rule("PD-L1 < 50%")).toEqual({ _tag: "pdl1", max: 49.999 })
  })
  it("treatment-naive in advanced setting = zero lines", () =>
    expect(rule("No prior systemic therapy for metastatic NSCLC")).toEqual({ _tag: "priorLines", max: 0 }))
  it("exclusion prior immunotherapy", () =>
    expect(rule("Prior treatment with an immune checkpoint inhibitor", "exclusion")).toEqual({
      _tag: "priorTherapy",
      category: "immunotherapy"
    }))
  it("active brain mets", () =>
    expect(rule("Untreated or symptomatic brain metastases", "exclusion")).toEqual({ _tag: "flag", flag: "brainMetsActive" }))
  it("labs convert units", () =>
    expect(rule("ANC ≥ 1500/mm3 and platelets ≥ 100,000/mm3")).toEqual({
      _tag: "allOf",
      rules: [
        { _tag: "lab", analyte: "anc", min: 1.5 },
        { _tag: "lab", analyte: "platelets", min: 100 }
      ]
    }))
})

describe("classify: safety (uncertain -> other / narrowed)", () => {
  it("timing qualifier narrows", () =>
    expect(rule("Prior immunotherapy within 6 months of enrolment", "exclusion")).toEqual({
      _tag: "narrow",
      rule: { _tag: "priorTherapy", category: "immunotherapy" }
    }))
  it("exceptions narrow", () =>
    expect(rule("Autoimmune disease, except vitiligo", "exclusion")).toEqual({
      _tag: "narrow",
      rule: { _tag: "flag", flag: "autoimmune" }
    }))
  it("never structures cancer type or stage inside exclusions", () => {
    expect(rule("Mixed small cell and non-small cell histology", "exclusion")._tag).toBe("other")
    expect(rule("Stage I disease", "exclusion")._tag).toBe("other")
  })
  it("a mention in a non-history context is not a therapy claim", () => {
    expect(rule("Disease considered for surgical treatment, such as Pancoast tumors", "exclusion")._tag).toBe("other")
    expect(rule("Eligibility to first-line treatment with immune checkpoint inhibitor")._tag).toBe("other")
    expect(rule("History of radiation pneumonitis", "exclusion")._tag).not.toBe("priorTherapy")
  })
  it("conditional, permission and cohort-specific lines are other", () => {
    expect(rule("In the presence of an EGFR mutation the patient must have received a targeted therapy")._tag).toBe("other")
    expect(rule("Prior radiotherapy is permitted")._tag).toBe("other")
    expect(rule("Cohort 3 (RCC): at most 2 prior lines")._tag).toBe("other")
  })
  it("broadening stage wording is not guessed", () => expect(rule("Stage not exceeding IIIB")._tag).toBe("other"))
  it("inclusion with unmodelled alternative is other", () =>
    expect(rule("Female patients must be of non-reproductive potential (≥60 years) or use contraception")._tag).toBe("other"))
  it("unmodelled extras are carried as 'other'", () => {
    const r = rule("Adequate organ function: ANC ≥ 1.5 x 10^9/L, bilirubin ≤ 1.5 x ULN")
    expect(r).toMatchObject({ _tag: "allOf" })
    expect((r as any).rules.some((x: any) => x._tag === "other")).toBe(true)
  })
  it("counts of prior therapy are not category claims", () => {
    const r = rule("Participants treated with more than two systemic chemotherapies", "exclusion")
    expect(r._tag === "other" || (r._tag === "narrow" && (r as any).rule._tag === "priorLines")).toBe(true)
  })
  it("a drug-class word with a named target is narrowed", () =>
    expect(rule("Prior DLL3-targeted therapy", "exclusion")).toEqual({
      _tag: "narrow",
      rule: { _tag: "priorTherapy", category: "targeted" }
    }))
})

describe("regressions found in the real-data audit", () => {
  it("'stage IIIB or IIIC or Stage IV' keeps stage IV", () => {
    const r: any = rule("Stage IIIB or IIIC or Stage IV metastatic NSCLC, histologically confirmed")
    const st = (r.rules ?? [r]).map((x: any) => (x._tag === "narrow" ? x.rule : x)).find((x: any) => x._tag === "stage")
    expect(st.stages).toEqual(["III", "IV"])
  })
  it("'stage III or stage IV'", () => {
    const r: any = rule("Non-operable / non-irradiable stage III or stage IV disease")
    expect((r._tag === "narrow" ? r.rule : r).stages).toEqual(["III", "IV"])
  })
  it("stage ranges with digits (IA3-IIIA)", () => {
    const r: any = rule("Histologically confirmed resectable NSCLC, stages IA3-IIIA")
    const st = (r.rules ?? [r]).map((x: any) => (x._tag === "narrow" ? x.rule : x)).find((x: any) => x._tag === "stage")
    expect(st.stages).toEqual(["I", "II", "III"])
  })
  it("'anti-PD-1 naive or must have progressed' is not a generic naive rule", () =>
    expect(rule("Anti-PD-1/PD-L1 naive or must have progressed on treatment")._tag).toBe("other"))
  it("'no limit in the number of prior chemotherapies' is a permission", () =>
    expect(rule("No limit in number of prior chemotherapies, immunotherapy or other TKI regimens")._tag).toBe("other"))
  it("'squamous or non-squamous' never becomes a contradiction", () => {
    const r: any = rule("Confirmed squamous or non-squamous NSCLC, stage IIIB-IV")
    const hasNot = JSON.stringify(r).includes('"not"')
    expect(hasNot).toBe(false)
  })
  it("cohort-specific text anywhere in the sentence", () =>
    expect(rule("For Cohort 2, participant has received no prior treatment for ES-SCLC")._tag).toBe("other"))
  it("intrathecal chemotherapy is not general chemotherapy", () =>
    expect(rule("The patient has received prior treatment with intrathecal chemotherapy", "exclusion")).toEqual({
      _tag: "narrow",
      rule: { _tag: "priorTherapy", category: "chemotherapy" }
    }))
  it("'For subjects who have received prior checkpoint inhibitor: primary resistance' is conditional", () =>
    expect(rule("For subjects who have received prior treatment with a checkpoint inhibitor: primary resistance as defined by SITC", "exclusion")._tag).toBe("other"))
})

describe("regressions from the second audit", () => {
  const stagesOf = (r: any): string[] => {
    const leaves: any[] = []
    const walk = (x: any): void => {
      if (x.rules) x.rules.forEach(walk)
      else if (x.rule) walk(x.rule)
      else leaves.push(x)
    }
    walk(r)
    return leaves.find((x) => x._tag === "stage")?.stages
  }
  it("narrowing sits below `not` (no wrong 'no')", () =>
    expect(rule("No prior chemotherapy within 6 months of screening")).toEqual({
      _tag: "not",
      rule: { _tag: "narrow", rule: { _tag: "priorTherapy", category: "chemotherapy" } }
    }))
  it("'without previous systemic treatment' is negated mid-sentence", () => {
    const r: any = rule("Newly diagnosed solid cancer without previous systemic anticancer treatment")
    expect(JSON.stringify(r)).toContain('"not"')
  })
  it("'Stage III B/C or IV'", () => expect(stagesOf(rule("Stage III B/C or IV NSCLC, histologically confirmed"))).toEqual(["III", "IV"]))
  it("two separate stage mentions are united", () => expect(stagesOf(rule("Stage IIIB or IIIC non irradiable or stage IV"))).toEqual(["III", "IV"]))
  it("'primary or metastatic' gives no stage", () => expect(rule("Malignant nodule in the lung either primary or metastatic disease")._tag).toBe("other"))
  it("'No indication for local therapy of brain metastases' does not mean no brain metastases", () => {
    const r: any = rule("No indication for immediate local therapy (neurosurgery, brain radiotherapy) of brain metastases")
    expect(r).toEqual({ _tag: "not", rule: { _tag: "narrow", rule: { _tag: "flag", flag: "brainMetsAny" } } })
  })
  it("a note about how a line is counted is not a requirement", () =>
    expect(rule("Prior systemic therapy in the adjuvant setting will count as a line of therapy")._tag).toBe("other"))
  it("combination of therapies is not an either/or", () =>
    expect(rule("Prior treatment with gemcitabine in combination with immunotherapies", "exclusion")._tag).toBe("other"))
})

describe("regressions from the third audit", () => {
  it("'are not eligible' is not a requirement", () => expect(rule("Participants with EGFR activating mutations are not eligible")._tag).toBe("other"))
  it("exclusion that requires negative results is not read as a rule", () =>
    expect(rule("Participants with known EGFR and ALK alterations; documented negative results are required", "exclusion")._tag).toBe("other"))
  it("'known mutation status' is not 'mutation present'", () => expect(rule("A known EGFR activating mutation status")._tag).toBe("other"))
  it("conditional inclusion: 'Participants with known X must ...'", () =>
    expect(rule("Participants with known AGAs (eg, EGFR mutations, ALK translocations) must fulfill the following criteria")._tag).toBe("other"))
  it("'In case the tumor is positive for T790M' is conditional", () =>
    expect(rule("In case the tumor is positive for T790M mutation, prior third generation EGFR TKI is mandatory")._tag).toBe("other"))
  it("'prior to surgery' is timing, not history", () =>
    expect(rule("Pre-surgical disease evaluation including brain MRI prior to surgery")._tag).toBe("other"))
  it("lines that list other tumour types do not yield biomarker rules", () =>
    expect(rule("Locally advanced HER2-positive breast cancer, or KRAS-mutant NSCLC")._tag).toBe("other"))
  it("inclusion that requires brain metastases is left to humans", () => expect(rule("Stable brain metastases")._tag).toBe("other"))
  it("'advanced or locally advanced' includes stage IV", () => {
    const r: any = rule("Advanced or locally advanced disease")
    expect((r._tag === "narrow" ? r.rule : r).stages).toEqual(["III", "IV"])
  })
})

describe("regressions from the fourth audit", () => {
  it("Karnofsky is never read as ECOG", () => expect(rule("Karnofsky Performance Status of 70 or higher with no deterioration over the previous 2 weeks")._tag).toBe("other"))
  it("menopause definitions are not age requirements", () =>
    expect(rule("Women aged <50 years will be considered post-menopausal if amenorrheic for 12 months")._tag).toBe("other"))
  it("hyphenated named targets narrow the generic drug-class phrase", () =>
    expect(rule("Prior treatment with B7-H3 targeted therapy", "exclusion")).toEqual({ _tag: "narrow", rule: { _tag: "priorTherapy", category: "targeted" } }))
  it("no symptoms of brain disease is not 'no brain metastases'", () => {
    const r = rule("No symptoms of brain disease assessed by the oncologist")
    expect(r._tag).toBe("other")
    const r2 = rule("No neurological symptoms from brain metastases")
    expect(JSON.stringify(r2)).not.toBe(JSON.stringify({ _tag: "not", rule: { _tag: "flag", flag: "brainMetsAny" } }))
  })
})

describe("structuredCriteria", () => {
  it("builds age, sex and condition rules from registry fields", () => {
    const cs = structuredCriteria({ minAge: "18 Years", sex: "FEMALE", conditions: ["Small Cell Lung Cancer"] }, "N")
    expect(cs.map((c) => c.rule._tag)).toEqual(["age", "sex", "cancerType"])
    expect(cs[2]!.rule).toEqual({ _tag: "cancerType", types: ["sclc"] })
  })
  it("no condition rule for baskets", () => {
    const cs = structuredCriteria({ conditions: ["Small Cell Lung Cancer", "Breast Cancer"] }, "N")
    expect(cs).toHaveLength(0)
  })
})
