# TrialBase

A clinical trial finder where the patient's answers never leave the browser.

You tell it your diagnosis, stage, biomarkers, prior treatments and postcode. It matches that against recruiting trials from ClinicalTrials.gov and shows, criterion by criterion, what you meet, what you don't, and what nobody can tell yet. The matching runs in a web worker on your machine. There is no backend, no account and no analytics.

This is a prototype. It covers lung cancer in Germany, Austria, Switzerland and their neighbours (about 330 trials). It is not medical advice and the UI says so in a few places.

## Why

Most trial search tools make you type your medical history into a server. The ones that use an LLM per patient-trial pair also can't tell you why a trial was shown or hidden. Here the eligibility text of each trial is turned into structured rules once, in a pipeline, and the browser evaluates those rules against your profile. Same input, same output, and you can read the original sentence next to every verdict.

The part I care most about: `unknown` never excludes a trial. If a criterion needs data you didn't give (or that is only in a lab report), the trial stays, marked as open. Only a clearly failed criterion hides it.

## Layout

```
packages/
  domain/    types, matching engine, JSON Schema export
  pipeline/  ClinicalTrials.gov v2 -> normalise -> extract rules -> publish bundle
  web/       Vite + React frontend
```

`domain` is plain TypeScript with Effect Schema and has no I/O. Both the pipeline and the web app depend on it, which is how they agree on the rule format.

## Running it

```bash
npm install
npm run pipeline    # fetch trials, write packages/web/public/data/
npm run dev         # http://localhost:5173
npm test
npm run build       # static site in packages/web/dist
```

`npm run pipeline -- --limit 30 --skip-geo` is a fast run for development. The pipeline needs internet, the built site doesn't.

Config comes from environment variables, see `packages/pipeline/src/config.ts` and `packages/web/src/config.ts`. The dev server binds to 127.0.0.1; set `PORT` to change it.

## How matching works

Every criterion becomes a `Rule`: cancer type, stage, biomarker, prior therapy, lab value, age, ECOG and so on, plus `anyOf` / `allOf` / `not` and a catch-all `other`. A rule evaluates to yes, no or unknown (Kleene logic). Inclusion and exclusion criteria differ only in polarity.

Trials are ranked by: no failed criteria, then a recruiting site nearby, then most criteria met, then fewest unknowns, then distance. A trial that is "recruiting" in the registry but has no recruiting site in your region is not dropped. It is shown further down, dimmed, with a note. That was a deliberate call: some of those are still worth a conversation with a doctor.

## The extractor

Free-text criteria are the hard part. The current extractor (`packages/pipeline/src/extract.ts`) is rule-based and conservative on purpose. It only structures sentences it fully understands and falls back to `other` otherwise. Things that tripped it up and now have regression tests: timing windows ("within 6 months"), exceptions, conditional lines ("In case of..."), cohort-specific criteria in basket trials, negation in the middle of a sentence, Karnofsky read as ECOG, "prior to surgery" read as past surgery.

Right now it structures roughly 16% of criteria. Everything else is shown verbatim under "for your doctor to check". I audited it from the failure side: matched five made-up patient profiles against all trials and read every criterion that hid a trial against its source sentence (about 450 of them). That is a developer audit, not a clinically reviewed evaluation, and it shouldn't be quoted as one.

### Trying a local LLM

There is an Ollama-backed extractor too (`--extractor llm|hybrid`). Output is constrained by the JSON Schema generated from the `Rule` type and then checked by guardrails: genes, numbers and drug names must appear in the sentence, negation must survive, qualifiers must narrow the rule. Anything that fails becomes `other`.

```bash
ollama pull qwen2.5:7b-instruct
npm run eval -w @trial-finder/pipeline -- --extractor rules
npm run eval -w @trial-finder/pipeline -- --extractor llm
```

On my 35-example gold set (`gold.ts`, not reviewed by a clinician) the 7B model gets 17 exact and no polarity errors; the rule-based reader gets 33. So for now rules are the default and `hybrid` is there for experiments. Results are cached by content hash, so reruns only call the model on changed text.

## JSON Schema

`npm run schema` writes schemas for rules, bundles and profiles to `packages/domain/schema/`. A test validates the real bundle against them with ajv. The idea is that anyone can read the same data from another language without pulling in the TypeScript code.

## Privacy

- Matching happens in a web worker. Answers are stored in IndexedDB only.
- Exports are encrypted in the browser (PBKDF2 + AES-GCM).
- Postcodes are resolved from a bundled GeoNames table, so no geocoding request leaves the page.
- No third-party requests after load.

## Frontend

Tailwind v4 with a small token set, Inter as the only typeface. The home page is a condition search; the trial page lists inclusion and exclusion criteria in separate blocks. `design/` has Figma-importable SVGs of the home screen and the tokens as JSON.

## Not done

- Reading a doctor's letter in the browser
- Per-trial public pages (it's a single page app)
- Editorial content, which needs medical review
- EU CTIS and DRKS aren't ingested, only linked when ClinicalTrials.gov lists their ids
- Only one cancer group so far, and the UI is English only
- Distance is straight-line
- Notifications for new matching trials (there is a design for a background update check, nothing built)

## Data

Trial data comes from the ClinicalTrials.gov API v2. Check their terms before redistributing a bundle.
