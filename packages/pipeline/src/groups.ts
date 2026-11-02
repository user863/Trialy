export interface GroupConfig {
  readonly id: string
  readonly label: string
  readonly condQuery: string
  readonly conditionRe: RegExp
}

export const GROUPS: Record<string, GroupConfig> = {
  lung: {
    id: "lung",
    label: "Lung cancer",
    condQuery: '"lung cancer" OR NSCLC OR SCLC OR "lung neoplasms" OR "non-small cell lung"',
    conditionRe: /lung|nsclc|sclc|bronch(?:ial|ogenic)/i
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
