export interface GroupConfig {
  readonly id: string
  readonly label: string
  readonly condQuery: string
  readonly conditionRe: RegExp
  readonly reader: "lung" | "ms" | "general"
}

export const GROUPS: Record<string, GroupConfig> = {
  lung: {
    id: "lung",
    label: "Lung cancer",
    condQuery: '"lung cancer" OR NSCLC OR SCLC OR "lung neoplasms" OR "non-small cell lung"',
    conditionRe: /lung|nsclc|sclc|bronch(?:ial|ogenic)/i,
    reader: "lung"
  },
  ms: {
    id: "ms",
    label: "Multiple sclerosis",
    condQuery: '"multiple sclerosis"',
    conditionRe: /multiple sclerosis|sclerosis,\s*multiple|\b(?:RR|PP|SP)?MS\b/i,
    reader: "ms"
  }
}

export const COUNTRIES = [
  "Germany",
  "Austria",
  "Switzerland",
  "Netherlands",
  "Belgium",
  "Luxembourg",
  "France",
  "Denmark",
  "Poland",
  "Czechia"
] as const
