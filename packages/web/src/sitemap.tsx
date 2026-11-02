import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from "react"
import { feature } from "topojson-client"
import type { Topology } from "topojson-specification"
import type { MultiPolygon, Polygon } from "geojson"
import { useApp } from "./app"
import { A } from "./ui"

const GLOBE = {
  view: { lat: -6, lon: 14 },
  europe: { lat: 50, lon: 14 },
  dragLimitDeg: 12,
  wideBreakpointPx: 760,
  wideHeightShare: 0.5,
  narrowHeightShare: 0.9,
  wideCentreShare: 0.42,
  narrowCentreShare: 0.5,
  cardZoneShare: 0.3,
  radiusShare: 1.25,
  topMarginShare: 0.04,
  dotSpacingDeg: 0.5,
  dotRadiusPx: 1.6,
  maskPxPerDeg: 4,
  latFrom: -58,
  latTo: 80,
  minLonStepScale: 0.25,
  graticuleDeg: 15,
  graticuleStepDeg: 2,
  maxMarkers: 10,
  startSeparationDeg: 6,
  minSeparationDeg: 1,
  separationStepDeg: 0.5,
  focusDeg: 38,
  pinGroupDeg: 1,
  minVisibility: 0.4,
  edgeMarginShare: 0.08,
  leaderGutterPx: 21,
  dragThresholdPx: 4
} as const

const RAD = Math.PI / 180

type View = { lat: number; lon: number }
type Marker = { key: string; lat: number; lon: number; facility: string; city: string; country: string; trials: number }

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

type Frame = { w: number; h: number; cx: number; wide: boolean }

const frameFor = (w: number, wide: boolean): Frame => {
  return { w, h: Math.round(w * (wide ? GLOBE.wideHeightShare : GLOBE.narrowHeightShare)), cx: w * (wide ? GLOBE.wideCentreShare : GLOBE.narrowCentreShare), wide }
}

const place = (p: { x: number; y: number }, { w, h, cx }: Frame) => {
  const r = w * GLOBE.radiusShare
  return { x: cx + r * p.x, y: h * GLOBE.topMarginShare + r - r * p.y }
}

const fits = (at: { x: number; y: number }, { w, h, wide }: Frame) =>
  at.x > w * GLOBE.edgeMarginShare &&
  at.x < w * (1 - GLOBE.edgeMarginShare - (wide ? GLOBE.cardZoneShare : 0)) &&
  at.y > h * GLOBE.edgeMarginShare &&
  at.y < h * (1 - GLOBE.edgeMarginShare)

const polygonsOf = (geometry: Polygon | MultiPolygon) => (geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates)

const sampleLand = (topology: Topology): Float32Array => {
  const { maskPxPerDeg: px } = GLOBE
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
  for (let lat = GLOBE.latFrom; lat <= GLOBE.latTo; lat += GLOBE.dotSpacingDeg) {
    const step = GLOBE.dotSpacingDeg / Math.max(Math.cos(lat * RAD), GLOBE.minLonStepScale)
    for (let lon = -180; lon < 180; lon += step) {
      const x = Math.floor((lon + 180) * px)
      const y = Math.floor((90 - lat) * px)
      if (data[(y * width + x) * 4 + 3]! > 127) dots.push(lat, lon)
    }
  }
  return Float32Array.from(dots)
}

