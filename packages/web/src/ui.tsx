import type { ReactNode } from "react"
import { useApp } from "./app"
import { config } from "./config"
import { useI18n } from "./i18n"

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
  const { rich } = useI18n()
  const { group } = useApp()
  if (group !== config.group) return null
  return (
    <p className="support">
      {rich("support.text", {
        link1: (name) => <a href="https://www.krebsinformationsdienst.de" rel="noreferrer noopener">{name}</a>,
        link2: (name) => <a href="https://www.krebshilfe.de/informieren/ueber-krebs/infonetz-krebs/" rel="noreferrer noopener">{name}</a>,
        b: (text) => <strong>{text}</strong>
      })}
    </p>
  )
}

export function Disclaimer() {
  const { rich } = useI18n()
  return <p className="disclaimer">{rich("disclaimer.text", { b: (text) => <strong>{text}</strong> })}</p>
}

export function RegistryEnglishNote() {
  const { language, t } = useI18n()
  return language === "en" ? null : <p className="meta">{t("language.registryEnglish")}</p>
}

export function TierBadge({ tier, sites }: { tier: 0 | 1 | 2; sites: number }) {
  const { t } = useI18n()
  if (tier === 2) return <span className="pill live">{t("tier.recruiting", { count: sites })}</span>
  if (tier === 1) return <span className="pill caution" title={t("tier.unstated.title")}>{t("tier.unstated")}</span>
  return <span className="pill caution" title={t("tier.none.title")}>{t("tier.none")}</span>
}

export const useFulfilledLine = () => {
  const { t } = useI18n()
  return (met: number, total: number, notMet: number) =>
    [t("fulfilled.line", { met, total }), ...(notMet > 0 ? [t("fulfilled.notMet", { notMet })] : [])].join(" · ")
}

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
