import Ajv from "ajv"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { emptyProfile } from "../src/index.js"

const read = (path: string) => JSON.parse(readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8"))
const ajv = new Ajv({ strict: false })
const bundlePaths = ["lung", "ms"].map((group) => ({ group, url: new URL(`../../web/public/data/${group}.json`, import.meta.url) }))

describe("published JSON Schema", () => {
  it("accepts an empty profile", () => {
    const validate = ajv.compile(read("../schema/profile.schema.json"))
    expect(validate(emptyProfile()), JSON.stringify(validate.errors)).toBe(true)
  })

  it("rejects a profile with an unknown cancer type", () => {
    const validate = ajv.compile(read("../schema/profile.schema.json"))
    expect(validate({ ...emptyProfile(), cancerType: "melanoma" })).toBe(false)
  })

  it("rejects unknown rule types", () => {
    const validate = ajv.compile(read("../schema/rule.schema.json"))
    expect(validate({ _tag: "magic" })).toBe(false)
    expect(validate({ _tag: "narrow", rule: { _tag: "other" } })).toBe(true)
  })

  it.each(bundlePaths)("accepts the published $group bundle", ({ url }) => {
    if (!existsSync(url)) return
    const validate = ajv.compile(read("../schema/bundle.schema.json"))
    expect(validate(JSON.parse(readFileSync(url, "utf8"))), JSON.stringify(validate.errors?.slice(0, 3))).toBe(true)
  })

  it("accepts the published index and detail buckets", () => {
    const dir = fileURLToPath(new URL("../../web/public/data/", import.meta.url))
    if (!existsSync(`${dir}index.json`)) return
    const validateIndex = ajv.compile(read("../schema/index.schema.json"))
    expect(validateIndex(JSON.parse(readFileSync(`${dir}index.json`, "utf8"))), JSON.stringify(validateIndex.errors?.slice(0, 3))).toBe(true)
    const validateDetails = ajv.compile(read("../schema/details.schema.json"))
    for (const f of readdirSync(`${dir}details`)) expect(validateDetails(JSON.parse(readFileSync(`${dir}details/${f}`, "utf8"))), f).toBe(true)
  })
})
