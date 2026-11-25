import { useMemo, useState, type FormEvent } from "react"
import { useApp } from "./app"
import { readCondition } from "./conditions"
import { CONDITIONS, LivePreview } from "./home"
import { recruitingStats } from "./stats"
import { useI18n } from "./i18n"
import { go } from "./ui"

const EXAMPLES = CONDITIONS.filter((c) => c.value !== "unknown")

const FAQ = [
  ["finder.faq1.q", "finder.faq1.a"],
  ["finder.faq2.q", "finder.faq2.a"],
  ["finder.faq3.q", "finder.faq3.a"],
  ["finder.faq4.q", "finder.faq4.a"],
  ["finder.faq5.q", "finder.faq5.a"]
] as const

export function Finder() {
  const { t } = useI18n()
  const { setProfile, setGroup, bundle, loadError } = useApp()
  const [text, setText] = useState("")
  const [unsupported, setUnsupported] = useState(false)

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

  return (
    <main>
      <section className="finder">
        <h1>{t("finder.title")}</h1>
        <form className="finder-bar" onSubmit={submit} role="search">
          <input
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
        <section className="h-section h-split">
          <div>
            <h2>{t("finder.why.title")}</h2>
            <p className="lead">{t("finder.why.lead")}</p>
          </div>
          <LivePreview />
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
      </div>
    </main>
  )
}
