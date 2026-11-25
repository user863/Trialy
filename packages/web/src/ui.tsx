import type { ReactNode } from "react"
import { useApp } from "./app"
import { useI18n, type Key } from "./i18n"

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

const SUPPORT = {
  lung: {
    text: "support.text",
    links: ["https://www.krebsinformationsdienst.de", "https://www.krebshilfe.de/informieren/ueber-krebs/infonetz-krebs/"]
  },
  ms: {
    text: "support.ms.text",
    links: ["https://www.dmsg.de", "https://www.kompetenznetz-multiplesklerose.de"]
  }
} as const satisfies Record<string, { text: Key; links: readonly [string, string] }>

export function Support() {
  const { rich } = useI18n()
  const { group } = useApp()
  const support = SUPPORT[group as keyof typeof SUPPORT]
  if (!support) return null
  const link = (href: string) => (name: ReactNode) => <a href={href} rel="noreferrer noopener">{name}</a>
  return (
    <p className="support">
      {rich(support.text, { link1: link(support.links[0]), link2: link(support.links[1]), b: (text) => <strong>{text}</strong> })}
    </p>
  )
}

export function Disclaimer() {
  const { rich } = useI18n()
  return <p className="disclaimer">{rich("disclaimer.text", { b: (text) => <strong>{text}</strong> })}</p>
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

export const Logo = () => <img className="logo" src={`${import.meta.env.BASE_URL}logo.svg`} alt="" width="24" height="24" />
