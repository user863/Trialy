import { unzipSync, strFromU8 } from "fflate"
import { Effect } from "effect"
import { config } from "./config.js"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

export type PostcodeTable = Record<string, [number, number]>

export const POSTCODE_LENGTH: Record<string, number> = { DE: 5, AT: 4, CH: 4, NL: 4, BE: 4, LU: 4, FR: 5, DK: 4, PL: 5, CZ: 5 }

export const postcodeKey = (raw: string, length: number): string => {
  const digits = raw.replace(/\D/g, "")
  return digits.length >= length ? digits.slice(0, length) : ""
}

export const parsePostcodes = (cc: string, text: string): PostcodeTable => {
  const length = POSTCODE_LENGTH[cc]
  if (length === undefined) throw new Error(`no postcode length known for ${cc}`)
  const acc = new Map<string, { lat: number; lon: number; n: number }>()
  for (const line of text.split("\n")) {
    const f = line.split("\t")
    const code = postcodeKey(f[1] ?? "", length)
    const lat = Number(f[9])
    const lon = Number(f[10])
    if (!code || !Number.isFinite(lat) || !Number.isFinite(lon)) continue
    const e = acc.get(code) ?? { lat: 0, lon: 0, n: 0 }
    e.lat += lat
    e.lon += lon
    e.n++
    acc.set(code, e)
  }
  const table: PostcodeTable = {}
  for (const [k, e] of [...acc].sort(([a], [b]) => a.localeCompare(b))) table[k] = [Math.round((e.lat / e.n) * 1e3) / 1e3, Math.round((e.lon / e.n) * 1e3) / 1e3]
  return table
}

const loadZip = async (cacheDir: string, cc: string): Promise<string> => {
  await mkdir(cacheDir, { recursive: true })
  const zipPath = join(cacheDir, `${cc}.zip`)
  let buf: Buffer
  try {
    buf = await readFile(zipPath)
  } catch {
    const r = await fetch(`${config.geonames.baseUrl}/${cc}.zip`)
    if (!r.ok) throw new Error(`GeoNames ${cc}: HTTP ${r.status}`)
    buf = Buffer.from(await r.arrayBuffer())
    await writeFile(zipPath, buf)
  }
  return strFromU8(unzipSync(new Uint8Array(buf))[`${cc}.txt`]!)
}

export const postcodeBundle = (cacheDir: string, outDir: string, countries = config.geonames.countries) =>
  Effect.tryPromise(async () => {
    const tables: Record<string, PostcodeTable> = {}
    for (const cc of countries) tables[cc] = parsePostcodes(cc, await loadZip(cacheDir, cc))
    await writeFile(join(outDir, "postcodes.json"), JSON.stringify(tables))
    return Object.fromEntries(Object.entries(tables).map(([cc, t]) => [cc, Object.keys(t).length]))
  })
