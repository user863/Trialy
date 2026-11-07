import { describe, expect, it } from "vitest"
import { readCondition } from "../src/conditions"

describe("readCondition", () => {
  it.each([
    ["Non-small cell lung cancer", { group: "lung", cancerType: "nsclc" }],
    ["nsclc", { group: "lung", cancerType: "nsclc" }],
    ["Nicht-kleinzelliges Lungenkarzinom", { group: "lung", cancerType: "nsclc" }],
    ["Small cell lung cancer", { group: "lung", cancerType: "sclc" }],
    ["Kleinzelliges Lungenkarzinom", { group: "lung", cancerType: "sclc" }],
    ["Lungenkrebs", { group: "lung", cancerType: "unknown" }],
    ["lung cancer", { group: "lung", cancerType: "unknown" }],
    ["Multiple sclerosis", { group: "ms" }],
    ["Multiple Sklerose", { group: "ms" }],
    ["RRMS", { group: "ms" }],
    ["MS", { group: "ms" }]
  ])("reads %s", (text, expected) => {
    expect(readCondition(text)).toEqual(expected)
  })

  it("returns null for conditions that are not covered", () => {
    expect(readCondition("melanoma")).toBeNull()
    expect(readCondition("")).toBeNull()
  })
})
