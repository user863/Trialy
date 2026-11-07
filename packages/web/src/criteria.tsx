import type { Answer, CriterionResult, EvalNode, Status } from "@trial-finder/domain"
import { useI18n, type I18n } from "./i18n"

const STATUS_ORDER: Record<Status, number> = { met: 0, notMet: 1, unknown: 2 }

const sayAnswer = ({ t, tOr }: I18n, a: Answer): string | null => {
  switch (a.kind) {
    case "none":
    case "unanswered":
    case "manual":
      return null
    case "cancerType":
      return t("said.cancerType", { cancer: [t(`condition.${a.cancer}`), ...(a.histology ? [t(`histology.${a.histology}`)] : [])].join(", ") })
    case "extent":
      return t("said.extent", { extent: t(`profile.extent.${a.extent}`) })
    case "stage":
      return t("said.stage", { stage: a.stage })
    case "biomarker":
      return t(a.state === "positive" ? "said.gene.positive" : "said.gene.negative", { gene: a.gene })
    case "pdl1":
      return t(`said.pdl1.${a.level}`)
    case "yesNo":
      return t("said.yesNo", { value: t(`value.${a.value}`) })
    case "priorLines":
      return t("said.lines", { count: a.lines })
    case "currentTherapy":
      return a.therapy === "none" ? t("said.current.none") : t("said.current", { therapy: tOr(`therapy.${a.therapy}`, a.therapy) })
    case "lab":
      return t("said.lab", { value: a.value })
    case "age":
      return t("said.age", { years: a.years })
    case "sex":
      return t("said.sex", { sex: tOr(`value.${a.sex}`, a.sex) })
    case "ecog":
      return t("said.ecog", { ecog: a.ecog })
    case "brainMets":
      return t(`said.brain.${a.state}`)
    case "msCourse":
      return t(`said.course.${a.course}`)
    case "edss":
      return t("said.edss", { value: a.value })
    case "relapse":
      return t(`said.relapse.${a.age}`)
  }
}

const answeredLines = (i18n: I18n, node: EvalNode): string[] => {
  if (node.children) return node.children.flatMap((child) => answeredLines(i18n, child))
  const line = node.result !== "unknown" ? sayAnswer(i18n, node.answer) : null
  return line ? [line] : []
}

function Marker({ status }: { status: Status }) {
  const { t } = useI18n()
  return (
    <span className={`marker ${status}`}>
      <span className="sr">{t(`status.${status}`)}</span>
      {status === "met" && (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3.5 8.5l3 3 6-7" />
        </svg>
      )}
      {status === "notMet" && (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
        </svg>
      )}
    </span>
  )
}

const SECTIONS = ["inclusion", "exclusion"] as const

export function CriteriaSections({ results, limit }: { results: ReadonlyArray<CriterionResult>; limit?: number }) {
  const i18n = useI18n()
  const { t } = i18n
  return (
    <div className="criteria-sections">
      {SECTIONS.map((kind) => {
        const rows = results.filter((r) => r.criterion.kind === kind)
        if (rows.length === 0) return null
        const fulfilled = rows.filter((r) => r.status === "met").length
        const ordered = [...rows].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]).slice(0, limit)
        return (
          <section key={kind} className="criteria-section">
            <header>
              <h3>{t(`criteria.${kind}`)}</h3>
              <p className="meta">{t("criteria.count", { fulfilled, total: rows.length })}</p>
            </header>
            <p className="meta">{t(`criteria.${kind}.note`)}</p>
            <ul className="criteria">
              {ordered.map((r) => {
                const lines = answeredLines(i18n, r.node)
                return (
                  <li key={r.criterion.id} className={`criterion ${r.status}`}>
                    <Marker status={r.status} />
                    <div>
                      <p className="criterion-text">{r.criterion.text}</p>
                      {lines.length > 0 && <p className="meta">{lines.join(" · ")}</p>}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
