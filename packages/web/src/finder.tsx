import { useMemo, useRef, useState, type FormEvent } from "react"
import { useApp } from "./app"
import { readCondition } from "./conditions"
import { CONDITIONS, LivePreview } from "./home"
import { SiteMap } from "./sitemap"
import { recruitingStats } from "./stats"
import { useI18n } from "./i18n"
import { go } from "./ui"

const EXAMPLES = CONDITIONS.filter((c) => c.value !== "unknown")

const STEPS = [
  { title: "finder.step1.title", text: "finder.step1.text" },
  { title: "finder.step2.title", text: "finder.step2.text" },
  { title: "finder.step3.title", text: "finder.step3.text" }
] as const

const PRINCIPLES = [
  { title: "finder.principle1.title", text: "finder.principle1.text" },
  { title: "finder.principle2.title", text: "finder.principle2.text" },
  { title: "finder.principle3.title", text: "finder.principle3.text" }
] as const

const FAQ = [
  ["finder.faq1.q", "finder.faq1.a"],
  ["finder.faq2.q", "finder.faq2.a"],
  ["finder.faq3.q", "finder.faq3.a"],
  ["finder.faq4.q", "finder.faq4.a"],
  ["finder.faq5.q", "finder.faq5.a"],
  ["finder.faq6.q", "finder.faq6.a"]
] as const

export function Finder() {
  const { t } = useI18n()
  const { setProfile, setGroup, bundle, loadError } = useApp()
  const [text, setText] = useState("")
  const [unsupported, setUnsupported] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const stats = useMemo(() => (bundle ? recruitingStats(bundle.trials) : null), [bundle])

  const start = (value: string) => {
    const selection = readCondition(value)
    setUnsupported(selection === null)
    if (selection === null) return
    setGroup(selection.group)
    if (selection.group === "lung") setProfile((p) => ({ ...p, cancerType: selection.cancerType }))
    go(selection.group === "lung" ? "/questions/type" : "/questions/person")
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    start(text)
  }

  const focusSearch = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
    input.current?.focus({ preventScroll: true })
  }

  return (
    <main>
      <section className="finder">
        <h1>{t("finder.title")}</h1>
        <form className="finder-bar" onSubmit={submit} role="search">
          <input
            ref={input}
            list="conditions"
            aria-label={t("finder.conditionLabel")}
            aria-invalid={unsupported}
            placeholder={t("finder.placeholder")}
            autoComplete="off"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setUnsupported(false)
            }}
          />
          <datalist id="conditions">
            {CONDITIONS.map((c) => (
              <option key={c.value} value={t(c.label)} />
            ))}
          </datalist>
          <button type="submit" className="finder-go" aria-label={t("finder.go")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="M15.5 15.5L20 20" />
            </svg>
          </button>
        </form>
        <div className="chips">
          {EXAMPLES.map((c) => (
            <button key={c.value} type="button" className="chip" onClick={() => start(t(c.label))}>
              {t(c.label)}
            </button>
          ))}
        </div>
        <p className={unsupported ? "error" : "meta"} role={unsupported ? "alert" : undefined}>
          {unsupported
            ? t("finder.unsupported")
            : (loadError ?? (stats ? t("finder.stats", { count: stats.trials, countries: stats.countries }) : t("finder.loadingTrials")))}
        </p>
      </section>

      <div className="page home">
        <section className="h-section" aria-labelledby="how">
          <h2 id="how" className="h-label">{t("finder.how")}</h2>
          <ol className="h-steps">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="h-num">{i + 1}</span>
                <h3>{t(s.title)}</h3>
                <p>{t(s.text)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="h-section h-split">
          <div>
            <h2>{t("finder.why.title")}</h2>
            <p className="lead">{t("finder.why.lead")}</p>
          </div>
          <LivePreview />
        </section>

        <section className="h-section">
          <SiteMap trials={bundle?.trials} />
        </section>

        <section className="h-section">
          <ul className="h-principles">
            {PRINCIPLES.map((p) => (
              <li key={p.title}>
                <h3>{t(p.title)}</h3>
                <p>{t(p.text)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="h-section h-split faq" aria-labelledby="faq">
          <h2 id="faq">{t("finder.faq")}</h2>
          <div>
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>{t(q)}</summary>
                <p>{t(a)}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="h-section h-close">
          <h2>{t("finder.close.title")}</h2>
          <button type="button" className="btn primary" onClick={focusSearch}>
            {t("finder.close.button")}
          </button>
        </section>
      </div>
    </main>
  )
}
