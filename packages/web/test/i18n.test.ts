import { describe, expect, it } from "vitest"
import { app } from "../src/i18n/messages/app"
import { finder } from "../src/i18n/messages/finder"
import { home } from "../src/i18n/messages/home"
import { pages } from "../src/i18n/messages/pages"
import { questions } from "../src/i18n/messages/questions"
import { shell } from "../src/i18n/messages/shell"
import { ui } from "../src/i18n/messages/ui"
import { richText, translate, type Key } from "../src/i18n"

const files = { app, finder, home, pages, questions, shell, ui }
const entries = Object.entries(files).flatMap(([file, m]) => Object.entries(m).map(([key, e]) => ({ file, key, ...e })))

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort()
const tags = (text: string) => [...text.matchAll(/<(\w+)>/g)].map((m) => m[1]!).sort()

describe("message catalogue", () => {
  it("has no key defined in two files", () => {
    const seen = new Set<string>()
    const clashes = entries.filter((e) => (seen.has(e.key) ? true : (seen.add(e.key), false)))
    expect(clashes.map((e) => e.key)).toEqual([])
  })

  it("has text in both languages", () => {
    expect(entries.filter((e) => e.en.trim() === "" || e.de.trim() === "").map((e) => e.key)).toEqual([])
  })

  it("uses the same placeholders in English and German", () => {
    expect(entries.filter((e) => placeholders(e.en).join() !== placeholders(e.de).join()).map((e) => e.key)).toEqual([])
  })

  it("uses no markup tag in German that English lacks", () => {
    expect(entries.filter((e) => tags(e.de).some((tag) => !tags(e.en).includes(tag))).map((e) => e.key)).toEqual([])
  })

  it("closes every tag", () => {
    const open = entries.flatMap((e) => [e.en, e.de].map((text) => ({ key: e.key, text })))
    expect(open.filter(({ text }) => tags(text).length !== [...text.matchAll(/<\/\w+>/g)].length).map((e) => e.key)).toEqual([])
  })

  it("has an .other form for every .one form", () => {
    const keys = new Set(entries.map((e) => e.key))
    expect(entries.filter((e) => e.key.endsWith(".one") && !keys.has(e.key.replace(/\.one$/, ".other"))).map((e) => e.key)).toEqual([])
  })
})

describe("translate", () => {
  it("fills placeholders", () => {
    expect(translate("en", "card.full", { max: 5 })).toBe("Shortlist full (5)")
    expect(translate("de", "card.full", { max: 5 })).toBe("Merkliste voll (5)")
  })

  it("picks the plural form from the count", () => {
    expect(translate("en", "results.total", { count: 1 })).toBe("1 trial")
    expect(translate("en", "results.total", { count: 3 })).toBe("3 trials")
    expect(translate("de", "summary.rec2", { count: 1 })).toBe("1 aufgeführtes Zentrum gibt an zu rekrutieren")
    expect(translate("de", "summary.rec2", { count: 2 })).toBe("2 aufgeführte Zentren geben an zu rekrutieren")
  })

  it("returns the key for an unknown key instead of throwing", () => {
    expect(translate("en", "does.not.exist" as Key)).toBe("does.not.exist")
  })

  it("leaves an unfilled placeholder visible", () => {
    expect(translate("en", "card.full")).toBe("Shortlist full ({max})")
  })
})

describe("richText", () => {
  it("wraps tagged parts and keeps the text around them", () => {
    const out = richText("a <b>bold</b> c", { b: (inner) => `[${inner}]` })
    expect(out.filter((part) => part !== "").map((part) => (typeof part === "object" && part && "props" in part ? (part.props as { children: string }).children : part))).toEqual(["a ", "[bold]", " c"])
  })

  it("renders an unknown tag as plain text", () => {
    const out = richText("x <u>y</u>", {})
    expect(JSON.stringify(out)).toContain("y")
    expect(JSON.stringify(out)).not.toContain("<u>")
  })
})
