import { useEffect, useMemo, useState } from "react"
import { loadPostcodes, useApp } from "./app"

const MAP = {
  country: "Germany",
  lonMin: 5.8,
  lonMax: 15.2,
  latMax: 55.1,
  latMin: 47.2,
  cellDeg: 0.2,
  centreLat: 51,
  pinGroupDeg: 0.25
} as const

const aspect = Math.cos((MAP.centreLat * Math.PI) / 180)
const COLS = Math.ceil((MAP.lonMax - MAP.lonMin) / MAP.cellDeg)
const ROWS = Math.ceil((MAP.latMax - MAP.latMin) / (MAP.cellDeg * aspect))

const toCell = (lat: number, lon: number) => ({
  x: (lon - MAP.lonMin) / MAP.cellDeg,
  y: (MAP.latMax - lat) / (MAP.cellDeg * aspect)
})

type Pin = { x: number; y: number; facility: string; city: string; trials: number }

const PIN_PATH = "M0 0C-6 -8 -9 -12 -9 -16A9 9 0 1 1 9 -16C9 -12 6 -8 0 0Z"

export function SiteMap() {
  const { trials } = useApp()
  const [land, setLand] = useState<ReadonlySet<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    loadPostcodes("DE")
      .then((table: Record<string, [number, number]>) => {
        if (cancelled) return
        const cells = new Set<string>()
        for (const [lat, lon] of Object.values(table)) {
          const { x, y } = toCell(lat, lon)
          cells.add(`${Math.floor(x)},${Math.floor(y)}`)
        }
        setLand(cells)
      })
      .catch(() => setLand(new Set()))
    return () => {
      cancelled = true
    }
  }, [])

  const pins = useMemo<Pin[]>(() => {
    const groups = new Map<string, { lat: number; lon: number; facility: string; city: string; ids: Set<string> }>()
    for (const t of trials) {
      for (const s of t.sites) {
        if (s.country !== MAP.country || s.status !== "RECRUITING" || s.lat == null || s.lon == null) continue
        const key = `${Math.round(s.lat / MAP.pinGroupDeg)},${Math.round(s.lon / MAP.pinGroupDeg)}`
        const g = groups.get(key) ?? { lat: s.lat, lon: s.lon, facility: s.facility, city: s.city, ids: new Set<string>() }
        g.ids.add(t.nctId)
        groups.set(key, g)
      }
    }
    return [...groups.values()].map((g) => ({ ...toCell(g.lat, g.lon), facility: g.facility, city: g.city, trials: g.ids.size }))
  }, [trials])

  const featured = useMemo(() => pins.reduce<Pin | null>((best, p) => (!best || p.trials > best.trials ? p : best), null), [pins])

  return (
    <div className="plate map-plate" role="img" aria-label={`Map of Germany with ${pins.length} locations that have recruiting sites`}>
      <svg viewBox={`0 0 ${COLS} ${ROWS}`} className="map-svg" aria-hidden="true">
        <g className="map-land">
          {[...land].map((key) => {
            const [x, y] = key.split(",").map(Number)
            return <circle key={key} cx={x! + 0.5} cy={y! + 0.5} r={0.34} />
          })}
        </g>
        {pins.map((p) => (
          <g key={`${p.x},${p.y}`} transform={`translate(${p.x} ${p.y}) scale(${p === featured ? 0.18 : 0.11})`} className={p === featured ? "map-pin featured" : "map-pin"}>
            <path d={PIN_PATH} />
            <circle cy={-16} r={3.6} />
          </g>
        ))}
      </svg>
      {featured && (
        <div className="map-card">
          <span className="pill live">Recruiting now</span>
          <strong>{featured.facility}</strong>
          <span>{featured.city}, Germany</span>
          <span>{featured.trials} recruiting {featured.trials === 1 ? "trial" : "trials"} here</span>
        </div>
      )}
    </div>
  )
}