const draw = (canvas: HTMLCanvasElement, frame: Frame, view: View, dots: Float32Array) => {
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  canvas.width = frame.w * dpr
  canvas.height = frame.h * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const style = getComputedStyle(canvas)
  const bg = style.getPropertyValue("--bg")
  const line = style.getPropertyValue("--line")
  const ink = style.getPropertyValue("--ink-3")
  const r = frame.w * GLOBE.radiusShare
  const centre = place({ x: 0, y: 0 }, frame)

  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.arc(centre.x, centre.y, r, 0, 2 * Math.PI)
  ctx.fill()

  ctx.strokeStyle = line
  ctx.lineWidth = 1
  const trace = (points: Array<[number, number]>) => {
    let pen = false
    ctx.beginPath()
    for (const [lat, lon] of points) {
      const p = project(lat, lon, view)
      if (p.depth <= 0) {
        pen = false
        continue
      }
      const { x, y } = place(p, frame)
      if (pen) ctx.lineTo(x, y)
      else ctx.moveTo(x, y)
      pen = true
    }
    ctx.stroke()
  }
  for (let lat = -60; lat <= 60; lat += GLOBE.graticuleDeg) {
    const row: Array<[number, number]> = []
    for (let lon = -180; lon <= 180; lon += GLOBE.graticuleStepDeg) row.push([lat, lon])
    trace(row)
  }
  for (let lon = -180; lon < 180; lon += GLOBE.graticuleDeg) {
    const column: Array<[number, number]> = []
    for (let lat = -80; lat <= 80; lat += GLOBE.graticuleStepDeg) column.push([lat, lon])
    trace(column)
  }

  ctx.fillStyle = ink
  for (let i = 0; i < dots.length; i += 2) {
    const p = project(dots[i]!, dots[i + 1]!, view)
    if (p.depth <= 0) continue
    ctx.globalAlpha = 0.25 + 0.55 * p.depth
    ctx.beginPath()
    const at = place(p, frame)
    ctx.arc(at.x, at.y, GLOBE.dotRadiusPx * (0.4 + 0.6 * Math.sqrt(p.depth)), 0, 2 * Math.PI)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  ctx.strokeStyle = line
  ctx.beginPath()
  ctx.arc(centre.x, centre.y, r, 0, 2 * Math.PI)
  ctx.stroke()
}

const angularDeg = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => Math.acos(Math.min(1, Math.max(-1, project(a.lat, a.lon, b).depth))) / RAD

const useMarkers = (wide: boolean): Marker[] => {
  const { trials } = useApp()
  return useMemo(() => {
    const groups = new Map<string, Marker & { ids: Set<string> }>()
    for (const t of trials) {
      for (const s of t.sites) {
        if (s.status !== "RECRUITING" || s.lat == null || s.lon == null) continue
        const key = `${Math.round(s.lat / GLOBE.pinGroupDeg)},${Math.round(s.lon / GLOBE.pinGroupDeg)}`
        const g = groups.get(key) ?? { key, lat: s.lat, lon: s.lon, facility: s.facility, city: s.city, country: s.country, trials: 0, ids: new Set<string>() }
        g.ids.add(t.nctId)
        groups.set(key, g)
      }
    }
    const unit = frameFor(1, wide)
    const candidates = [...groups.values()]
      .map(({ ids, ...g }) => ({ ...g, trials: ids.size }))
      .filter((m) => angularDeg(m, GLOBE.europe) <= GLOBE.focusDeg)
      .filter((m) => fits(place(project(m.lat, m.lon, GLOBE.view), unit), unit))
      .sort((a, b) => b.trials - a.trials)
    // loosen the spacing until ten markers fit, so sparse regions still get a full set
    let chosen: Marker[] = []
    for (let gap: number = GLOBE.startSeparationDeg; gap >= GLOBE.minSeparationDeg; gap -= GLOBE.separationStepDeg) {
      chosen = []
      for (const m of candidates) {
        if (chosen.length === GLOBE.maxMarkers) break
        if (chosen.every((c) => angularDeg(c, m) >= gap)) chosen.push(m)
      }
      if (chosen.length === GLOBE.maxMarkers) break
    }
    return chosen
  }, [trials, wide])
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

const useThemeTick = () => {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const observer = new MutationObserver(() => setTick((n) => n + 1))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])
  return tick
}

type Leader = { d: string; x: number; y: number }

