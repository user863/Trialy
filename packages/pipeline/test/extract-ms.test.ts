import { describe, expect, it } from "vitest"
import { classifyMs, msCriteria } from "../src/extract-ms.js"

const rule = (text: string, kind: "inclusion" | "exclusion" = "inclusion") => classifyMs(text, kind).rule
const OTHER = { _tag: "other" }
const mentions = (text: string, kind: "inclusion" | "exclusion", ...needles: string[]) => {
  const json = JSON.stringify(rule(text, kind))
  return needles.every((n) => json.includes(n))
}

describe("MS course", () => {
  it("reads a named course", () => {
    expect(rule("RRMS diagnosis according to revised McDonald 2017 criteria")).toEqual({ _tag: "msCourse", courses: ["rrms"] })
    expect(rule("Primary progressive multiple sclerosis", "exclusion")).toEqual({ _tag: "msCourse", courses: ["ppms"] })
  })

  it("keeps both courses of an elided list", () => {
    expect(rule("Secondary progressive MS or Primary progressive MS at time of inclusion", "exclusion")).toEqual({ _tag: "msCourse", courses: ["spms", "ppms"] })
  })

  it("does not read progressive multifocal leukoencephalopathy as a course", () => {
    expect(rule("Patients with neurological signs compatible with progressive multifocal leukoencephalopathy (PML)", "exclusion")).toEqual(OTHER)
  })

  it("weakens a grouped course such as relapsing MS", () => {
    expect(mentions("Diagnosis of RMS according to the 2017 McDonald diagnostic criteria", "inclusion", "narrow", "rrms", "spms")).toBe(true)
  })

  it("ignores a course named inside a sentence about something else", () => {
    expect(rule("Start of a 2nd line therapy within the two years following the CIS")).toEqual(OTHER)
  })
})

describe("EDSS", () => {
  it("reads upper, lower and between limits", () => {
    expect(rule("EDSS ≤ 5")).toEqual({ _tag: "edss", max: 5 })
    expect(rule("EDSS 2-8")).toEqual({ _tag: "edss", min: 2, max: 8 })
    expect(rule("Expanded Disability Status Scale (EDSS) score ≥ 6", "exclusion")).toEqual({ _tag: "edss", min: 6 })
  })

  it("steps strict limits by half a point", () => {
    expect(rule("EDSS \\< 6")).toEqual({ _tag: "edss", max: 5.5 })
    expect(rule("EDSS \\> 6.5", "exclusion")).toEqual({ _tag: "edss", min: 7 })
  })

  it("does not read a functional-system score or a change in EDSS as a range", () => {
    expect(rule("EDSS pyramidal system score ≥ 2.")).toEqual(OTHER)
    expect(rule("Progression of disability over 24 months defined as an increase in the EDSS score of 1 or more")).toEqual(OTHER)
  })

  it("cannot let an exclusion with extra conditions decide on its own", () => {
    expect(mentions("Patient diagnosed with MS for more than 15 years duration with an EDSS score ≤2.0 at Screening.", "exclusion", "narrow", "other")).toBe(true)
  })
})

describe("relapse", () => {
  it("reads a relapse inside the window", () => {
    expect(rule("Relapse within last 12 months", "exclusion")).toEqual({ _tag: "relapse", withinMonths: 12 })
    expect(rule("Recent relapse within the last 3 months", "exclusion")).toEqual({ _tag: "relapse", withinMonths: 3 })
  })

  it("reads relapse-free statements as the opposite", () => {
    expect(rule("No relapse within the last 6 months prior to study inclusion.")).toEqual({ _tag: "not", rule: { _tag: "relapse", withinMonths: 6 } })
    expect(rule("No clinical evidence of relapses in the past 2 years")).toEqual({ _tag: "not", rule: { _tag: "relapse", withinMonths: 24 } })
  })

  it("turns days and weeks into months", () => {
    expect(rule("Have not had a definite relapse for at least 6 weeks")).toEqual({ _tag: "not", rule: { _tag: "relapse", withinMonths: 1.38 } })
  })

  it("leaves sentences that are not about recent relapses alone", () => {
    expect(rule("Documented evidence of disability progression independent of relapse activity at any point in time over the 2 years prior to the screening visit")).toEqual(OTHER)
    expect(rule("COPD: Unresolved exacerbation or pulmonary infection within last 4 weeks.", "exclusion")).toEqual(OTHER)
    expect(rule("Patient presenting with a neurological exacerbation lasting more than 24 hours and less than 7 days")).toEqual(OTHER)
    expect(rule("more than 6 months since onset of motor relapse", "exclusion")).toEqual(OTHER)
  })

  it("leaves a sentence with two different windows", () => {
    expect(rule("The participant must have at least 1 of the following prior to screening: 1 documented relapse within the previous year OR 2 documented relapses within 24 months")).toEqual(OTHER)
  })

  it("does not take a minimum number of months for a minimum number of relapses", () => {
    expect(JSON.stringify(rule("Relapse free period ≥ 3 months"))).not.toContain("narrow")
  })
})

