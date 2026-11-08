import { useApp } from "../app"
import { HELP_TAGS, stepsFor } from "../questions"
import { useI18n } from "../i18n"
import { A, go } from "../ui"

export function Wizard({ stepId }: { stepId?: string }) {
  const i18n = useI18n()
  const { t: tr, rich } = i18n
  const { profile, setProfile, markStarted, group } = useApp()
  const steps = stepsFor(group, profile)
  const idx = Math.max(0, stepId ? steps.findIndex((s) => s.id === stepId) : 0)
  const step = steps[idx]!
  const last = idx === steps.length - 1
  const next = () => {
    markStarted()
    go(last ? "/results" : `/questions/${steps[idx + 1]!.id}`)
  }
  return (
    <main className="page narrow">
      <p className="progress" aria-hidden="true">
        <span style={{ width: `${((idx + 1) / steps.length) * 100}%` }} />
      </p>
      <p className="meta">{tr("wizard.progress", { current: idx + 1, total: steps.length })}</p>
      <h1>{tr(step.title)}</h1>
      <details className="help">
        <summary>{tr("wizard.where")}</summary>
        <p>{rich(step.help, HELP_TAGS)}</p>
      </details>
      <form onSubmit={(e) => e.preventDefault()}>{step.body(profile, setProfile, i18n)}</form>
      <p className="wizard-bar actions">
        {idx > 0 && (
          <A to={`/questions/${steps[idx - 1]!.id}`} className="btn">
            {tr("wizard.back")}
          </A>
        )}
        <button className="btn primary" onClick={next}>
          {last ? tr("wizard.finish") : tr("wizard.next")}
        </button>
        {!last && (
          <button className="btn quiet" onClick={next}>
            {tr("wizard.skip")}
          </button>
        )}
      </p>
      <p className="meta">
        {rich("wizard.skipAhead", { link: (text) => <A to="/results">{text}</A> })}
      </p>
    </main>
  )
}
