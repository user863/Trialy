import { useState, type FormEvent } from "react"
import type { Profile } from "@trial-finder/domain"
import { useApp } from "./app"
import { Below, CONDITIONS } from "./home"
import { go } from "./ui"

const readCondition = (text: string): Profile["cancerType"] | null => {
  const t = text.toLowerCase()
  if (/non[\s-]?small|nsclc/.test(t)) return "nsclc"
  if (/small[\s-]?cell|sclc/.test(t)) return "sclc"
  if (/lung/.test(t)) return "unknown"
  return null
}

export function Finder() {
  const { setProfile, bundle, loadError } = useApp()
  const [text, setText] = useState("")
  const [unsupported, setUnsupported] = useState(false)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const cancerType = readCondition(text)
    setUnsupported(cancerType === null)
    if (cancerType === null) return
    setProfile((p) => ({ ...p, cancerType }))
    go("/questions")
  }

  return (
    <>
      <section className="finder">
        <h1>Find a clinical trial</h1>
        <form className="finder-bar" onSubmit={submit} role="search">
          <input
            list="conditions"
            aria-label="Your condition"
            aria-invalid={unsupported}
            placeholder="Your condition, e.g. non-small cell lung cancer"
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
        <p className={unsupported ? "error" : "meta"} role={unsupported ? "alert" : undefined}>
          {unsupported
            ? "Only lung cancer is covered so far."
            : (loadError ?? (bundle ? `${bundle.trials.length} trials, matched on this device` : "Loading trials…"))}
        </p>
      </section>
      <div className="page">
        <Below />
      </div>
    </>
  )
}
