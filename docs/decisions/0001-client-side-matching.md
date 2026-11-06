# 0001 Matching runs in the browser

Status: accepted

## Context
Most trial search tools send the patient's medical history to a server. Tools that ask an LLM per patient-trial pair also cannot explain why a trial was shown or hidden.

## Decision
Eligibility text is turned into structured rules once, in the pipeline. The browser evaluates those rules against the profile in a web worker. Answers are stored in IndexedDB only; exports are encrypted in the browser (PBKDF2 + AES-GCM); postcodes are resolved from a bundled GeoNames table. No third-party requests after load.

## Consequences
- Same input, same output, and each verdict can be shown next to its source sentence.
- No backend, accounts or analytics to run or secure.
- The data bundle size and freshness depend on the pipeline and static hosting.
