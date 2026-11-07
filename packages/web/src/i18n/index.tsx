import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { pref } from "../store"
import { shell } from "./messages/shell"
import { finder } from "./messages/finder"
import { home } from "./messages/home"
import { ui } from "./messages/ui"
import { pages } from "./messages/pages"
import { questions } from "./messages/questions"
import { app } from "./messages/app"

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" }
] as const

export type Language = (typeof LANGUAGES)[number]["code"]

const catalog = { ...shell, ...finder, ...home, ...ui, ...pages, ...questions, ...app }

export type MessageKey = keyof typeof catalog
type PluralKey<K> = K extends `${infer Base}.one` ? Base : never
export type Key = MessageKey | PluralKey<MessageKey>
export type Vars = Readonly<Record<string, string | number>>
type Tags = Readonly<Record<string, (inner: string) => ReactNode>>

const TAG = /<(\w+)>(.*?)<\/\1>/g

const lookup = (language: Language, key: string, count: number | undefined): string => {
  const entries = catalog as Record<string, { en: string; de: string }>
  const plural = count === undefined ? undefined : entries[`${key}.${new Intl.PluralRules(language).select(count)}`]
  return (plural ?? entries[key])?.[language] ?? key
}

export const translate = (language: Language, key: Key, vars?: Vars): string => {
  const text = lookup(language, key, typeof vars?.count === "number" ? vars.count : undefined)
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => String(vars?.[name] ?? whole))
}

export const richText = (text: string, tags: Tags): ReactNode[] => {
  const out: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(TAG)) {
    out.push(text.slice(last, m.index))
    out.push(<Fragment key={m.index}>{(tags[m[1]!] ?? ((inner: string) => inner))(m[2]!)}</Fragment>)
    last = m.index + m[0].length
  }
  out.push(text.slice(last))
  return out
}

export interface I18n {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: Key, vars?: Vars) => string
  rich: (key: Key, tags: Tags, vars?: Vars) => ReactNode[]
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string
  formatKm: (km: number) => string
  countryName: (name: string) => string
  tOr: (key: string, fallback: string) => string
}

const stored = (): Language => LANGUAGES.find((l) => l.code === pref.get("lang"))?.code ?? "en"

const Ctx = createContext<I18n>(null as unknown as I18n)
export const useI18n = () => useContext(Ctx)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(stored)

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const setLanguage = useCallback((next: Language) => {
    pref.set("lang", next)
    setLanguageState(next)
  }, [])

  const value = useMemo<I18n>(
    () => ({
      language,
      setLanguage,
      t: (key, vars) => translate(language, key, vars),
      rich: (key, tags, vars) => richText(translate(language, key, vars), tags),
      formatNumber: (n, options) => new Intl.NumberFormat(language, options).format(n),
      formatDate: (d, options) => {
        const date = new Date(d)
        return Number.isNaN(date.getTime()) ? String(d) : date.toLocaleDateString(language, options)
      },
      formatKm: (km) => `${new Intl.NumberFormat(language, { maximumFractionDigits: km < 10 ? 1 : 0, minimumFractionDigits: km < 10 ? 1 : 0 }).format(km)} km`,
      countryName: (name) => (`country.${name}` in catalog ? translate(language, `country.${name}` as Key) : name),
      tOr: (key, fallback) => (key in catalog ? translate(language, key as Key) : fallback)
    }),
    [language, setLanguage]
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
