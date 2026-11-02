import { useEffect, useMemo, useState } from "react"
import { feature } from "topojson-client"
import type { Topology } from "topojson-specification"
import type { MultiPolygon, Polygon } from "geojson"
import { useApp } from "./app"
import { A } from "./ui"

const ART = {
  width: 720,
  height: 560,
  view: { lat: -3, lon: 14 },
  europe: { lat: 50, lon: 14 },
  europeAt: { x: 0.42, y: 0.5 },
  radius: 1250,
  dotSpacingDeg: 0.4,
  maskPxPerDeg: 4,
  latFrom: -58,
  latTo: 80,
  minLonStepScale: 0.25,
  graticuleDeg: 15,
  graticuleStepDeg: 2,
  depthBands: [
    { below: 0.35, width: 2, opacity: 0.35 },
    { below: 0.7, width: 2.6, opacity: 0.6 },
    { below: 1.01, width: 3, opacity: 0.85 }
  ],
  maxMarkers: 30,
  startSeparationDeg: 2.5,
  minSeparationDeg: 0.5,
  separationStepDeg: 0.5,
  focusDeg: 38,
  pinGroupDeg: 1,
  pinScale: 1,
  featuredPinScale: 1.4,
  edgeMargin: 40,
  tile: { x: 462, w: 240, h: 148, pad: 18, nameLineChars: 27, edgeGap: 24 },
  leaderGutter: 18,
  leaderClearance: 18,
  featuredSite: { match: /charit/i, name: "Charité – Universitätsmedizin Berlin" }
} as const

const RAD = Math.PI / 180

type View = { lat: number; lon: number }
type Marker = { key: string; lat: number; lon: number; facility: string; city: string; country: string; trials: number; featured: boolean }

const project = (lat: number, lon: number, view: View) => {
  const phi = lat * RAD
  const dl = (lon - view.lon) * RAD
  const phi0 = view.lat * RAD
  return {
    x: Math.cos(phi) * Math.sin(dl),
    y: Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(dl),
    depth: Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(dl)
  }
}

const eu = project(ART.europe.lat, ART.europe.lon, ART.view)
const centre = {
  x: ART.width * ART.europeAt.x - ART.radius * eu.x,
  y: ART.height * ART.europeAt.y + ART.radius * eu.y
}

const place = (lat: number, lon: number) => {
  const p = project(lat, lon, ART.view)
  return { x: centre.x + ART.radius * p.x, y: centre.y - ART.radius * p.y, depth: p.depth }
}

const angularDeg = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) =>
  Math.acos(Math.min(1, Math.max(-1, project(a.lat, a.lon, b).depth))) / RAD

const polygonsOf = (geometry: Polygon | MultiPolygon) => (geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates)

const sampleLand = (topology: Topology): Float32Array => {
  const px = ART.maskPxPerDeg
  const canvas = document.createElement("canvas")
  canvas.width = 360 * px
  canvas.height = 180 * px
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return new Float32Array()

  const land = feature(topology, topology.objects.land!)
  const features = land.type === "FeatureCollection" ? land.features : [land]
  for (const f of features) {
    if (f.geometry.type !== "Polygon" && f.geometry.type !== "MultiPolygon") continue
    for (const polygon of polygonsOf(f.geometry)) {
      ctx.beginPath()
      for (const ring of polygon) {
        ring.forEach(([lon, lat], i) => (i === 0 ? ctx.moveTo((lon! + 180) * px, (90 - lat!) * px) : ctx.lineTo((lon! + 180) * px, (90 - lat!) * px)))
        ctx.closePath()
      }
      ctx.fill("evenodd")
    }
  }

  const { data, width } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const dots: number[] = []
  for (let lat = ART.latFrom; lat <= ART.latTo; lat += ART.dotSpacingDeg) {
    const step = ART.dotSpacingDeg / Math.max(Math.cos(lat * RAD), ART.minLonStepScale)
    for (let lon = -180; lon < 180; lon += step) {
      const x = Math.floor((lon + 180) * px)
      const y = Math.floor((90 - lat) * px)
      if (data[(y * width + x) * 4 + 3]! > 127) dots.push(lat, lon)
    }
  }
  return Float32Array.from(dots)
}

const useLandDots = () => {
  const [dots, setDots] = useState<Float32Array>(new Float32Array())
  useEffect(() => {
    let cancelled = false
    import("world-atlas/land-110m.json").then((m) => {
      if (!cancelled) setDots(sampleLand(m.default as unknown as Topology))
    })
    return () => {
      cancelled = true
    }
  }, [])
  return dots
}

const inBounds = (p: { x: number; y: number }, margin: number) => p.x > margin && p.x < ART.width - margin && p.y > margin && p.y < ART.height - margin

const distanceToSegment = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const t = dx === 0 && dy === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

const leaderFor = (from: { x: number; y: number }, tileY: number) => {
  const { tile, leaderGutter } = ART
  const x1 = from.x + 9 * ART.featuredPinScale
  const y1 = from.y - 16 * ART.featuredPinScale
  const y2 = tileY + tile.h / 2
  const spine = tile.x - leaderGutter
  return { x1, y1, y2, spine, d: `M${x1} ${y1}H${spine}V${y2}H${tile.x}` }
}

