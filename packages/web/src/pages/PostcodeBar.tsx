import type { Profile } from "@trial-finder/domain"
import { useApp } from "../app"
import { config } from "../config"
import { useI18n } from "../i18n"

export function PostcodeBar() {
  const { t: tr, countryName } = useI18n()
  const { profile, setProfile, postcodeStatus } = useApp()
  const length = config.postcodeLength[profile.country]

  return (
    <section className="card where" aria-label={tr("where.label")}>
      <label className="field">
        <span>{tr("where.country")}</span>
        <select value={profile.country} onChange={(e) => setProfile((p) => ({ ...p, country: e.target.value as Profile["country"], postcode: "" }))}>
          {config.homeCountries.map((c) => <option key={c.code} value={c.code}>{countryName(c.name)}</option>)}
        </select>
      </label>
      <label className="field">
        <span>{tr("where.postcode", { length })}</span>
        <input
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={length}
          placeholder={config.homeCountries.find((c) => c.code === profile.country)?.example}
          value={profile.postcode}
          onChange={(e) => setProfile((p) => ({ ...p, postcode: e.target.value.replace(/\D/g, "") }))}
        />
      </label>
      <p className="meta" aria-live="polite">{tr(`where.${postcodeStatus}`)}</p>
    </section>
  )
}
