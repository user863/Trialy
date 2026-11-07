import type { Profile } from "@trial-finder/domain"

export type Selection =
  | { readonly group: "lung"; readonly cancerType: Profile["cancerType"] }
  | { readonly group: "ms" }

export const readCondition = (text: string): Selection | null => {
  const t = text.toLowerCase()
  if (/multiple sclerosis|multiple sklerose|\b(?:rr|pp|sp)?ms\b/.test(t)) return { group: "ms" }
  if (/non[\s-]?small|nicht[\s-]?klein|nsclc/.test(t)) return { group: "lung", cancerType: "nsclc" }
  if (/small[\s-]?cell|klein[\s-]?zell|sclc/.test(t)) return { group: "lung", cancerType: "sclc" }
  if (/lung|lunge/.test(t)) return { group: "lung", cancerType: "unknown" }
  return null
}
