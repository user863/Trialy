import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { feature } from "topojson-client"
import type { Topology } from "topojson-specification"
import type { MultiPolygon, Polygon } from "geojson"
import type { Trial } from "@trial-finder/domain"
import { recruitingCities, type City } from "./cities"
import { useI18n } from "./i18n"
import { A } from "./ui"

const ART = {
  width: 1200,
  height: 560,
  view: { lat: 20, lon: 14 },
  centre: { x: 300, y: 600 },
  radius: 520,
  canvasScale: 2,
  dotSpacingDeg: 0.4,
  maskPxPerDeg: 4,
  latFrom: -58,
  latTo: 86,
  graticuleDeg: 15,
  graticuleStepDeg: 2,
  depthBandCount: 10,
  limbCutoff: 0.12,
  dotWidth: { near: 2.2, far: 1.1 },
  dotOpacity: { near: 0.85, far: 0.15 },
  maxMarkers: 30,
  minPinGapPx: 13,
  pinScale: 0.8,
  featuredPinScale: 1.3,
  hoverZoom: 1.03,
  edgeMargin: 36,
  artRight: 760,
  tile: { x: 556, w: 216, h: 168, pad: 18, nameLineChars: 23, edgeGap: 24 },
  leaderGutter: 18,
  leaderClearance: 18
} as const

const RAD = Math.PI / 180

type View = { lat: number; lon: number }
type Marker = City & { key: string; x: number; y: number }

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

const place = (lat: number, lon: number) => {
  const p = project(lat, lon, ART.view)
  return { x: ART.centre.x + ART.radius * p.x, y: ART.centre.y - ART.radius * p.y, depth: p.depth }
}

const polygonsOf = (geometry: Polygon | MultiPolygon) => (geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates)

const WRAPS = [-360, 0, 360]

