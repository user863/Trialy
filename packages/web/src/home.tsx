import { useMemo, useState, type FormEvent } from "react"
import { emptyProfile, groupTrials, matchTrial, recruitingTier, type Profile } from "@trial-finder/domain"
import { useApp, useFullTrials } from "./app"
import { config } from "./config"
import { CriteriaSections } from "./criteria"
import { useI18n } from "./i18n"
import { recruitingStats } from "./stats"
import { A, TierBadge, go, useFulfilledLine } from "./ui"

export const CONDITIONS = [
  { value: "nsclc", label: "condition.nsclc" },
  { value: "sclc", label: "condition.sclc" },
  { value: "unknown", label: "condition.unknown" },
  { value: "ms", label: "condition.ms" }
] as const

export const STAGES = [
  { value: "I", label: "stage.I" },
  { value: "II", label: "stage.II" },
  { value: "III", label: "stage.III" },
  { value: "IV", label: "stage.IV" },
  { value: "unknown", label: "stage.unknown" }
] as const

export const COUNTRIES = [
  { value: "DE", label: "country.Germany" },
  { value: "AT", label: "country.Austria" },
  { value: "CH", label: "country.Switzerland" }
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
  const { t } = useI18n()
  const { profile, setProfile, markStarted, bundle, group, setGroup } = useApp()
  const [condition, setCondition] = useState<string>(group === "lung" ? profile.cancerType : group)
  const [stage, setStage] = useState(profile.stage)
  const [country, setCountry] = useState(profile.country)
  const [postcode, setPostcode] = useState(profile.postcode)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (condition === "ms") {
      setGroup("ms")
      setProfile((p) => ({ ...p, country, postcode }))
    } else {
      setGroup("lung")
      setProfile((p) => ({ ...p, cancerType: condition as Profile["cancerType"], stage, country, postcode }))
    }
    markStarted()
    go("/results")
  }

  return (
    <form className="card search" onSubmit={submit}>
      <h2>{t("search.title")}</h2>
      <div className="search-fields">
        <label className="field wide">
          <span>{t("search.condition")}</span>
          <select value={condition} onChange={(e) => setCondition(e.target.value)}>
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {t(c.label)}
              </option>
            ))}
          </select>
        </label>
        {condition !== "ms" && <label className="field">
          <span>{t("search.stage")}</span>
          <select value={stage} onChange={(e) => setStage(e.target.value as Profile["stage"])}>
            {STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {t(s.label)}
              </option>
            ))}
          </select>
        </label>}
        <label className="field">
          <span>{t("search.country")}</span>
          <select
            value={country}
            onChange={(e) => {
              setCountry(e.target.value as Profile["country"])
              setPostcode("")
            }}
          >
            {COUNTRIES.map((c) => (
              <option key={c.value} value={c.value}>
                {t(c.label)}
              </option>
            ))}
          </select>
        </label>
        <label className="field wide">
          <span>{t("search.postcode")}</span>
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
          {t("search.show")}
        </button>
        <A to="/questions" className="btn outline">
          {t("search.all")}
        </A>
      </div>
      <p className="meta">{bundle ? t("search.note", { count: recruitingStats(bundle.trials).trials }) : t("finder.loadingTrials")}</p>
    </form>
  )
}

export function LivePreview() {
  const { t } = useI18n()
  const fulfilledLine = useFulfilledLine()
  const { index } = useApp()
  const trials = useMemo(() => (index ? groupTrials(index, config.group) : []), [index])
  const pick = useMemo(
    () => trials.find((t) => t.criteria.length >= 8 && t.criteria.length <= 24 && recruitingTier(t) === 2 && t.criteria.some((c) => c.rule._tag === "age")),
    [trials]
  )
  const ids = useMemo(() => (pick ? [pick.nctId] : []), [pick])
  const sample = useFullTrials(ids).trials[0]
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
          <p className="meta">{t("preview.loading")}</p>
        )}
      </div>
    </div>
  )
}

const POINTS = [
  { title: "home.point1.title", text: "home.point1.text" },
  { title: "home.point2.title", text: "home.point2.text" },
  { title: "home.point3.title", text: "home.point3.text" }
] as const

export function Below() {
  const { t } = useI18n()
  return (
    <>
      <section className="section cols-2">
        <div className="section-copy">
          <h2>{t("home.why.title")}</h2>
          <p className="lead">{t("home.why.lead")}</p>
          <A to="/results" className="btn outline">
            {t("home.browse")}
          </A>
        </div>
        <LivePreview />
      </section>

      <section className="section cols-3">
        {POINTS.map((p) => (
          <article key={p.title} className="card">
            <h3>{t(p.title)}</h3>
            <p>{t(p.text)}</p>
          </article>
        ))}
      </section>

      <section className="section cols-2">
        <div>
          <h2>{t("home.not.title")}</h2>
          <ul className="plain-list">
            <li>{t("home.not1")}</li>
            <li>{t("home.not2")}</li>
            <li>{t("home.not3")}</li>
          </ul>
        </div>
        <div>
          <h2>{t("home.short.title")}</h2>
          <p className="lead">{t("home.short.text")}</p>
        </div>
      </section>
    </>
  )
}

export function Landing() {
  const { t } = useI18n()
  const { loadError, started } = useApp()

  return (
    <main className="page">
      <section className="split hero">
        <div>
          <h1>{t("home.hero.title")}</h1>
          <p className="lead">{t("home.hero.lead")}</p>
          {started && (
            <A to="/results" className="btn outline">
              {t("home.continue")}
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
