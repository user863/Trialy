import { useEffect, useState, type ReactNode } from "react"
import type { Gene, Profile, Tri } from "@trial-finder/domain"
import { GENES } from "@trial-finder/domain"
import { useApp } from "./app"
import { config } from "./config"

type Set = (f: (p: Profile) => Profile) => void

interface Step {
  id: string
  title: string
  help: ReactNode
  skip?: (p: Profile) => boolean
  body: (p: Profile, set: Set) => ReactNode
}


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

const TRI: Array<{ value: Tri; label: string }> = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unknown", label: "I don’t know" }
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


const GENE_NOTE: Record<Gene, string> = {
  EGFR: "EGFR mutation (e.g. exon 19 deletion, L858R, exon 20 insertion)",
  ALK: "ALK rearrangement",
  ROS1: "ROS1 rearrangement",
  KRAS: "KRAS mutation (e.g. G12C)",
  BRAF: "BRAF mutation (e.g. V600E)",
  MET: "MET exon 14 skipping or amplification",
  RET: "RET fusion",
  HER2: "HER2 (ERBB2) mutation",
  NTRK: "NTRK fusion",
  NRG1: "NRG1 fusion"
}

const THERAPIES: Array<{ key: keyof Profile["priorTherapies"]; label: string; hint: string }> = [
  { key: "chemotherapy", label: "Chemotherapy", hint: "for example cisplatin, carboplatin, pemetrexed, docetaxel, etoposide" },
  { key: "immunotherapy", label: "Immunotherapy", hint: "for example pembrolizumab (Keytruda), nivolumab, atezolizumab, durvalumab" },
  { key: "targeted", label: "Targeted therapy (tablets for a gene change)", hint: "for example osimertinib, alectinib, lorlatinib, sotorasib" },
  { key: "radiotherapy", label: "Radiotherapy", hint: "radiation of the lung, brain or elsewhere" },
  { key: "surgery", label: "Surgery on the tumour", hint: "removal of part of the lung or other tumour surgery" }
]

