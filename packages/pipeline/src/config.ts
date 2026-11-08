import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))

const int = (name: string, fallback: number) => {
  const raw = process.env[name]
  if (raw === undefined) return fallback
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 0) throw new Error(`${name} must be a non-negative integer, got "${raw}"`)
  return n
}

export const config = {
  ctgov: {
    baseUrl: process.env.CTGOV_BASE_URL ?? "https://clinicaltrials.gov/api/v2/studies",
    pageSize: int("CTGOV_PAGE_SIZE", 100),
    pageDelayMs: int("CTGOV_PAGE_DELAY_MS", 300),
    retries: int("CTGOV_RETRIES", 4),
    retryBaseMs: int("CTGOV_RETRY_BASE_MS", 600)
  },
  geonames: {
    baseUrl: process.env.GEONAMES_URL ?? "https://download.geonames.org/export/zip",
    countries: (process.env.GEO_COUNTRIES ?? "DE,AT,CH,NL,BE,LU,FR,DK,PL,CZ").split(",")
  },
  paths: {
    cacheDir: join(here, "../.cache"),
    defaultOut: join(here, "../../web/public/data")
  }
} as const
