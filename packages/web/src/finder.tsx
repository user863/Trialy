import { useMemo, useRef, useState, type FormEvent } from "react"
import type { Profile } from "@trial-finder/domain"
import { useApp } from "./app"
import { CONDITIONS, LivePreview } from "./home"
import { go } from "./ui"

const readCondition = (text: string): Profile["cancerType"] | null => {
  const t = text.toLowerCase()
  if (/non[\s-]?small|nsclc/.test(t)) return "nsclc"
  if (/small[\s-]?cell|sclc/.test(t)) return "sclc"
  if (/lung/.test(t)) return "unknown"
  return null
}

const EXAMPLES = CONDITIONS.slice(0, 2)

const STEPS = [
  { title: "Name your condition", text: "One search. No account, no form to fill in first." },
  { title: "Answer what you know", text: "Every question accepts “I don’t know”, and that never rules a trial out." },
  { title: "See why each trial fits", text: "Each criterion is marked fulfilled, not fulfilled or open, beside the registry’s own wording." }
]

const PRINCIPLES = [
  { title: "Unknown never excludes", text: "A trial is hidden only when one of your answers clearly fails a criterion. Gaps stay open for your doctor." },
  { title: "Recruiting first", text: "Trials with a site that says it is recruiting come first. The rest stay visible and are labelled." },
  { title: "The registry’s own words", text: "Every criterion shows the original sentence, so you can check how it was read." }
]

const FAQ = [
  ["Is this medical advice?", "No. TrialBase shows which public trials may fit what you tell it. Your treating team decides whether you qualify."],
  ["Where do my answers go?", "Nowhere. Matching runs in your browser and answers are stored only on this device. There are no accounts and no tracking, and you can delete everything at any time."],
  ["Where does the trial data come from?", "ClinicalTrials.gov, the public registry. The list is prepared in advance and downloaded once, so your searches never reach a server."],
  ["Why is a recruiting trial listed without a recruiting site?", "Registries often mark a trial as recruiting overall while no nearby site says so. We keep it, rank it lower and label it, because some are still worth asking about."],
  ["What if I do not know an answer?", "Choose “I don’t know”. The trial stays in the list and the criterion is marked open."],
  ["Which conditions and countries are covered?", "Lung cancer so far, with sites in Germany, Austria, Switzerland and their neighbours. More conditions are next."]
] as const

export function Finder() {
  const { setProfile, bundle, loadError } = useApp()
  const [text, setText] = useState("")
  const [unsupported, setUnsupported] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const stats = useMemo(() => {
    if (!bundle) return null
    const sites = bundle.trials.flatMap((t) => t.sites)
    return { trials: bundle.trials.length, countries: new Set(sites.map((s) => s.country)).size }
  }, [bundle])

  const start = (value: string) => {
    const cancerType = readCondition(value)
    setUnsupported(cancerType === null)
    if (cancerType === null) return
    setProfile((p) => ({ ...p, cancerType }))
    go("/questions")
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
    <>
      <section className="finder">
        <h1>Find a clinical trial that fits you.</h1>
        <form className="finder-bar" onSubmit={submit} role="search">
          <input
            ref={input}
            list="conditions"
            aria-label="Your condition"
            aria-invalid={unsupported}
            placeholder="Search your condition"
            autoComplete="off"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setUnsupported(false)
            }}
          />
          <datalist id="conditions">
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.label} />
            ))}
          </datalist>
          <button type="submit" className="finder-go" aria-label="Continue to questions">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="M15.5 15.5L20 20" />
            </svg>
          </button>
        </form>
        <div className="chips">
          {EXAMPLES.map((c) => (
            <button key={c.value} type="button" className="chip" onClick={() => start(c.label)}>
              {c.label}
            </button>
          ))}
        </div>
        <p className={unsupported ? "error" : "meta"} role={unsupported ? "alert" : undefined}>
          {unsupported
            ? "Only lung cancer is covered so far."
            : (loadError ?? (stats ? `${stats.trials} recruiting trials in ${stats.countries} countries · No account · Answers stay on this device` : "Loading trials…"))}
        </p>
      </section>

      <div className="page home">
        <section className="h-section" aria-labelledby="how">
          <h2 id="how" className="h-label">How it works</h2>
          <ol className="h-steps">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="h-num">{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="h-section h-split">
          <div>
            <h2>See exactly why a trial fits.</h2>
            <p className="lead">Inclusion and exclusion criteria are listed separately. What you fulfil is marked, so what is left to discuss is clear at a glance.</p>
          </div>
          <LivePreview />
        </section>

        <section className="h-section" aria-labelledby="private">
          <h2 id="private" className="h-label">Private by design</h2>
          <div className="flow">
            <div className="flow-box">
              <strong>ClinicalTrials.gov</strong>
              <span>Public trial registry</span>
            </div>
            <div className="flow-link"><span>Downloaded once</span></div>
            <div className="flow-box strong">
              <strong>Your device</strong>
              <span>Your answers, the matching and the results</span>
            </div>
            <div className="flow-link off"><span>Nothing sent back</span></div>
            <div className="flow-box dashed">
              <strong>No server</strong>
              <span>No accounts, no tracking</span>
            </div>
          </div>
        </section>

        <section className="h-section">
          <ul className="h-principles">
            {PRINCIPLES.map((p) => (
              <li key={p.title}>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="h-section h-split faq" aria-labelledby="faq">
          <h2 id="faq">Questions</h2>
          <div>
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="h-section h-close">
          <h2>See which trials fit you.</h2>
          <button type="button" className="btn primary" onClick={focusSearch}>
            Search my condition
          </button>
        </section>
      </div>
    </>
  )
}