export const STEPS: Step[] = [
  {
    id: "type",
    title: "What type of lung cancer was diagnosed?",
    help: (
      <>
        Look under “Diagnosis” (<em>Diagnose</em>) in your doctor’s letter or pathology report. <strong>NSCLC</strong> =
        non-small cell (<em>nicht-kleinzelliges Lungenkarzinom</em>). <strong>SCLC</strong> = small cell (
        <em>kleinzelliges Lungenkarzinom</em>). Other types, such as mesothelioma, are not covered yet.
      </>
    ),
    body: (p, set) => (
      <Choice
        name="Cancer type"
        value={p.cancerType}
        onChange={(v) => set((x) => ({ ...x, cancerType: v }))}
        options={[
          { value: "nsclc", label: "Non-small cell lung cancer (NSCLC)", hint: "the most common type" },
          { value: "sclc", label: "Small cell lung cancer (SCLC)" },
          { value: "unknown", label: "I don’t know" }
        ]}
      />
    )
  },
  {
    id: "histology",
    title: "What does the tissue look like under the microscope?",
    skip: (p) => p.cancerType === "sclc",
    help: (
      <>
        Also in the pathology report (<em>Histologie</em>). <strong>Adenocarcinoma</strong> and <strong>squamous cell
        carcinoma</strong> (<em>Plattenepithelkarzinom</em>) are the two most common kinds of NSCLC.
      </>
    ),
    body: (p, set) => (
      <Choice
        name="Histology"
        value={p.histology}
        onChange={(v) => set((x) => ({ ...x, histology: v }))}
        options={[
          { value: "adenocarcinoma", label: "Adenocarcinoma (Adenokarzinom)" },
          { value: "squamous", label: "Squamous cell carcinoma (Plattenepithelkarzinom)" },
          { value: "other", label: "Something else" },
          { value: "unknown", label: "I don’t know" }
        ]}
      />
    )
  },
  {
    id: "stage",
    title: "How far has the cancer spread?",
    help: (
      <>
        Doctors write a stage from I to IV (<em>UICC-Stadium</em>) or describe the disease as “localised”, “locally advanced” or
        “metastatic” (<em>metastasiert</em>). Stage IV or “metastatic” means it has spread to other organs.
      </>
    ),
    body: (p, set) => (
      <Choice
        name="Stage"
        value={p.stage}
        onChange={(v) => set((x) => ({ ...x, stage: v }))}
        options={[
          { value: "I", label: "Stage I", hint: "small, in one place" },
          { value: "II", label: "Stage II", hint: "larger or in nearby lymph nodes" },
          { value: "III", label: "Stage III", hint: "locally advanced" },
          { value: "IV", label: "Stage IV", hint: "metastatic, spread to other organs" },
          { value: "unknown", label: "I don’t know" }
        ]}
      />
    )
  },
  {
    id: "extent",
    title: "Limited or extensive disease?",
    skip: (p) => p.cancerType !== "sclc",
    help: <>For small cell lung cancer doctors often say “limited” (<em>limited disease</em>) or “extensive” (<em>extensive disease</em>) instead of a stage.</>,
    body: (p, set) => (
      <Choice
        name="SCLC extent"
        value={p.sclcExtent}
        onChange={(v) => set((x) => ({ ...x, sclcExtent: v }))}
        options={[
          { value: "limited", label: "Limited disease", hint: "within one area that can be treated with radiation" },
          { value: "extensive", label: "Extensive disease" },
          { value: "unknown", label: "I don’t know" }
        ]}
      />
    )
  },
  {
    id: "markers",
    title: "Gene changes found in the tumour",
    help: (
      <>
        These come from molecular testing of the tumour (<em>Molekularpathologie, Next-Generation-Sequencing</em>). Choose “Found” only
        if your report names a change; choose “Not found” if the test looked and the result was negative. If it was not tested or you
        can’t tell, leave “I don’t know”. That never excludes a trial.
      </>
    ),
    body: (p, set) => (
      <div className="rows">
        {GENES.map((g) => (
          <Segments
            key={g}
            label={g}
            hint={GENE_NOTE[g]}
            value={p.biomarkers[g] ?? "unknown"}
            onChange={(v) => set((x) => ({ ...x, biomarkers: { ...x.biomarkers, [g]: v } }))}
            options={[
              { value: "positive", label: "Found" },
              { value: "negative", label: "Not found" },
              { value: "unknown", label: "I don’t know" }
            ]}
          />
        ))}
      </div>
    )
  },
  {
    id: "pdl1",
    title: "PD-L1 level",
    help: <>Reported as a percentage, often “TPS” (<em>Tumor Proportion Score</em>) or “PD-L1-Expression”, from the pathology report.</>,
    body: (p, set) => (
      <Choice
        name="PD-L1"
        value={p.pdl1}
        onChange={(v) => set((x) => ({ ...x, pdl1: v }))}
        options={[
          { value: "ge50", label: "50% or higher" },
          { value: "1to49", label: "1% to 49%" },
          { value: "lt1", label: "Below 1% (negative)" },
          { value: "unknown", label: "I don’t know" }
        ]}
      />
    )
  },
  {
    id: "prior",
    title: "Which treatments have you already had for the cancer?",
    help: <>See “Therapie” or “bisherige Behandlung” in your letters. Include treatment at any time, also before the cancer spread.</>,
    body: (p, set) => (
      <div className="rows">
        {THERAPIES.map((t) => (
          <Segments
            key={t.key}
            label={t.label}
            hint={t.hint}
            value={p.priorTherapies[t.key]}
            onChange={(v) => set((x) => ({ ...x, priorTherapies: { ...x.priorTherapies, [t.key]: v } }))}
            options={TRI}
          />
        ))}
      </div>
    )
  },
  {
    id: "lines",
    title: "How many rounds of drug treatment for advanced disease?",
    help: (
      <>
        A “line” (<em>Therapielinie</em>) is one treatment plan given because the cancer had spread or come back. A new line starts when the
        plan is changed because the cancer grew. Treatment given after surgery to prevent a return does not count. If you have not had any
        drug treatment for advanced disease yet, enter 0.
      </>
    ),
    body: (p, set) => (
      <>
        <NumberField
          label="Lines of drug treatment so far"
          value={p.priorLines}
          min={0}
          max={15}
          unit="lines"
          onChange={(v) => set((x) => ({ ...x, priorLines: v === null ? null : Math.max(0, Math.round(v)) }))}
        />
        <p className="muted">Leave empty if you don’t know.</p>
      </>
    )
  },
  {
    id: "current",
    title: "What treatment are you on right now?",
    help: <>Whatever you are currently being treated with. Choose “none” if you are between treatments or not treated at the moment.</>,
    body: (p, set) => (
      <Choice
        name="Current treatment"
        value={p.currentTherapy}
        onChange={(v) => set((x) => ({ ...x, currentTherapy: v }))}
        options={[
          { value: "none", label: "No treatment right now" },
          { value: "chemotherapy", label: "Chemotherapy" },
          { value: "immunotherapy", label: "Immunotherapy" },
          { value: "targeted", label: "Targeted therapy" },
          { value: "radiotherapy", label: "Radiotherapy" },
          { value: "unknown", label: "I don’t know" }
        ]}
      />
    )
  },
  {
    id: "health",
    title: "Other health conditions that trials often ask about",
    help: <>Check your letters for “Hirnmetastasen”, “Lungenfibrose / interstitielle Lungenerkrankung (ILD)” or “Autoimmunerkrankung”.</>,
    body: (p, set) => (
      <div className="rows">
        <Segments
          label="Cancer in the brain (brain metastases)"
          value={p.brainMets}
          onChange={(v) => set((x) => ({ ...x, brainMets: v }))}
          options={[
            { value: "none", label: "None" },
            { value: "treated", label: "Yes, treated and stable" },
            { value: "active", label: "Yes, untreated or causing symptoms" },
            { value: "unknown", label: "I don’t know" }
          ]}
        />
        <Segments
          label="Scarring or inflammation of the lung tissue"
          hint="interstitial lung disease, pulmonary fibrosis, pneumonitis"
          value={p.ild}
          onChange={(v) => set((x) => ({ ...x, ild: v }))}
          options={TRI}
        />
        <Segments
          label="An autoimmune disease"
          hint="for example rheumatoid arthritis, lupus, Crohn’s disease, multiple sclerosis"
          value={p.autoimmune}
          onChange={(v) => set((x) => ({ ...x, autoimmune: v }))}
          options={TRI}
        />
      </div>
    )
  },
  {
    id: "person",
    title: "About you",
    help: <>Age and sex are used for the age and sex limits many trials have. Nothing here is sent anywhere.</>,
    body: (p, set) => (
      <>
        <NumberField label="Age" value={p.age} min={18} max={110} unit="years" onChange={(v) => set((x) => ({ ...x, age: v }))} />
        <Choice
          name="Sex"
          value={p.sex}
          onChange={(v) => set((x) => ({ ...x, sex: v }))}
          options={[
            { value: "female", label: "Female" },
            { value: "male", label: "Male" },
            { value: "unknown", label: "Prefer not to say" }
          ]}
        />
      </>
    )
  },
  {
    id: "fitness",
    title: "How are you managing day to day?",
    help: (
      <>
        Doctors summarise this as the “ECOG performance status” (<em>ECOG-Performance-Status</em>, 0 to 4). If your letter names a number you can pick
        the matching description. Otherwise choose the one that fits best.
      </>
    ),
    body: (p, set) => {
      const val = p.ecog === null ? "unknown" : String(p.ecog)
      return (
        <Choice
          name="Day-to-day condition"
          value={val}
          onChange={(v) => set((x) => ({ ...x, ecog: v === "unknown" ? null : Number(v) }))}
          options={[
            { value: "0", label: "Fully active", hint: "I can do everything as before the illness (ECOG 0)" },
            { value: "1", label: "Slightly limited", hint: "I tire more easily but can walk and do light work (ECOG 1)" },
            { value: "2", label: "Up and about, but can’t work", hint: "I look after myself and am up more than half the day (ECOG 2)" },
            { value: "3", label: "Limited self-care", hint: "I am in bed or a chair more than half the day (ECOG 3)" },
            { value: "4", label: "Needing full care", hint: "I can’t look after myself at all (ECOG 4)" },
            { value: "unknown", label: "I don’t know" }
          ]}
        />
      )
    }
  },
  {
    id: "labs",
    title: "Blood test values (optional)",
    help: <>Only if you have a recent blood count handy (<em>Blutbild</em>). Leave anything you can’t find empty. It is perfectly fine to skip this page.</>,
    body: (p, set) => (
      <div className="rows">
        <NumberField label="Neutrophils (ANC)" unit="×10⁹/L" hint="also “Neutrophile”; 1500/µL = 1.5" value={p.labs.anc} onChange={(v) => set((x) => ({ ...x, labs: { ...x.labs, anc: v } }))} />
        <NumberField label="Platelets" unit="×10⁹/L" hint="“Thrombozyten”; 150 000/µL = 150" value={p.labs.platelets} onChange={(v) => set((x) => ({ ...x, labs: { ...x.labs, platelets: v } }))} />
        <NumberField label="Hemoglobin" unit="g/dL" hint="“Hämoglobin”; 90 g/L = 9" value={p.labs.hemoglobin} onChange={(v) => set((x) => ({ ...x, labs: { ...x.labs, hemoglobin: v } }))} />
        <NumberField label="Creatinine clearance" unit="mL/min" hint="kidney function (“GFR”, “Kreatinin-Clearance”)" value={p.labs.crcl} onChange={(v) => set((x) => ({ ...x, labs: { ...x.labs, crcl: v } }))} />
      </div>
    )
  },
  {
    id: "where",
    title: "Where do you live?",
    help: (
      <>
        Used to sort trials by distance. Your postcode is looked up in a table inside this page. It is <strong>not</strong> sent to any
        routing or map service. Distances are straight-line estimates.
      </>
    ),
    body: (p, set) => <WhereStep p={p} set={set} />
  }
]

