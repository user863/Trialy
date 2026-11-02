import { useMemo, useState, type FormEvent } from "react"
import { emptyProfile, matchTrial, recruitingTier, type Profile } from "@trial-finder/domain"
import { useApp } from "./app"
import { config } from "./config"
import { CriteriaSections } from "./criteria"
import { A, TierBadge, fulfilledLine, go } from "./ui"

export const CONDITIONS = [
  { value: "nsclc", label: "Non-small cell lung cancer" },
  { value: "sclc", label: "Small cell lung cancer" },
  { value: "unknown", label: "Lung cancer, type not known" }
] as const

export const STAGES = [
  { value: "I", label: "Stage I" },
  { value: "II", label: "Stage II" },
  { value: "III", label: "Stage III" },
  { value: "IV", label: "Stage IV" },
  { value: "unknown", label: "Not known" }
] as const

export const COUNTRIES = [
  { value: "DE", label: "Germany" },
  { value: "AT", label: "Austria" },
  { value: "CH", label: "Switzerland" }
] as const

const EXAMPLE_PROFILE: Profile = {
  ...emptyProfile(),
  cancerType: "nsclc",
  histology: "adenocarcinoma",
  stage: "IV",
  age: 62,
  sex: "female",
  ecog: 1,
  priorLines: 1,
  brainMets: "none",
  ild: "no",
  autoimmune: "no"
}

function ConditionSearch() {
  const { profile, setProfile, markStarted, bundle } = useApp()
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
    <form className="card search" onSubmit={submit}>
      <h2>Search by your condition</h2>
      <div className="search-fields">
        <label className="field wide">
          <span>Condition</span>
          <select value={cancerType} onChange={(e) => setCancerType(e.target.value as Profile["cancerType"])}>
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Stage</span>
          <select value={stage} onChange={(e) => setStage(e.target.value as Profile["stage"])}>
            {STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Country</span>
          <select
            value={country}
            onChange={(e) => {
              setCountry(e.target.value as Profile["country"])
              setPostcode("")
            }}
          >
            {COUNTRIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field wide">
          <span>Postcode, for distances</span>
          <input
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={config.postcodeLength[country]}
            placeholder={country === "DE" ? "10115" : "1010"}
            value={postcode}
            onChange={(e) => setPostcode(e.target.value.replace(/\D/g, ""))}
          />
        </label>
      </div>
      <div className="search-actions">
        <button type="submit" className="btn primary">
          Show matching trials
        </button>
        <A to="/questions" className="btn outline">
          Answer all questions
        </A>
      </div>
      <p className="meta">
        {bundle ? `${bundle.trials.length} recruiting lung cancer trials searched in your browser.` : "Loading trials…"} Your answers never leave this device.
      </p>
    </form>
  )
}

export function LivePreview() {
  const { trials } = useApp()
  const sample = useMemo(
    () => trials.find((t) => t.criteria.length >= 8 && t.criteria.length <= 24 && recruitingTier(t) === 2 && t.criteria.some((c) => c.rule._tag === "age")),
    [trials]
  )
  const match = useMemo(() => (sample ? matchTrial(sample, EXAMPLE_PROFILE, null) : null), [sample])

  return (
    <div className="plate" aria-hidden="true">
      <span className="blob" />
      <div className="plate-ui" inert>
        {sample && match ? (
          <>
            <div className="preview-head">
              <TierBadge tier={match.recruiting} sites={match.recruitingSites} />
              <p className="preview-title">{sample.title}</p>
              <p className="meta">{fulfilledLine(match.met, match.results.length, match.notMet)}</p>
            </div>
            <CriteriaSections results={match.results} limit={2} />
          </>
        ) : (
          <p className="meta">Loading preview…</p>
        )}
      </div>
    </div>
  )
}

const POINTS = [
  { title: "Private by design", text: "Your answers stay in this browser. There are no accounts and no tracking, and matching runs on your device." },
  { title: "Every criterion explained", text: "Inclusion and exclusion criteria are listed with the registry’s own wording. Fulfilled ones are marked, nothing is hidden." },
  { title: "Recruiting first", text: "Trials with a site that says it is recruiting come first, sorted by distance. Others stay visible, clearly labelled." }
]

export function Below() {
  return (
    <>
      <section className="section cols-2">
        <div className="section-copy">
          <h2>See exactly why a trial fits.</h2>
          <p className="lead">
            Each study lists its inclusion and exclusion criteria separately. Criteria you fulfil are marked, so you can see at a glance what is left to discuss with your doctor.
          </p>
          <A to="/results" className="btn outline">
            Browse all trials
          </A>
        </div>
        <LivePreview />
      </section>

      <section className="section cols-3">
        {POINTS.map((p) => (
          <article key={p.title} className="card">
            <h3>{p.title}</h3>
            <p>{p.text}</p>
          </article>
        ))}
      </section>

      <section className="section cols-2">
        <div>
          <h2>What this is not</h2>
          <ul className="plain-list">
            <li>It does not decide whether you qualify or recommend a trial. Your treating team decides.</li>
            <li>It does not contact trial sites for you.</li>
            <li>It does not give advice about standard treatment.</li>
          </ul>
        </div>
        <div>
          <h2>Short sessions are fine</h2>
          <p className="lead">Answers save on this device as you go. Every question can be answered “I don’t know”, and that never excludes a trial.</p>
        </div>
      </section>
    </>
  )
}

export function Landing() {
  const { loadError, started } = useApp()

  return (
    <main className="page">
      <section className="split hero">
        <div>
          <h1>Find clinical trials that fit your condition.</h1>
          <p className="lead">
            Tell us your diagnosis and see which recruiting trials in Germany and its neighbouring countries you may qualify for, criterion by criterion.
          </p>
          {started && (
            <A to="/results" className="btn outline">
              Continue with my results
            </A>
          )}
        </div>
        <ConditionSearch />
      </section>
      {loadError && <p className="error">{loadError}</p>}

      <Below />
    </main>
  )
}
