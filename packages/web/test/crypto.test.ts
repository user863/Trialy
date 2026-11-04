import { afterEach, describe, expect, it, vi } from "vitest"
import { decryptJson, encryptJson } from "../src/crypto"

const profile = { profile: { age: 62 }, shortlist: ["NCT00000001"] }

afterEach(() => vi.unstubAllGlobals())

describe("encrypted export", () => {
  it("opens again with the same passphrase", async () => {
    const file = await encryptJson(profile, "correct horse")
    expect(file.ok).toBe(true)
    if (!file.ok) return
    expect(await decryptJson(file.value, "correct horse")).toEqual({ ok: true, value: profile })
  })

  it("refuses a wrong passphrase", async () => {
    const file = await encryptJson(profile, "correct horse")
    if (!file.ok) throw new Error("encryption failed")
    expect(await decryptJson(file.value, "battery staple")).toEqual({ ok: false, error: "wrong-passphrase" })
  })

  it("refuses files from other apps", async () => {
    const other = JSON.stringify({ app: "something-else", salt: "a", iv: "b", data: "c" })
    expect(await decryptJson(other, "pw")).toEqual({ ok: false, error: "not-trialbase" })
    expect(await decryptJson("[1,2]", "pw")).toEqual({ ok: false, error: "not-trialbase" })
  })

  it("calls broken files damaged", async () => {
    expect(await decryptJson("not json", "pw")).toEqual({ ok: false, error: "damaged" })
    expect(await decryptJson(JSON.stringify({ app: "trialbase", salt: "a" }), "pw")).toEqual({ ok: false, error: "damaged" })
    expect(await decryptJson(JSON.stringify({ app: "trialbase", salt: "%%", iv: "%%", data: "%%" }), "pw")).toEqual({ ok: false, error: "damaged" })
  })

  it("says so when the browser has no web crypto", async () => {
    vi.stubGlobal("crypto", {})
    expect(await encryptJson(profile, "pw")).toEqual({ ok: false, error: "unsupported" })
    expect(await decryptJson("{}", "pw")).toEqual({ ok: false, error: "unsupported" })
  })
})