function WhereStep({ p, set }: { p: Profile; set: Set }) {
  const { postcodeStatus, home } = useApp()
  return (
    <>
      <Choice
        name="Country"
        value={p.country}
        onChange={(v) => set((x) => ({ ...x, country: v, postcode: "" }))}
        options={[
          { value: "DE", label: "Germany" },
          { value: "AT", label: "Austria" },
          { value: "CH", label: "Switzerland" }
        ]}
      />
      <label className="field">
        <span>Postcode</span>
        <input
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={config.postcodeLength[p.country]}
          value={p.postcode}
          onChange={(e) => set((x) => ({ ...x, postcode: e.target.value.replace(/\D/g, "") }))}
        />
      </label>
      <p className="muted" aria-live="polite">
        {postcodeStatus === "found" && home && "Found. Distances will be shown from the centre of this postcode area."}
        {postcodeStatus === "unknown" && "We don’t know this postcode, so distances stay hidden. You can still use every other feature."}
        {postcodeStatus === "empty" && "Optional. Without it, trials are not sorted by distance."}
      </p>
    </>
  )
}

export const STEP_FOR_FIELD = (field: string): string => {
  if (field.startsWith("biomarker:")) return "markers"
  if (field.startsWith("priorTherapy:")) return "prior"
  if (field.startsWith("lab:")) return "labs"
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
    autoimmune: "health"
  }
  return map[field] ?? "type"
}

export const FIELD_LABEL = (field: string): string => {
  if (field.startsWith("biomarker:")) return `${field.slice(10)} gene result`
  if (field.startsWith("priorTherapy:")) return `previous ${field.slice(13) === "systemic" ? "drug treatment" : field.slice(13)}`
  if (field.startsWith("lab:")) return `blood value (${field.slice(4)})`
  const map: Record<string, string> = {
    cancerType: "lung cancer type",
    histology: "tissue type",
    stage: "stage",
    sclcExtent: "limited or extensive disease",
    pdl1: "PD-L1 level",
    priorLines: "lines of drug treatment",
    currentTherapy: "current treatment",
    age: "age",
    sex: "sex",
    ecog: "day-to-day condition",
    brainMets: "brain metastases",
    ild: "lung scarring / inflammation",
    autoimmune: "autoimmune disease"
  }
  return map[field] ?? field
}
