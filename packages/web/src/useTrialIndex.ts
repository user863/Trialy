import { useEffect, useState } from "react"
import type { TrialIndex } from "@trial-finder/domain"
import { fetchIndex, loadPostcodes } from "./data"

export function useTrialIndex(enabled: boolean): { index: TrialIndex | null; indexText: string; error: string | null } {
  const [loaded, setLoaded] = useState<{ index: TrialIndex; text: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    fetchIndex().then(
      ({ index, text }) => {
        setLoaded({ index, text })
        setError(null)
      },
      (e: Error) => setError(e.message)
    )
    loadPostcodes().catch(() => undefined)
  }, [enabled])

  return { index: loaded?.index ?? null, indexText: loaded?.text ?? "", error }
}
