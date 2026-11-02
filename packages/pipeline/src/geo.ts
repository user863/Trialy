import { unzipSync, strFromU8 } from "fflate"
import { Effect } from "effect"
import { config } from "./config.js"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

export const geoBundles = (cacheDir: string, outDir: string, countries = config.geonames.countries) =>
  Effect.forEach(countries, (cc) =>
    Effect.tryPromise(async () => {
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
      const txt = strFromU8(unzipSync(new Uint8Array(buf))[`${cc}.txt`]!)
      const acc = new Map<string, { lat: number; lon: number; n: number }>()
      for (const line of txt.split("\n")) {
        const f = line.split("\t")
        const code = f[1]
        const lat = Number(f[9])
        const lon = Number(f[10])
        if (!code || !Number.isFinite(lat) || !Number.isFinite(lon)) continue
        const e = acc.get(code) ?? { lat: 0, lon: 0, n: 0 }
        e.lat += lat
        e.lon += lon
        e.n++
        acc.set(code, e)
      }
      const table: Record<string, [number, number]> = {}
      for (const [k, e] of acc) table[k] = [Math.round((e.lat / e.n) * 1e3) / 1e3, Math.round((e.lon / e.n) * 1e3) / 1e3]
      await writeFile(join(outDir, `postcodes-${cc}.json`), JSON.stringify(table))
      return Object.keys(table).length
    })
  )
