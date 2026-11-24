Trialy
Clinical Trial Matcher

Prototype, Demo-Link: https://user863.github.io/Trialy/

Pipeline: pulls recruiting trials from ClinicalTrials.gov -> turns eligibility criteria into rules -> static bundle.
Client: React app, loads the bundle and matches in a web worker.
Covers lung cancer and multiple sclerosis only. The extractor is rule-based and only structures part of the criteria; the rest is shown as written. Not medical advice.

Code: Apache-2.0. Trial data: ClinicalTrials.gov, postcodes: GeoNames.
