import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { normalise } from "../src/ctgov.js"
import { GROUPS, type GroupConfig } from "../src/groups.js"

const study = {
  protocolSection: {
    identificationModule: {
      nctId: "NCT00000042",
      briefTitle: "A study of drug X in NSCLC",
      officialTitle: "Official title of the drug X study",
      secondaryIdInfos: [{ id: "2023-501234-12-00" }, { id: "2019-001234-56" }, { id: "DRKS00012345" }, { id: "internal-7" }]
    },
    statusModule: {
      overallStatus: "RECRUITING",
      statusVerifiedDate: "2026-09",
      lastUpdatePostDateStruct: { date: "2026-09-30" }
    },
    descriptionModule: { briefSummary: "Short summary." },
    conditionsModule: { conditions: ["Non-small Cell Lung Cancer"] },
    designModule: {
      phases: ["PHASE1", "PHASE2"],
      designInfo: { allocation: "RANDOMIZED", interventionModel: "PARALLEL", maskingInfo: { masking: "NONE" } }
    },
    armsInterventionsModule: {
      armGroups: [{ label: "Experimental" }, { label: "" }, {}],
      interventions: [{ type: "DRUG", name: "Drug X" }, {}]
    },
    eligibilityModule: {
      eligibilityCriteria: "Inclusion Criteria:\n* Adults with NSCLC\n\nExclusion Criteria:\n* Pregnant women",
      sex: "ALL",
      minimumAge: "18 Years",
      maximumAge: "75 Years"
    },
    contactsLocationsModule: {
      centralContacts: [{ name: "Study Desk", email: "desk@example.org" }],
      locations: [
        {
          facility: "Charité",
          status: "RECRUITING",
          city: "Berlin",
          zip: " 10117 ",
          country: "Germany",
          geoPoint: { lat: 52.52, lon: 13.38 },
          contacts: [{ name: " Dr. A ", email: "a@example.org", phone: "" }]
        },
        { city: "Vienna", country: "Austria" },
        { facility: "Mayo", city: "Rochester", country: "United States", geoPoint: { lat: 44, lon: -92 } }
      ]
    }
  }
}

const run = (raw: unknown[], group: GroupConfig = GROUPS.lung!) => Effect.runPromise(normalise(raw, group))

describe("normalise", () => {
  it("turns a registry study into a trial", async () => {
    const [trial] = await run([study])
    expect(trial).toMatchObject({
      nctId: "NCT00000042",
      title: "A study of drug X in NSCLC",
      officialTitle: "Official title of the drug X study",
      briefSummary: "Short summary.",
      status: "RECRUITING",
      phases: ["PHASE1", "PHASE2"],
      conditions: ["Non-small Cell Lung Cancer"],
      interventions: [{ type: "DRUG", name: "Drug X" }, { type: "OTHER", name: "" }],
      armLabels: ["Experimental"],
      design: { allocation: "RANDOMIZED", model: "PARALLEL", masking: "NONE" },
      lastUpdated: "2026-09-30",
      statusVerified: "2026-09",
      centralContact: { name: "Study Desk", email: "desk@example.org" },
      otherIds: { euCt: ["2023-501234-12-00"], eudraCt: ["2019-001234-56"], drks: ["DRKS00012345"] }
    })
  })

  it("keeps only covered countries and tidies site fields", async () => {
    const [trial] = await run([study])
    expect(trial!.sites).toEqual([
      { facility: "Charité", city: "Berlin", country: "Germany", zip: "10117", status: "RECRUITING", lat: 52.52, lon: 13.38, contactName: "Dr. A", contactEmail: "a@example.org" },
      { facility: "Site", city: "Vienna", country: "Austria" }
    ])
  })

  it("keeps every country for a worldwide group", async () => {
    const world: GroupConfig = { ...GROUPS.lung!, countries: "world" }
    const [trial] = await run([study], world)
    expect(trial!.sites.map((s) => s.country)).toEqual(["Germany", "Austria", "United States"])
  })

  it("drops studies of another condition and studies without a covered site", async () => {
    const other = { protocolSection: { ...study.protocolSection, conditionsModule: { conditions: ["Asthma"] }, identificationModule: { nctId: "NCT00000043", briefTitle: "Asthma" } } }
    const abroad = {
      protocolSection: {
        ...study.protocolSection,
        identificationModule: { nctId: "NCT00000044", briefTitle: "Lung cancer abroad" },
        contactsLocationsModule: { locations: [{ city: "Rochester", country: "United States" }] }
      }
    }
    expect(await run([other, abroad])).toEqual([])
  })

  it("skips records it cannot decode", async () => {
    expect(await run([{ nope: true }])).toEqual([])
  })

  it("reads the age limits and criteria text with the group's reader", async () => {
    const [trial] = await run([study])
    expect(trial!.criteria.some((c) => c.source === "registry-field" && c.rule._tag === "age")).toBe(true)
    expect(trial!.criteria.filter((c) => c.source === "registry-text").map((c) => c.text)).toEqual(["Adults with NSCLC", "Pregnant women"])
  })
})