describe("earlier MS drugs", () => {
  it("reads a plain exclusion", () => {
    expect(rule("Previous cladribine treatment", "exclusion")).toEqual({ _tag: "msTherapy", category: "cladribine" })
  })

  it("weakens a timed exclusion so only the patient's yes can ever be unknown", () => {
    expect(mentions("Patients exposed to Ofatumumab within the 12 months prior to inclusion.", "exclusion", "narrow", "antiCd20")).toBe(true)
  })

  it("does not read inclusion sentences, which are mostly washout rules", () => {
    expect(rule("Previous treatment by fingolimod or natalizumab in the last 4 weeks;")).toEqual(OTHER)
  })

  it("does not read a drug named as a contraindication", () => {
    expect(rule("Cardiac disease that makes treatment with OCR or RTX contra-indicated as stated by the most recent SmPC", "exclusion")).toEqual(OTHER)
  })
})

describe("yes/no exclusions", () => {
  it("reads pregnancy and breastfeeding", () => {
    expect(rule("Pregnant or breastfeeding women", "exclusion")).toEqual({ _tag: "flag", flag: "pregnancy" })
    expect(rule("Pregnancy and/or lactation", "exclusion")).toEqual({ _tag: "flag", flag: "pregnancy" })
  })

  it("only reads them as exclusions", () => {
    expect(rule("Pregnant or breastfeeding women", "inclusion")).toEqual(OTHER)
  })

  it("leaves contraception and test requirements", () => {
    expect(rule("Pregnancy, breast-feeding, lack of efficient contraception for women of childbearing potential", "exclusion")).toEqual(OTHER)
    expect(rule("Negative pregnancy test", "inclusion")).toEqual(OTHER)
  })

  it("reads an MRI contraindication", () => {
    expect(rule("Contraindications to MRI", "exclusion")).toEqual({ _tag: "flag", flag: "mriUnsuitable" })
    expect(rule("Claustrophobia", "exclusion")).toEqual({ _tag: "flag", flag: "mriUnsuitable" })
  })

  it("leaves a willingness to be informed about MRI findings", () => {
    expect(rule("Unwillingness to be informed in case of unexpected MRI abnormality (with a significant medical anomaly)", "exclusion")).toEqual(OTHER)
  })

  it("reads recent steroids only inside the window the question covers", () => {
    expect(mentions("Treatment with high dose corticosteroids during the 30 days preceding the inclusion", "exclusion", "narrow", "recentSteroids")).toBe(true)
    expect(rule("Chronic treatment with corticosteroids or immunosuppressants within last 6 months", "exclusion")).toEqual(OTHER)
    expect(rule("Corticosteroids", "exclusion")).toEqual(OTHER)
  })

  it("never lets a positive finding in an infection or cancer sentence be a plain yes", () => {
    expect(mentions("HIV infection, including a positive screening test (anti-HIV 1/2, protein 24)", "exclusion", "narrow", "chronicInfection")).toBe(true)
    expect(mentions("History of a malignancy unless disease free for ≥5 years with the exception of basal or squamous cell skin cancer", "exclusion", "narrow", "cancerHistory")).toBe(true)
    expect(rule("Negative test for Hepatitis B core antibody and Hepatitis C core antibody", "inclusion")).toEqual(OTHER)
  })
})

describe("msCriteria", () => {
  const text = "Inclusion Criteria:\n* EDSS ≤ 6.5\n* Able to give informed consent\nExclusion Criteria:\n* Pregnant or breastfeeding women"
  const out = msCriteria("NCT1", text, { minAge: "18 Years", sex: "ALL", conditions: ["Multiple Sclerosis"] })

  it("keeps every sentence verbatim next to its rule", () => {
    expect(out.filter((c) => c.source === "registry-text").map((c) => c.text)).toEqual(["EDSS ≤ 6.5", "Able to give informed consent", "Pregnant or breastfeeding women"])
  })

  it("adds the registry age limit and the rules it understood", () => {
    expect(out.map((c) => c.rule._tag)).toEqual(["age", "edss", "other", "flag"])
  })
})
