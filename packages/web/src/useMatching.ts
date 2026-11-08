import { useEffect, useRef, useState } from "react"
import type { LatLon, Profile, Trial } from "@trial-finder/domain"
import type { Summary } from "./worker"

export interface Impact {
  field: string
  trials: number
  criteria: number
}

interface Input {
  trials: ReadonlyArray<Trial>
  indexText: string
  group: string
  profile: Profile
  home: LatLon | null
  enabled: boolean
  onRequest: () => void
}

export function useMatching({ trials, indexText, group, profile, home, enabled, onRequest }: Input) {
  const [summaries, setSummaries] = useState<Summary[] | null>(null)
  const [impact, setImpact] = useState<Impact[]>([])
  const [readyCount, setReadyCount] = useState(0)
  const worker = useRef<Worker | null>(null)
  const ready = useRef(false)
  const requestId = useRef(0)

  useEffect(() => setSummaries(null), [trials])

  useEffect(() => {
    if (!trials.length) return
    const w = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" })
    worker.current = w
    ready.current = false
    w.onmessage = (e) => {
      const message = e.data
      if (message.type === "ready") {
        ready.current = true
        setReadyCount((n) => n + 1)
      } else if (message.type === "result" && message.id === requestId.current) {
        setSummaries(message.summaries)
        setImpact(message.impact)
      }
    }
    w.postMessage({ type: "initIndex", text: indexText, group })
    return () => w.terminate()
  }, [trials, group, indexText])

  useEffect(() => {
    if (!enabled || !ready.current || !worker.current) return
    requestId.current += 1
    worker.current.postMessage({ type: "match", id: requestId.current, profile, home })
    onRequest()
  }, [profile, home, readyCount, enabled])

  return { summaries, impact }
}