export function SiteMap() {
  const [width, setWidth] = useState(0)
  const wide = width >= GLOBE.wideBreakpointPx
  const markers = useMarkers(wide)
  const dots = useLandDots()
  const themeTick = useThemeTick()
  const [view, setView] = useState<View>(GLOBE.view)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [leader, setLeader] = useState<Leader | null>(null)

  const plate = useRef<HTMLDivElement>(null)
  const globe = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const justDragged = useRef(false)

  const selected = markers.find((m) => m.key === selectedKey) ?? markers.reduce<Marker | null>((best, m) => (!best || m.trials > best.trials ? m : best), null)

  useEffect(() => {
    const el = globe.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry!.contentRect.width)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const frame = useMemo(() => frameFor(width, wide), [width, wide])

  useEffect(() => {
    if (canvas.current && width > 0) draw(canvas.current, frame, view, dots)
  }, [frame, width, view, dots, themeTick])

  useLayoutEffect(() => {
    const box = plate.current
    const c = card.current
    const pin = selected && box?.querySelector<HTMLElement>(`[data-marker="${selected.key}"]`)
    if (!box || !c || !pin || pin.hidden) return setLeader(null)
    const b = box.getBoundingClientRect()
    const p = pin.getBoundingClientRect()
    const k = c.getBoundingClientRect()
    if (k.left <= p.right) return setLeader(null)
    const x1 = p.left - b.left + p.width / 2
    const y1 = p.top - b.top + p.height * 0.4
    const x2 = k.left - b.left
    const y2 = k.top - b.top + k.height / 2
    const spine = x2 - GLOBE.leaderGutterPx
    setLeader({ d: `M${x1} ${y1}H${spine}V${y2}H${x2}`, x: x1, y: y1 })
  }, [selected, view, width])

  const onPointerDown = (e: PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, moved: false }
  }

  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current
    if (!d || width === 0) return
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < GLOBE.dragThresholdPx) return
    if (!d.moved) e.currentTarget.setPointerCapture(e.pointerId)
    d.moved = true
    const perPx = 1 / (width * GLOBE.radiusShare) / RAD
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    d.x = e.clientX
    d.y = e.clientY
    const limit = GLOBE.dragLimitDeg
    setView((v) => ({
      lat: Math.min(GLOBE.view.lat + limit, Math.max(GLOBE.view.lat - limit, v.lat + dy * perPx)),
      lon: Math.min(GLOBE.view.lon + limit, Math.max(GLOBE.view.lon - limit, v.lon - dx * perPx))
    }))
  }

  const onPointerEnd = () => {
    justDragged.current = drag.current?.moved ?? false
    drag.current = null
  }

  return (
    <div ref={plate} className="plate map-plate">
      <div
        ref={globe}
        className="globe"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <canvas ref={canvas} style={{ width: frame.w, height: frame.h }} role="img" aria-label="Globe zoomed on Europe. Drag to rotate." />
        {width > 0 &&
          markers.map((m) => {
            const p = project(m.lat, m.lon, view)
            const at = place(p, frame)
            const inside = fits(at, frame)
            const isSelected = m.key === selected?.key
            return (
              <button
                key={m.key}
                type="button"
                data-marker={m.key}
                hidden={p.depth < GLOBE.minVisibility || !inside}
                className={`globe-pin${isSelected ? " selected" : ""}`}
                style={{ left: at.x, top: at.y }}
                aria-label={`${m.facility}, ${m.city}, ${m.trials} recruiting trials`}
                aria-pressed={isSelected}
                onClick={() => {
                  if (justDragged.current) {
                    justDragged.current = false
                    return
                  }
                  setSelectedKey(m.key)
                }}
              >
                <svg viewBox="-10 -26 20 27" aria-hidden="true">
                  <path d="M0 0C-6 -8 -9 -12 -9 -16A9 9 0 1 1 9 -16C9 -12 6 -8 0 0Z" />
                  <circle cy={-16} r={3.6} />
                </svg>
              </button>
            )
          })}
      </div>
      {leader && (
        <svg className="map-leader" aria-hidden="true">
          <path d={leader.d} />
          <circle cx={leader.x} cy={leader.y} r={3} />
        </svg>
      )}
      {selected && (
        <div ref={card} className="map-card" aria-live="polite">
          <span className="pill live">Recruiting now</span>
          <strong>{selected.facility}</strong>
          <span>{selected.city}, {selected.country}</span>
          <span>{selected.trials} recruiting {selected.trials === 1 ? "trial" : "trials"} here</span>
          <A to="/results" className="btn outline small">Browse trials</A>
        </div>
      )}
    </div>
  )
}
