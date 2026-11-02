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

export const Logo = () => (
  <span className="logo" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="4.4" r="2.1" fill="#fff" stroke="none" />
      <path d="M12 5.5V21.5" />
      <path d="M16.5 7.5H12C7.5 7.5 7.5 11.1 12 11.1C16.5 11.1 16.5 14.7 12 14.7C7.5 14.7 7.5 18.3 12 18.3H15.5" />
    </svg>
  </span>
)
