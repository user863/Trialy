import { useEffect, useState, type ReactNode } from "react"
import type { Gene, Profile, Tri } from "@trial-finder/domain"
import { GENES, MS_THERAPIES } from "@trial-finder/domain"
import { useApp } from "./app"
import { config } from "./config"
import { useI18n, type I18n, type Key } from "./i18n"

type Set = (f: (p: Profile) => Profile) => void

interface Step {
  id: string
  title: Key
  help: Key
  general?: true
  only?: string
  skip?: (p: Profile) => boolean
  body: (p: Profile, set: Set, i18n: I18n) => ReactNode
}

export const HELP_TAGS = { b: (text: string) => <strong>{text}</strong>, em: (text: string) => <em>{text}</em> }


function Choice<T extends string>({
  name,
  value,
  options,
  onChange
}: {
  name: string
  value: T
  options: Array<{ value: T; label: string; hint?: string }>
  onChange: (v: T) => void
}) {
  return (
    <div className="choices" role="radiogroup" aria-label={name}>
      {options.map((o) => (
        <label key={o.value} className={`choice ${value === o.value ? "on" : ""}`}>
          <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} />
          <span>
            <strong>{o.label}</strong>
            {o.hint && <small>{o.hint}</small>}
          </span>
        </label>
      ))}
    </div>
  )
}

