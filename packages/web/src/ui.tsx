import type { ReactNode } from "react"

export const go = (to: string) => {
  window.location.hash = to
}

export function A({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  return (
    <a href={`#${to}`} className={className}>
      {children}
    </a>
  )
}

export function Support() {
  return (
    <p className="support">
      Need to talk to someone? The <a href="https://www.krebsinformationsdienst.de" rel="noreferrer noopener">Krebsinformationsdienst</a> (DKFZ) answers
      questions free of charge on <strong>0800 420 30 40</strong>, and the{" "}
      <a href="https://www.krebshilfe.de/informieren/ueber-krebs/infonetz-krebs/" rel="noreferrer noopener">INFONETZ KREBS</a> on{" "}
      <strong>0800 80708877</strong>. Both can also point you to psycho-oncology support.
    </p>
  )
}

export function Disclaimer() {
  return (
    <p className="disclaimer">
      These are <strong>possible fits to discuss with your doctor</strong>, not a promise that a trial will help or that you qualify. Data comes from public
      registries and may be incomplete or out of date. The treating team always decides.
    </p>
  )
}

export const NO_RECRUITING_SITE =
  "ClinicalTrials.gov lists this study as recruiting overall, but none of its sites in Germany, Austria, Switzerland or the neighbouring countries say they are recruiting. It stays in the list, ranked lower. Ask the study team before travelling."

export function TierBadge({ tier, sites }: { tier: 0 | 1 | 2; sites: number }) {
  if (tier === 2) return <span className="pill live">Recruiting · {sites} site{sites === 1 ? "" : "s"}</span>
  if (tier === 1) return <span className="pill caution" title="The registry does not state whether the sites are recruiting. Confirm with the study team.">Site status not stated</span>
  return <span className="pill caution" title={NO_RECRUITING_SITE}>No recruiting site listed</span>
}

export const formatKm = (km: number | null) => (km === null ? null : km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`)

export const fulfilledLine = (met: number, total: number, notMet: number) =>
  `${met} of ${total} criteria fulfilled${notMet > 0 ? ` · ${notMet} not fulfilled` : ""}`

const LOGO_CLIP = "M32 0 L64 0 C81.673 0 96 14.327 96 32 L96 64 C96 81.673 81.673 96 64 96 L32 96 C14.327 96 0 81.673 0 64 L0 32 C0 14.327 14.327 0 32 0 Z"
const brand = { fill: "var(--brand)" }
const tube = { fill: "none", stroke: "#fff", strokeWidth: 11, strokeLinecap: "round", strokeLinejoin: "round" } as const

export const Logo = () => (
  <svg className="logo" viewBox="0 0 96 96" aria-hidden="true">
    <defs>
      <clipPath id="logo-clip">
        <path d={LOGO_CLIP} />
      </clipPath>
    </defs>
    <g clipPath="url(#logo-clip)">
      <path d="M0 0 L96 0 L96 96 L0 96 Z" style={brand} />
      <path d="M72.901 -28.852 L73.483 22.378" style={tube} />
      <path d="M73.44 19.709 C74.666 89.289 36.514 -24.201 40.452 50.677" style={tube} />
      <path d="M34.947 48.747 C43.012 46.015 51.765 50.338 54.497 58.403 C57.229 66.468 52.905 75.221 44.84 77.953 C36.775 80.684 28.023 76.361 25.291 68.296 C22.559 60.231 26.882 51.479 34.947 48.747 Z" fill="#fff" />
      <path d="M37.515 56.328 C41.393 55.014 45.602 57.093 46.916 60.971 C48.23 64.849 46.151 69.058 42.272 70.372 C38.394 71.686 34.185 69.607 32.872 65.728 C31.558 61.85 33.637 57.641 37.515 56.328 Z" style={brand} />
    </g>
  </svg>
)