const unwrap = (ring: ReadonlyArray<ReadonlyArray<number>>) => {
  let shift = 0
  return ring.map(([lon, lat], i) => {
    const prev = i === 0 ? lon! : ring[i - 1]![0]!
    if (lon! - prev > 180) shift -= 360
    else if (prev - lon! > 180) shift += 360
    return [lon! + shift, lat!] as const
  })
}

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
      for (const ring of polygon.map(unwrap)) {
        for (const shift of WRAPS) {
          ring.forEach(([lon, lat], i) => {
            const x = (lon + 180 + shift) * px
            const y = (90 - lat) * px
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          })
          ctx.closePath()
        }
      }
      ctx.fill("evenodd")
    }
  }

  const { data, width } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const dots: number[] = []
  let row = 0
  for (let lat = ART.latFrom; lat <= ART.latTo; lat += ART.dotSpacingDeg, row++) {
    const count = Math.max(1, Math.round((360 * Math.cos(lat * RAD)) / ART.dotSpacingDeg))
    const step = 360 / count
    const offset = (row % 2) * (step / 2)
    for (let k = 0; k < count; k++) {
      const lon = -180 + offset + k * step
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

const visible = (p: { x: number; y: number; depth: number }) =>
  p.depth > 0 && p.x > ART.edgeMargin && p.x < ART.artRight && p.y > ART.edgeMargin && p.y < ART.height - ART.edgeMargin

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

const spread = (star: Marker, pool: Marker[]) => {
  const chosen = [star]
  const nearest = pool.map((m) => Math.hypot(m.x - star.x, m.y - star.y))
  while (chosen.length < ART.maxMarkers) {
    let best = -1
    nearest.forEach((d, i) => {
      if (d >= ART.minPinGapPx && (best < 0 || d > nearest[best]!)) best = i
    })
    const pick = pool[best]
    if (!pick) break
    chosen.push(pick)
    pool.forEach((m, i) => {
      nearest[i] = Math.min(nearest[i]!, Math.hypot(m.x - pick.x, m.y - pick.y))
    })
  }
  return chosen
}

const buildMap = (cities: ReadonlyArray<City>): MapData => {
  const { tile } = ART
  const all: Array<Marker & { depth: number }> = cities.map((c) => {
    const p = place(c.lat, c.lon)
    return { ...c, key: `${c.country}|${c.city}`, x: p.x, y: p.y, depth: p.depth }
  })
  const star = all[0]
  if (!star) return { markers: [], tileY: 0 }

  const tileY = Math.max(tile.edgeGap, Math.min(ART.height - tile.h - tile.edgeGap, star.y - tile.h / 2))
  const leader = leaderFor(star, tileY)
  const legs: Array<[{ x: number; y: number }, { x: number; y: number }]> = [
    [{ x: leader.x1, y: leader.y1 }, { x: leader.spine, y: leader.y1 }],
    [{ x: leader.spine, y: leader.y1 }, { x: leader.spine, y: leader.y2 }],
    [{ x: leader.spine, y: leader.y2 }, { x: tile.x, y: leader.y2 }]
  ]

  const pool = all.filter((m) => {
    if (m === star || !visible(m)) return false
    const inTile = m.x > tile.x - ART.leaderClearance && m.y > tileY - ART.leaderClearance && m.y < tileY + tile.h + ART.leaderClearance
    return !inTile && legs.every(([a, b]) => distanceToSegment(m, a, b) > ART.leaderClearance)
  })
  return { markers: spread(star, pool), tileY }
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
    for (let lat = -75; lat <= 75; lat += ART.graticuleStepDeg) column.push([lat, lon])
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
  return lines.slice(0, 3)
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

const paintGlobe = (canvas: HTMLCanvasElement, lines: Path2D, land: Float32Array[]) => {
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  const k = ART.canvasScale
  ctx.setTransform(k, 0, 0, k, 0, 0)
  ctx.clearRect(0, 0, ART.width, ART.height)

  ctx.beginPath()
  ctx.arc(ART.centre.x, ART.centre.y, ART.radius, 0, Math.PI * 2)
  ctx.fillStyle = css("--bg")
  ctx.fill()
  ctx.strokeStyle = css("--line")
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.stroke(lines)

  ctx.fillStyle = css("--ink-3")
  land.forEach((dots, i) => {
    const t = (i + 0.5) / ART.depthBandCount
    const width = lerp(ART.dotWidth.far, ART.dotWidth.near, t)
    const opacity = lerp(ART.dotOpacity.far, ART.dotOpacity.near, t)
    ctx.globalAlpha = opacity
    ctx.beginPath()
    for (let j = 0; j < dots.length; j += 2) {
      ctx.moveTo(dots[j]! + width / 2, dots[j + 1]!)
      ctx.arc(dots[j]!, dots[j + 1]!, width / 2, 0, Math.PI * 2)
    }
    ctx.fill()
  })
  ctx.globalAlpha = 1
}

const originOf = (m: { x: number; y: number }) => `${((m.x / ART.width) * 100).toFixed(1)}% ${((m.y / ART.height) * 100).toFixed(1)}%`

const PILL_PAD = 26
const PILL_CHAR = 6.4

export function SiteMap({ trials }: { trials: ReadonlyArray<Trial> | undefined }) {
  const { t, countryName } = useI18n()
  const { markers, tileY } = useMemo(() => buildMap(recruitingCities(trials ?? [])), [trials])
  const dots = useLandDots()
  const canvas = useRef<HTMLCanvasElement>(null)
  const lines = useMemo(() => new Path2D(graticule()), [])

  const featured = markers[0] ?? null

  const land = useMemo(() => {
    const bands: number[][] = Array.from({ length: ART.depthBandCount }, () => [])
    for (let i = 0; i < dots.length; i += 2) {
      const p = place(dots[i]!, dots[i + 1]!)
      if (p.depth <= ART.limbCutoff || p.x < -6 || p.x > ART.width + 6 || p.y < -6 || p.y > ART.height + 6) continue
      bands[Math.min(ART.depthBandCount - 1, Math.floor(p.depth * ART.depthBandCount))]!.push(p.x, p.y)
    }
    return bands.map((b) => Float32Array.from(b))
  }, [dots])

  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const draw = () => paintGlobe(el, lines, land)
    draw()
    const theme = new MutationObserver(draw)
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => theme.disconnect()
  }, [lines, land])

  const recruitingNow = t("filters.recruitingNow")
  const pillWidth = Math.round(PILL_PAD + recruitingNow.length * PILL_CHAR)
  const { tile } = ART
  const leader = featured ? leaderFor(featured, tileY) : null
  const crop = "xMinYMax slice"

  return (
    <article className="group relative isolate flex flex-col overflow-hidden rounded-card border border-line bg-plate lg:block lg:min-h-[560px]">
      <div className="relative z-10 flex flex-col items-start gap-[21px] p-[34px] lg:absolute lg:inset-y-0 lg:right-0 lg:w-[34%] lg:justify-center lg:px-10 lg:py-[55px]">
        <h2 className="text-[34px] leading-[1.2] font-bold lg:text-[38px]">{t("map.title")}</h2>
        <p className="lead">{t("map.lead")}</p>
        <A to="/results" className="btn outline">{t("map.browse")}</A>
      </div>

      <figure className="relative order-first m-0 aspect-[4/3] w-full lg:absolute lg:inset-0 lg:aspect-auto lg:h-full" aria-label={t("map.label", { count: markers.length })}>
        <div
          className="absolute inset-0 transition-transform duration-[900ms] ease-soft will-change-transform motion-reduce:transition-none lg:group-hover:scale-[var(--zoom)]"
          style={{ transformOrigin: featured ? originOf(featured) : "50% 50%", "--zoom": ART.hoverZoom } as CSSProperties}
        >
          <canvas ref={canvas} width={ART.width * ART.canvasScale} height={ART.height * ART.canvasScale} className="absolute inset-0 h-full w-full object-cover object-left-bottom" aria-hidden="true" />
          <svg viewBox={`0 0 ${ART.width} ${ART.height}`} preserveAspectRatio={crop} className="absolute inset-0 h-full w-full" aria-hidden="true">
            {markers.map((m) => {
              const isFeatured = m === featured
              const wave = Math.round((m.x / ART.artRight) * 260)
              return (
                <g key={m.key} transform={`translate(${m.x.toFixed(1)} ${m.y.toFixed(1)})`}>
                  <g
                    className={`transition-transform duration-[700ms] ease-soft [transform-box:fill-box] origin-bottom motion-reduce:transition-none group-hover:[transition-delay:var(--wave)] ${isFeatured ? "group-hover:scale-125" : "group-hover:-translate-y-[3px]"}`}
                    style={{ "--wave": `${wave}ms` } as CSSProperties}
                  >
                    <g transform={`scale(${isFeatured ? ART.featuredPinScale : ART.pinScale})`}>
                      <path d={PIN_PATH} className={isFeatured ? "fill-recruiting-dot stroke-ink" : "fill-recruiting-dot stroke-bg"} strokeWidth={isFeatured ? 2.5 : 1.5} />
                      <circle cy={-16} r={3.6} className="fill-white" />
                    </g>
                  </g>
                </g>
              )
            })}
          </svg>
        </div>

        <svg viewBox={`0 0 ${ART.width} ${ART.height}`} preserveAspectRatio={crop} className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block" aria-hidden="true">
          {leader && (
            <g className="opacity-0 transition-opacity duration-500 ease-soft group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100">
              <path d={leader.d} pathLength={1} className="fill-none stroke-ink [stroke-dasharray:1] [stroke-dashoffset:1] transition-[stroke-dashoffset] duration-[900ms] ease-soft group-hover:[stroke-dashoffset:0] pointer-coarse:[stroke-dashoffset:0] motion-reduce:transition-none" strokeWidth={1} />
              <circle cx={leader.x1} cy={leader.y1} r={3} className="fill-ink" />
            </g>
          )}

          {featured && (
            <g className="translate-y-2 opacity-0 transition-[opacity,transform] delay-200 duration-700 ease-soft group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 pointer-coarse:translate-y-0 pointer-coarse:opacity-100 motion-reduce:transition-none">
              <rect x={tile.x} y={tileY} width={tile.w} height={tile.h} rx={16} className="fill-bg stroke-line" />
              <rect x={tile.x + tile.pad} y={tileY + tile.pad} width={pillWidth} height={22} rx={11} className="fill-recruiting-bg" />
              <circle cx={tile.x + tile.pad + 12} cy={tileY + tile.pad + 11} r={4} className="fill-recruiting-dot" />
              <text x={tile.x + tile.pad + 23} y={tileY + tile.pad + 15} className="fill-recruiting-ink text-[11px] font-semibold">{recruitingNow}</text>
              {wrap(featured.city, tile.nameLineChars).map((line, i) => (
                <text key={line} x={tile.x + tile.pad} y={tileY + 68 + i * 19} className="fill-ink text-[14px] font-semibold">{line}</text>
              ))}
              <text x={tile.x + tile.pad} y={tileY + tile.h - 38} className="fill-ink-3 text-[13px]">{countryName(featured.country)}</text>
              <text x={tile.x + tile.pad} y={tileY + tile.h - 18} className="fill-ink-3 text-[13px]">{t("map.trials", { count: featured.trials })}</text>
            </g>
          )}
        </svg>
      </figure>
    </article>
  )
}
