import Ajv from "ajv"
import { existsSync, readFileSync } from "node:fs"
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
})