function Segments<T extends string>({
  label,
  hint,
  value,
  options,
  onChange
}: {
  label: string
  hint?: string
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (v: T) => void
}) {
  return (
    <fieldset className="row">
      <legend>
        {label}
        {hint && <small>{hint}</small>}
      </legend>
      <div className="seg">
        {options.map((o) => (
          <label key={o.value} className={value === o.value ? "on" : ""}>
            <input type="radio" name={label} checked={value === o.value} onChange={() => onChange(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

const triOptions = (t: I18n["t"]): Array<{ value: Tri; label: string }> => [
  { value: "yes", label: t("answer.yes") },
  { value: "no", label: t("answer.no") },
  { value: "unknown", label: t("answer.unknown") }
]

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  hint
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  hint?: string
}) {
  const [text, setText] = useState(value === null ? "" : String(value))
  useEffect(() => setText(value === null ? "" : String(value)), [value])
  return (
    <label className="field">
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <span className="input-unit">
        <input
          inputMode="decimal"
          value={text}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            setText(e.target.value)
            const v = e.target.value.trim() === "" ? null : Number(e.target.value.replace(",", "."))
            onChange(v === null || !Number.isFinite(v) ? null : v)
          }}
        />
        {unit && <em>{unit}</em>}
      </span>
    </label>
  )
}


const THERAPIES = ["chemotherapy", "immunotherapy", "targeted", "radiotherapy", "surgery"] as const satisfies ReadonlyArray<keyof Profile["priorTherapies"]>

export const STEPS: Step[] = [
  {
    id: "condition",
    title: "step.condition.title",
    help: "step.condition.help",
    general: true,
    body: () => <ConditionStep />
  },
  {
    id: "type",
    title: "step.type.title",
    help: "step.type.help",
    body: (p, set, { t }) => (
      <Choice
        name={t("step.type.name")}
        value={p.cancerType}
        onChange={(v) => set((x) => ({ ...x, cancerType: v }))}
        options={[
          { value: "nsclc", label: t("step.type.nsclc"), hint: t("step.type.nsclc.hint") },
          { value: "sclc", label: t("step.type.sclc") },
          { value: "unknown", label: t("answer.unknown") }
        ]}
      />
    )
  },
  {
    id: "histology",
    title: "step.histology.title",
    skip: (p) => p.cancerType === "sclc",
    help: "step.histology.help",
    body: (p, set, { t }) => (
      <Choice
        name={t("step.histology.name")}
        value={p.histology}
        onChange={(v) => set((x) => ({ ...x, histology: v }))}
        options={[
          { value: "adenocarcinoma", label: t("step.histology.adenocarcinoma") },
          { value: "squamous", label: t("step.histology.squamous") },
          { value: "other", label: t("step.histology.other") },
          { value: "unknown", label: t("answer.unknown") }
        ]}
      />
    )
  },
  {
    id: "stage",
    title: "step.stage.title",
    help: "step.stage.help",
    body: (p, set, { t }) => (
      <Choice
        name={t("step.stage.name")}
        value={p.stage}
        onChange={(v) => set((x) => ({ ...x, stage: v }))}
        options={[
          { value: "I", label: t("stage.I"), hint: t("step.stage.I.hint") },
          { value: "II", label: t("stage.II"), hint: t("step.stage.II.hint") },
          { value: "III", label: t("stage.III"), hint: t("step.stage.III.hint") },
          { value: "IV", label: t("stage.IV"), hint: t("step.stage.IV.hint") },
          { value: "unknown", label: t("answer.unknown") }
        ]}
      />
    )
  },
  {
    id: "extent",
    title: "step.extent.title",
    skip: (p) => p.cancerType !== "sclc",
    help: "step.extent.help",
    body: (p, set, { t }) => (
      <Choice
        name={t("step.extent.name")}
        value={p.sclcExtent}
        onChange={(v) => set((x) => ({ ...x, sclcExtent: v }))}
        options={[
          { value: "limited", label: t("step.extent.limited"), hint: t("step.extent.limited.hint") },
          { value: "extensive", label: t("step.extent.extensive") },
          { value: "unknown", label: t("answer.unknown") }
        ]}
      />
    )
  },
  {
    id: "markers",
    title: "step.markers.title",
    help: "step.markers.help",
    body: (p, set, { t }) => (
      <div className="rows">
        {GENES.map((g) => (
          <Segments
            key={g}
            label={g}
            hint={t(`gene.${g}`)}
            value={p.biomarkers[g] ?? "unknown"}
            onChange={(v) => set((x) => ({ ...x, biomarkers: { ...x.biomarkers, [g]: v } }))}
            options={[
              { value: "positive", label: t("step.markers.found") },
              { value: "negative", label: t("step.markers.notFound") },
              { value: "unknown", label: t("answer.unknown") }
            ]}
          />
        ))}
      </div>
    )
  },
  {
    id: "pdl1",
    title: "step.pdl1.title",
    help: "step.pdl1.help",
    body: (p, set, { t }) => (
      <Choice
        name={t("step.pdl1.name")}
        value={p.pdl1}
        onChange={(v) => set((x) => ({ ...x, pdl1: v }))}
        options={[
          { value: "ge50", label: t("step.pdl1.ge50") },
          { value: "1to49", label: t("step.pdl1.1to49") },
          { value: "lt1", label: t("step.pdl1.lt1") },
          { value: "unknown", label: t("answer.unknown") }
        ]}
      />
    )
  },
  {
    id: "prior",
    title: "step.prior.title",
    help: "step.prior.help",
    body: (p, set, { t }) => (
      <div className="rows">
        {THERAPIES.map((key) => (
          <Segments
            key={key}
            label={t(`therapy.label.${key}`)}
            hint={t(`therapy.hint.${key}`)}
            value={p.priorTherapies[key]}
            onChange={(v) => set((x) => ({ ...x, priorTherapies: { ...x.priorTherapies, [key]: v } }))}
            options={triOptions(t)}
          />
        ))}
      </div>
    )
  },
  {
    id: "lines",
    title: "step.lines.title",
    help: "step.lines.help",
    body: (p, set, { t }) => (
      <>
        <NumberField
          label={t("step.lines.label")}
          value={p.priorLines}
          min={0}
          max={15}
          unit={t("step.lines.unit")}
          onChange={(v) => set((x) => ({ ...x, priorLines: v === null ? null : Math.max(0, Math.round(v)) }))}
        />
        <p className="muted">{t("step.lines.empty")}</p>
      </>
    )
  },
  {
    id: "current",
    title: "step.current.title",
    help: "step.current.help",
    body: (p, set, { t }) => (
      <Choice
        name={t("step.current.name")}
        value={p.currentTherapy}
        onChange={(v) => set((x) => ({ ...x, currentTherapy: v }))}
        options={[
          { value: "none", label: t("step.current.none") },
          { value: "chemotherapy", label: t("therapy.label.chemotherapy") },
          { value: "immunotherapy", label: t("therapy.label.immunotherapy") },
          { value: "targeted", label: t("step.current.targeted") },
          { value: "radiotherapy", label: t("therapy.label.radiotherapy") },
          { value: "unknown", label: t("answer.unknown") }
        ]}
      />
    )
  },
  {
    id: "health",
    title: "step.health.title",
    help: "step.health.help",
    body: (p, set, { t }) => (
      <div className="rows">
        <Segments
          label={t("step.health.brain")}
          value={p.brainMets}
          onChange={(v) => set((x) => ({ ...x, brainMets: v }))}
          options={[
            { value: "none", label: t("step.health.brain.none") },
            { value: "treated", label: t("step.health.brain.treated") },
            { value: "active", label: t("step.health.brain.active") },
            { value: "unknown", label: t("answer.unknown") }
          ]}
        />
        <Segments
          label={t("step.health.ild")}
          hint={t("step.health.ild.hint")}
          value={p.ild}
          onChange={(v) => set((x) => ({ ...x, ild: v }))}
          options={triOptions(t)}
        />
        <Segments
          label={t("step.health.autoimmune")}
          hint={t("step.health.autoimmune.hint")}
          value={p.autoimmune}
          onChange={(v) => set((x) => ({ ...x, autoimmune: v }))}
          options={triOptions(t)}
        />
      </div>
    )
  },
  {
    id: "mscourse",
    title: "step.mscourse.title",
    help: "step.mscourse.help",
    only: "ms",
    body: (p, set, { t }) => (
      <Choice
        name={t("step.mscourse.name")}
        value={p.msCourse}
        onChange={(v) => set((x) => ({ ...x, msCourse: v }))}
        options={[
          { value: "rrms", label: t("step.mscourse.rrms"), hint: t("step.mscourse.rrms.hint") },
          { value: "spms", label: t("step.mscourse.spms"), hint: t("step.mscourse.spms.hint") },
          { value: "ppms", label: t("step.mscourse.ppms"), hint: t("step.mscourse.ppms.hint") },
          { value: "cis", label: t("step.mscourse.cis"), hint: t("step.mscourse.cis.hint") },
          { value: "unknown", label: t("answer.unknown") }
        ]}
      />
    )
  },
  {
    id: "edss",
    title: "step.edss.title",
    help: "step.edss.help",
    only: "ms",
    body: (p, set, { t }) => (
      <NumberField
        label={t("step.edss.label")}
        hint={t("step.edss.hint")}
        value={p.edss}
        min={0}
        max={10}
        step={0.5}
        onChange={(v) => set((x) => ({ ...x, edss: v === null ? null : Math.min(10, Math.max(0, Math.round(v * 2) / 2)) }))}
      />
    )
  },
  {
    id: "relapse",
    title: "step.relapse.title",
    help: "step.relapse.help",
    only: "ms",
    body: (p, set, { t }) => (
      <Choice
        name={t("step.relapse.name")}
        value={p.lastRelapse}
        onChange={(v) => set((x) => ({ ...x, lastRelapse: v }))}
        options={[
          { value: "lt1", label: t("step.relapse.lt1") },
          { value: "1to3", label: t("step.relapse.1to3") },
          { value: "3to12", label: t("step.relapse.3to12") },
          { value: "12to24", label: t("step.relapse.12to24") },
          { value: "gt24", label: t("step.relapse.gt24") },
          { value: "unknown", label: t("answer.unknown") }
        ]}
      />
    )
  },
  {
    id: "mstherapy",
    title: "step.mstherapy.title",
    help: "step.mstherapy.help",
    only: "ms",
    body: (p, set, { t }) => (
      <div className="rows">
        {MS_THERAPIES.map((key) => (
          <Segments
            key={key}
            label={t(`mstherapy.${key}`)}
            hint={t(`mstherapy.${key}.hint`)}
            value={p.msTherapies[key]}
            onChange={(v) => set((x) => ({ ...x, msTherapies: { ...x.msTherapies, [key]: v } }))}
            options={triOptions(t)}
          />
        ))}
      </div>
    )
  },
  {
    id: "mshealth",
    title: "step.mshealth.title",
    help: "step.mshealth.help",
    only: "ms",
    body: (p, set, { t }) => (
      <div className="rows">
        {p.sex !== "male" && (
          <Segments label={t("step.mshealth.pregnancy")} value={p.pregnancy} onChange={(v) => set((x) => ({ ...x, pregnancy: v }))} options={triOptions(t)} />
        )}
        <Segments label={t("step.mshealth.mri")} hint={t("step.mshealth.mri.hint")} value={p.mriUnsuitable} onChange={(v) => set((x) => ({ ...x, mriUnsuitable: v }))} options={triOptions(t)} />
        <Segments label={t("step.mshealth.steroids")} hint={t("step.mshealth.steroids.hint")} value={p.recentSteroids} onChange={(v) => set((x) => ({ ...x, recentSteroids: v }))} options={triOptions(t)} />
        <Segments label={t("step.mshealth.infection")} hint={t("step.mshealth.infection.hint")} value={p.chronicInfection} onChange={(v) => set((x) => ({ ...x, chronicInfection: v }))} options={triOptions(t)} />
        <Segments label={t("step.mshealth.cancer")} hint={t("step.mshealth.cancer.hint")} value={p.cancerHistory} onChange={(v) => set((x) => ({ ...x, cancerHistory: v }))} options={triOptions(t)} />
      </div>
    )
  },
  {
    id: "person",
    title: "step.person.title",
    help: "step.person.help",
    general: true,
    body: (p, set, { t }) => (
      <>
        <NumberField label={t("step.person.age")} value={p.age} min={18} max={110} unit={t("step.person.years")} onChange={(v) => set((x) => ({ ...x, age: v }))} />
        <Choice
          name={t("step.person.sex")}
          value={p.sex}
          onChange={(v) => set((x) => ({ ...x, sex: v }))}
          options={[
            { value: "female", label: t("step.person.female") },
            { value: "male", label: t("step.person.male") },
            { value: "unknown", label: t("step.person.unknown") }
          ]}
        />
      </>
    )
  },
  {
    id: "fitness",
    title: "step.fitness.title",
    help: "step.fitness.help",
    body: (p, set, { t }) => {
      const val = p.ecog === null ? "unknown" : String(p.ecog)
      return (
        <Choice
          name={t("step.fitness.name")}
          value={val}
          onChange={(v) => set((x) => ({ ...x, ecog: v === "unknown" ? null : Number(v) }))}
          options={[
            { value: "0", label: t("step.fitness.0"), hint: t("step.fitness.0.hint") },
            { value: "1", label: t("step.fitness.1"), hint: t("step.fitness.1.hint") },
            { value: "2", label: t("step.fitness.2"), hint: t("step.fitness.2.hint") },
            { value: "3", label: t("step.fitness.3"), hint: t("step.fitness.3.hint") },
            { value: "4", label: t("step.fitness.4"), hint: t("step.fitness.4.hint") },
            { value: "unknown", label: t("answer.unknown") }
          ]}
        />
      )
    }
  },
  {
    id: "labs",
    title: "step.labs.title",
    help: "step.labs.help",
    body: (p, set, { t }) => (
      <div className="rows">
        <NumberField label={t("step.labs.anc")} unit="×10⁹/L" hint={t("step.labs.anc.hint")} value={p.labs.anc} onChange={(v) => set((x) => ({ ...x, labs: { ...x.labs, anc: v } }))} />
        <NumberField label={t("step.labs.platelets")} unit="×10⁹/L" hint={t("step.labs.platelets.hint")} value={p.labs.platelets} onChange={(v) => set((x) => ({ ...x, labs: { ...x.labs, platelets: v } }))} />
        <NumberField label={t("step.labs.hemoglobin")} unit="g/dL" hint={t("step.labs.hemoglobin.hint")} value={p.labs.hemoglobin} onChange={(v) => set((x) => ({ ...x, labs: { ...x.labs, hemoglobin: v } }))} />
        <NumberField label={t("step.labs.crcl")} unit="mL/min" hint={t("step.labs.crcl.hint")} value={p.labs.crcl} onChange={(v) => set((x) => ({ ...x, labs: { ...x.labs, crcl: v } }))} />
      </div>
    )
  },
  {
    id: "where",
    title: "step.where.title",
    help: "step.where.help",
    general: true,
    body: (p, set) => <WhereStep p={p} set={set} />
  }
]

function ConditionStep() {
  const { t, tOr } = useI18n()
  const { groups, group, setGroup } = useApp()
  return (
    <Choice
      name={t("step.condition.name")}
      value={group}
      onChange={setGroup}
      options={groups.map((g) => ({ value: g.id, label: tOr(`group.${g.id}`, g.label), hint: tOr(`step.condition.${g.id}.hint`, "") || undefined }))}
    />
  )
}

function WhereStep({ p, set }: { p: Profile; set: Set }) {
  const { t, countryName } = useI18n()
  const { postcodeStatus, home } = useApp()
  return (
    <>
      <label className="field">
        <span>{t("where.country")}</span>
        <select value={p.country} onChange={(e) => set((x) => ({ ...x, country: e.target.value as Profile["country"], postcode: "" }))}>
          {config.homeCountries.map((c) => <option key={c.code} value={c.code}>{countryName(c.name)}</option>)}
        </select>
      </label>
      <label className="field">
        <span>{t("step.where.postcode")}</span>
        <input
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={config.postcodeLength[p.country]}
          value={p.postcode}
          onChange={(e) => set((x) => ({ ...x, postcode: e.target.value.replace(/\D/g, "") }))}
        />
      </label>
      <p className="muted" aria-live="polite">
        {postcodeStatus === "found" && home && t("step.where.found")}
        {postcodeStatus === "unknown" && t("step.where.unknown")}
        {postcodeStatus === "empty" && t("step.where.empty")}
      </p>
    </>
  )
}

export const stepsFor = (group: string, profile: Profile): Step[] =>
  STEPS.filter((s) => (s.general || (s.only ?? config.group) === group) && !s.skip?.(profile))

export const STEP_FOR_FIELD = (field: string): string => {
  if (field.startsWith("biomarker:")) return "markers"
  if (field.startsWith("priorTherapy:")) return "prior"
  if (field.startsWith("lab:")) return "labs"
  if (field.startsWith("msTherapy:")) return "mstherapy"
  const map: Record<string, string> = {
    cancerType: "type",
    histology: "histology",
    stage: "stage",
    sclcExtent: "extent",
    pdl1: "pdl1",
    priorLines: "lines",
    currentTherapy: "current",
    age: "person",
    sex: "person",
    ecog: "fitness",
    brainMets: "health",
    ild: "health",
    autoimmune: "health",
    msCourse: "mscourse",
    edss: "edss",
    lastRelapse: "relapse",
    pregnancy: "mshealth",
    mriUnsuitable: "mshealth",
    recentSteroids: "mshealth",
    chronicInfection: "mshealth",
    cancerHistory: "mshealth"
  }
  return map[field] ?? "type"
}

const FIELD_KEYS = [
  "cancerType",
  "histology",
  "stage",
  "sclcExtent",
  "pdl1",
  "priorLines",
  "currentTherapy",
  "age",
  "sex",
  "ecog",
  "brainMets",
  "ild",
  "autoimmune",
  "msCourse",
  "edss",
  "lastRelapse",
  "pregnancy",
  "mriUnsuitable",
  "recentSteroids",
  "chronicInfection",
  "cancerHistory"
] as const

export const fieldLabel = (t: I18n["t"], tOr: I18n["tOr"], field: string): string => {
  if (field.startsWith("biomarker:")) return t("field.biomarker", { gene: field.slice(10) })
  if (field.startsWith("priorTherapy:")) {
    const therapy = field.slice(13)
    return t("field.priorTherapy", { therapy: tOr(`therapy.${therapy}`, therapy) })
  }
  if (field.startsWith("lab:")) return t("field.lab", { lab: field.slice(4) })
  if (field.startsWith("msTherapy:")) return t("field.msTherapy", { therapy: tOr(`mstherapy.${field.slice(10)}`, field.slice(10)) })
  const known = FIELD_KEYS.find((k) => k === field)
  return known ? t(`field.${known}`) : field
}