type MapData = { markers: Marker[]; tileY: number }

const useMapData = (): MapData => {
  const { trials } = useApp()
  return useMemo(() => {
    const { featuredSite, tile } = ART
    const groups = new Map<string, Marker & { ids: Set<string>; featuredIds: Set<string> }>()
    for (const t of trials) {
      for (const s of t.sites) {
        if (s.status !== "RECRUITING" || s.lat == null || s.lon == null) continue
        const key = `${Math.round(s.lat / ART.pinGroupDeg)},${Math.round(s.lon / ART.pinGroupDeg)}`
        const g = groups.get(key) ?? { key, lat: s.lat, lon: s.lon, facility: s.facility, city: s.city, country: s.country, trials: 0, featured: false, ids: new Set<string>(), featuredIds: new Set<string>() }
        g.ids.add(t.nctId)
        if (featuredSite.match.test(s.facility)) {
          g.featuredIds.add(t.nctId)
          g.lat = s.lat
          g.lon = s.lon
          g.city = s.city
          g.country = s.country
        }
        groups.set(key, g)
      }
    }

    const all = [...groups.values()].map(({ ids, featuredIds, ...g }) =>
      featuredIds.size > 0 ? { ...g, facility: featuredSite.name, trials: featuredIds.size, featured: true } : { ...g, trials: ids.size }
    )
    const star = all.find((m) => m.featured) ?? [...all].sort((a, b) => b.trials - a.trials)[0]
    if (!star) return { markers: [], tileY: 0 }

    const starAt = place(star.lat, star.lon)
    const tileY = Math.max(tile.edgeGap, Math.min(ART.height - tile.h - tile.edgeGap, starAt.y - tile.h / 2))
    const leader = leaderFor(starAt, tileY)
    const legs: Array<[{ x: number; y: number }, { x: number; y: number }]> = [
      [{ x: leader.x1, y: leader.y1 }, { x: leader.spine, y: leader.y1 }],
      [{ x: leader.spine, y: leader.y1 }, { x: leader.spine, y: leader.y2 }],
      [{ x: leader.spine, y: leader.y2 }, { x: tile.x, y: leader.y2 }]
    ]

    const candidates = all
      .filter((m) => m !== star && angularDeg(m, ART.europe) <= ART.focusDeg)
      .filter((m) => {
        const p = place(m.lat, m.lon)
        if (p.depth <= 0 || !inBounds(p, ART.edgeMargin)) return false
        const inTile = p.x > tile.x - ART.leaderClearance && p.y > tileY - ART.leaderClearance && p.y < tileY + tile.h + ART.leaderClearance
        return !inTile && legs.every(([a, b]) => distanceToSegment(p, a, b) > ART.leaderClearance)
      })
      .sort((a, b) => b.trials - a.trials)

    // loosen the spacing until the set is full, so sparse regions still get their markers
    let chosen: Marker[] = []
    for (let gap: number = ART.startSeparationDeg; gap >= ART.minSeparationDeg; gap -= ART.separationStepDeg) {
      chosen = [star]
      for (const m of candidates) {
        if (chosen.length === ART.maxMarkers) break
        if (chosen.every((c) => angularDeg(c, m) >= gap)) chosen.push(m)
      }
      if (chosen.length === ART.maxMarkers) break
    }
    return { markers: chosen, tileY }
  }, [trials])
}

const graticule = () => {
  const lines: string[] = []
  const trace = (points: Array<[number, number]>) => {
    let d = ""
    let pen = false
    for (const [lat, lon] of points) {
      const p = place(lat, lon)
      if (p.depth <= 0) {
        pen = false
        continue
      }
      d += `${pen ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`
      pen = true
    }
    if (d) lines.push(d)
  }
  for (let lat = -60; lat <= 75; lat += ART.graticuleDeg) {
    const row: Array<[number, number]> = []
    for (let lon = -180; lon <= 180; lon += ART.graticuleStepDeg) row.push([lat, lon])
    trace(row)
  }
  for (let lon = -180; lon < 180; lon += ART.graticuleDeg) {
    const column: Array<[number, number]> = []
    for (let lat = -80; lat <= 80; lat += ART.graticuleStepDeg) column.push([lat, lon])
    trace(column)
  }
  return lines.join("")
}

const PIN_PATH = "M0 0C-6 -8 -9 -12 -9 -16A9 9 0 1 1 9 -16C9 -12 6 -8 0 0Z"

const wrap = (text: string, max: number) => {
  const lines: string[] = []
  for (const word of text.split(" ")) {
    const last = lines[lines.length - 1]
    if (last !== undefined && `${last} ${word}`.length <= max) lines[lines.length - 1] = `${last} ${word}`
    else lines.push(word)
  }
  return lines.slice(0, 2)
}

