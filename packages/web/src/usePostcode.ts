import { useEffect, useState } from "react"
import type { LatLon, Profile } from "@trial-finder/domain"
import { config } from "./config"
import { loadPostcodes } from "./data"

export type PostcodeStatus = "empty" | "loading" | "found" | "unknown"

export function usePostcode(country: Profile["country"], postcode: string): { home: LatLon | null; status: PostcodeStatus } {
  const [state, setState] = useState<{ home: LatLon | null; status: PostcodeStatus }>({ home: null, status: "empty" })

  useEffect(() => {
    const code = postcode.trim()
    if (!code) return setState({ home: null, status: "empty" })
    if (code.length < config.postcodeLength[country]) return setState({ home: null, status: "loading" })

    let cancelled = false
    loadPostcodes().then(
      (tables) => {
        const hit = tables[country]?.[code]
        if (!cancelled) setState(hit ? { home: { lat: hit[0], lon: hit[1] }, status: "found" } : { home: null, status: "unknown" })
      },
      () => !cancelled && setState({ home: null, status: "unknown" })
    )
    return () => {
      cancelled = true
    }
  }, [postcode, country])

  return state
}
