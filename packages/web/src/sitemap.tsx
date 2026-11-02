import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { loadPostcodes, useApp } from "./app"

const MAP = {
  country: "Germany",
  lonMin: 5.8,
  lonMax: 15.2,
  latMax: 55.1,
  latMin: 47.2,
  cellDeg: 0.2,
  centreLat: 51,
  pinGroupDeg: 0.25,
  maxPins: 10,
  edgeCells: 2,
  minSeparationCells: 6,
  pinScale: 0.11,
  featuredScale: 0.18,
  pinHeadUnits: 16
} as const

const aspect = Math.cos((MAP.centreLat * Math.PI) / 180)
const COLS = Math.ceil((MAP.lonMax - MAP.lonMin) / MAP.cellDeg)
const ROWS = Math.ceil((MAP.latMax - MAP.latMin) / (MAP.cellDeg * aspect))

const toCell = (lat: number, lon: number) => ({
  x: (lon - MAP.lonMin) / MAP.cellDeg,
  y: (MAP.latMax - lat) / (MAP.cellDeg * aspect)
})

type Pin = { x: number; y: number; facility: string; city: string; trials: number }

const isInland = (land: ReadonlySet<string>, x: number, y: number) => {
  const r = MAP.edgeCells
  const cx = Math.floor(x)
  const cy = Math.floor(y)
  for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) if (!land.has(`${cx + dx},${cy + dy}`)) return false
  return true
}

const spread = (pins: Pin[]) => {
  const chosen: Pin[] = []
  for (const p of [...pins].sort((a, b) => b.trials - a.trials)) {
    if (chosen.length === MAP.maxPins) break
    if (chosen.every((c) => Math.hypot(c.x - p.x, c.y - p.y) >= MAP.minSeparationCells)) chosen.push(p)
  }
  return chosen
}

type Leader = { d: string; x: number; y: number }

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
    const all = [...groups.values()].map((g) => ({ ...toCell(g.lat, g.lon), facility: g.facility, city: g.city, trials: g.ids.size }))
    return spread(all.filter((p) => isInland(land, p.x, p.y)))
  }, [trials, land])

  const featured = useMemo(() => pins.reduce<Pin | null>((best, p) => (!best || p.x > best.x ? p : best), null), [pins])

  const plate = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const [leader, setLeader] = useState<Leader | null>(null)

  useLayoutEffect(() => {
    const el = plate.current
    if (!el || !featured) return
    const measure = () => {
      const s = svg.current
      const c = card.current
      if (!s || !c) return setLeader(null)
      const box = el.getBoundingClientRect()
      const sb = s.getBoundingClientRect()
      const cb = c.getBoundingClientRect()
      if (cb.left < sb.right) return setLeader(null)
      const scale = Math.min(sb.width / COLS, sb.height / ROWS)
      const offX = sb.left - box.left + (sb.width - COLS * scale) / 2
      const offY = sb.top - box.top + (sb.height - ROWS * scale) / 2
      const head = MAP.pinHeadUnits * MAP.featuredScale
      const x1 = offX + (featured.x + 9 * MAP.featuredScale) * scale
      const y1 = offY + (featured.y - head) * scale
      const x2 = cb.left - box.left
      const y2 = cb.top - box.top + cb.height / 2
      const mid = x1 + (x2 - x1) / 2
      setLeader({ d: `M${x1} ${y1}H${mid}V${y2}H${x2}`, x: x1, y: y1 })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [featured])

  return (
    <div ref={plate} className="plate map-plate" role="img" aria-label={`Map of Germany with ${pins.length} locations that have recruiting sites`}>
      <svg ref={svg} viewBox={`0 0 ${COLS} ${ROWS}`} className="map-svg" aria-hidden="true">
        <g className="map-land">
          {[...land].map((key) => {
            const [x, y] = key.split(",").map(Number)
            return <circle key={key} cx={x! + 0.5} cy={y! + 0.5} r={0.34} />
          })}
        </g>
        {pins.map((p) => (
          <g key={`${p.x},${p.y}`} transform={`translate(${p.x} ${p.y}) scale(${p === featured ? MAP.featuredScale : MAP.pinScale})`} className={p === featured ? "map-pin featured" : "map-pin"}>
            <path d={PIN_PATH} />
            <circle cy={-16} r={3.6} />
          </g>
        ))}
      </svg>
      {leader && (
        <svg className="map-leader" aria-hidden="true">
          <path d={leader.d} />
          <circle cx={leader.x} cy={leader.y} r={3} />
        </svg>
      )}
      {featured && (
        <div ref={card} className="map-card">
          <span className="pill live">Recruiting now</span>
          <strong>{featured.facility}</strong>
          <span>{featured.city}, Germany</span>
          <span>{featured.trials} recruiting {featured.trials === 1 ? "trial" : "trials"} here</span>
        </div>
      )}
    </div>
  )
}
