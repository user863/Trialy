import { bucketOf, fullTrial, groupTrials, type Bundle, type Trial, type TrialDetail, type TrialIndex } from "@trial-finder/domain"
import { config } from "./config"

export type PostcodeTables = Record<string, Record<string, [number, number]>>

const fetchOk = async (url: string): Promise<Response> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response
}

let postcodeTables: Promise<PostcodeTables> | null = null

export const loadPostcodes = (): Promise<PostcodeTables> => {
  postcodeTables ??= fetchOk(`${config.dataUrl}/postcodes.json`).then((r) => r.json() as Promise<PostcodeTables>)
  return postcodeTables
}

export const fetchIndex = async (): Promise<{ text: string; index: TrialIndex }> => {
  const text = await (await fetchOk(`${config.dataUrl}/index.json`)).text()
  return { text, index: JSON.parse(text) as TrialIndex }
}

const detailBuckets = new Map<number, Promise<Record<string, TrialDetail>>>()

const loadBucket = (n: number): Promise<Record<string, TrialDetail>> => {
  let bucket = detailBuckets.get(n)
  if (!bucket) {
    const file = `${String(n).padStart(3, "0")}.json`
    bucket = fetchOk(`${config.dataUrl}/details/${file}`).then((r) => r.json() as Promise<Record<string, TrialDetail>>)
    bucket.catch(() => detailBuckets.delete(n))
    detailBuckets.set(n, bucket)
  }
  return bucket
}

export const loadFullTrials = async (index: TrialIndex, group: string, ids: ReadonlyArray<string>): Promise<Trial[]> => {
  const entries = ids.flatMap((id) => {
    const entry = index.trials.find((e) => e.nctId === id && e.group === group) ?? index.trials.find((e) => e.nctId === id)
    return entry ? [entry] : []
  })
  const bucketNumbers = [...new Set(entries.map((e) => bucketOf(e.nctId, index.bucketCount)))]
  const buckets = new Map(await Promise.all(bucketNumbers.map(async (n) => [n, await loadBucket(n)] as const)))
  return entries.flatMap((entry) => {
    const detail = buckets.get(bucketOf(entry.nctId, index.bucketCount))?.[entry.nctId]
    return detail ? [fullTrial(index, entry, detail)] : []
  })
}

export const bundleOf = (index: TrialIndex | null, group: string): Bundle | null => {
  const g = index?.groups.find((x) => x.id === group)
  if (!index || !g) return null
  return { group: g.id, groupLabel: g.label, version: g.version, generatedAt: g.generatedAt, source: g.source, trials: groupTrials(index, g.id), changes: g.changes }
}
