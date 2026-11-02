import { useState, type FormEvent, type ReactNode } from "react"
import type { Profile } from "@trial-finder/domain"
import { useApp } from "./app"
import { config } from "./config"
import { COUNTRIES, CONDITIONS, STAGES } from "./home"
import { go } from "./ui"

type Option = { value: string; label: string }

function Segment({ label, children, grow }: { label: string; children: ReactNode; grow?: boolean }) {
  return (
    <label className={`segment${grow ? " grow" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  )
}

const Options = ({ options }: { options: readonly Option[] }) => (
  <>
    {options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </>
)

export function Finder() {
  const { profile, setProfile, markStarted, bundle, loadError } = useApp()
  const [cancerType, setCancerType] = useState(profile.cancerType)
  const [stage, setStage] = useState(profile.stage)
  const [country, setCountry] = useState(profile.country)
  const [postcode, setPostcode] = useState(profile.postcode)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setProfile((p) => ({ ...p, cancerType, stage, country, postcode }))
    markStarted()
    go("/results")
  }

  return (
    <main className="finder">
      <h1>Find a clinical trial</h1>
      <form className="finder-bar" onSubmit={submit}>
        <Segment label="Condition" grow>
          <select value={cancerType} onChange={(e) => setCancerType(e.target.value as Profile["cancerType"])}>
            <Options options={CONDITIONS} />
          </select>
        </Segment>
        <Segment label="Stage">
          <select value={stage} onChange={(e) => setStage(e.target.value as Profile["stage"])}>
            <Options options={STAGES} />
          </select>
        </Segment>
        <Segment label="Country">
          <select
            value={country}
            onChange={(e) => {
              setCountry(e.target.value as Profile["country"])
              setPostcode("")
            }}
          >
            <Options options={COUNTRIES} />
          </select>
        </Segment>
        <Segment label="Postcode">
          <input
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={config.postcodeLength[country]}
            placeholder={country === "DE" ? "10115" : "1010"}
            value={postcode}
            onChange={(e) => setPostcode(e.target.value.replace(/\D/g, ""))}
          />
        </Segment>
        <button type="submit" className="finder-go" aria-label="Show matching trials">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="M15.5 15.5L20 20" />
          </svg>
          <span>Show trials</span>
        </button>
      </form>
      <p className="meta">{loadError ?? (bundle ? `${bundle.trials.length} trials, matched on this device` : "Loading trials…")}</p>
    </main>
  )
}