export function SiteMap() {
  const { markers, tileY } = useMapData()
  const dots = useLandDots()
  const lines = useMemo(graticule, [])

  const featured = markers.find((m) => m.featured) ?? markers[0] ?? null

  const land = useMemo(() => {
    const bands = ART.depthBands.map(() => "")
    for (let i = 0; i < dots.length; i += 2) {
      const p = place(dots[i]!, dots[i + 1]!)
      if (p.depth <= 0.02 || p.x < -6 || p.x > ART.width + 6 || p.y < -6 || p.y > ART.height + 6) continue
      const band = ART.depthBands.findIndex((b) => p.depth < b.below)
      bands[band] += `M${p.x.toFixed(1)} ${p.y.toFixed(1)}h0`
    }
    return bands
  }, [dots])

  const { tile } = ART
  const leader = featured ? leaderFor(place(featured.lat, featured.lon), tileY) : null

  return (
    <article className="group relative isolate flex min-h-[560px] flex-col overflow-hidden rounded-card border border-line md:block">
      <div className="relative z-10 flex flex-col items-start gap-[21px] p-[34px] md:absolute md:inset-y-0 md:left-0 md:w-[38%] md:justify-center md:p-[55px]">
        <h2 className="text-[34px] leading-[1.2] font-bold md:text-[42px]">Recruiting sites across Europe.</h2>
        <p className="lead">Sites that say they are recruiting right now. Add your postcode to sort by distance. It is looked up on this device and never sent anywhere.</p>
        <A to="/results" className="btn outline">Browse trials</A>
      </div>

      <figure className="relative m-0 aspect-[720/560] w-full bg-plate md:absolute md:inset-y-0 md:right-0 md:aspect-auto md:h-full md:w-[62%]" aria-label={`Map of Europe with ${markers.length} sites that are recruiting`}>
        <svg viewBox={`0 0 ${ART.width} ${ART.height}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" role="img" aria-hidden="true">
          <g className="origin-[44%_50%] transition-transform duration-700 ease-out group-hover:scale-[1.025]">
            <circle cx={centre.x} cy={centre.y} r={ART.radius} className="fill-bg stroke-line" />
            <path d={lines} className="fill-none stroke-line" strokeWidth={1} />
            {land.map((d, i) => (
              <path key={i} d={d} className="fill-none stroke-ink-3" strokeLinecap="round" strokeWidth={ART.depthBands[i]!.width} opacity={ART.depthBands[i]!.opacity} />
            ))}
            {markers.map((m, i) => {
              const p = place(m.lat, m.lon)
              const isFeatured = m === featured
              return (
                <g key={m.key} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}>
                  <g
                    className={`transition-transform duration-300 ease-out [transform-box:fill-box] origin-bottom ${isFeatured ? "group-hover:scale-125" : "group-hover:-translate-y-1"}`}
                    style={{ transitionDelay: `${i * 35}ms` }}
                  >
                    <g transform={`scale(${isFeatured ? ART.featuredPinScale : ART.pinScale})`}>
                      <path d={PIN_PATH} className={isFeatured ? "fill-recruiting-dot stroke-ink" : "fill-recruiting-dot stroke-bg"} strokeWidth={isFeatured ? 2.5 : 1.5} />
                      <circle cy={-16} r={3.6} className="fill-white" />
                    </g>
                  </g>
                </g>
              )
            })}
          </g>

          {leader && (
            <g className="opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100">
              <path d={leader.d} pathLength={1} className="fill-none stroke-ink [stroke-dasharray:1] [stroke-dashoffset:1] transition-[stroke-dashoffset] duration-700 ease-out group-hover:[stroke-dashoffset:0] pointer-coarse:[stroke-dashoffset:0]" strokeWidth={1} />
              <circle cx={leader.x1} cy={leader.y1} r={3} className="fill-ink" />
            </g>
          )}

          {featured && (
            <g className="translate-y-2 opacity-0 transition-[opacity,transform] delay-150 duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 pointer-coarse:translate-y-0 pointer-coarse:opacity-100">
              <rect x={tile.x} y={tileY} width={tile.w} height={tile.h} rx={16} className="fill-bg stroke-line" />
              <rect x={tile.x + tile.pad} y={tileY + tile.pad} width={104} height={22} rx={11} className="fill-recruiting-bg" />
              <circle cx={tile.x + tile.pad + 12} cy={tileY + tile.pad + 11} r={4} className="fill-recruiting-dot" />
              <text x={tile.x + tile.pad + 23} y={tileY + tile.pad + 15} className="fill-recruiting-ink text-[11px] font-semibold">Recruiting now</text>
              {wrap(featured.facility, tile.nameLineChars).map((line, i) => (
                <text key={line} x={tile.x + tile.pad} y={tileY + 68 + i * 19} className="fill-ink text-[14px] font-semibold">{line}</text>
              ))}
              <text x={tile.x + tile.pad} y={tileY + tile.h - 38} className="fill-ink-3 text-[13px]">{featured.city}, {featured.country}</text>
              <text x={tile.x + tile.pad} y={tileY + tile.h - 18} className="fill-ink-3 text-[13px]">{featured.trials} recruiting {featured.trials === 1 ? "trial" : "trials"} here</text>
            </g>
          )}
        </svg>
      </figure>
    </article>
  )
}
