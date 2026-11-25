import { useMemo } from "react"
import { emptyProfile, groupTrials, matchTrial, recruitingTier, type Profile } from "@trial-finder/domain"
import { useApp, useFullTrials } from "./app"
import { config } from "./config"
import { CriteriaSections } from "./criteria"
import { useI18n } from "./i18n"
import { TierBadge, useFulfilledLine } from "./ui"

export const CONDITIONS = [
  { value: "nsclc", label: "condition.nsclc" },
  { value: "sclc", label: "condition.sclc" },
  { value: "unknown", label: "condition.unknown" },
  { value: "ms", label: "condition.ms" }
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
