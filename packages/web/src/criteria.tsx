import type { CriterionResult, EvalNode, Status } from "@trial-finder/domain"

const STATUS_LABEL: Record<Status, string> = { met: "Fulfilled", notMet: "Not fulfilled", unknown: "Open" }
const STATUS_ORDER: Record<Status, number> = { met: 0, notMet: 1, unknown: 2 }

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

const answeredLines = (node: EvalNode): string[] => {
  if (node.children) return node.children.flatMap(answeredLines)
  return node.result !== "unknown" && node.answer ? [capitalise(node.answer)] : []
}

function Marker({ status }: { status: Status }) {
  return (
    <span className={`marker ${status}`}>
      <span className="sr">{STATUS_LABEL[status]}</span>
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

const SECTIONS = [
  { kind: "inclusion", title: "Inclusion criteria", note: "You need to meet these." },
  { kind: "exclusion", title: "Exclusion criteria", note: "Fulfilled means the exclusion does not apply to you." }
] as const

export function CriteriaSections({ results, limit }: { results: ReadonlyArray<CriterionResult>; limit?: number }) {
  return (
    <div className="criteria-sections">
      {SECTIONS.map(({ kind, title, note }) => {
        const rows = results.filter((r) => r.criterion.kind === kind)
        if (rows.length === 0) return null
        const fulfilled = rows.filter((r) => r.status === "met").length
        const ordered = [...rows].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]).slice(0, limit)
        return (
          <section key={kind} className="criteria-section">
            <header>
              <h3>{title}</h3>
              <p className="meta">
                {fulfilled} of {rows.length} fulfilled
              </p>
            </header>
            <p className="meta">{note}</p>
            <ul className="criteria">
              {ordered.map((r) => {
                const lines = answeredLines(r.node)
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
