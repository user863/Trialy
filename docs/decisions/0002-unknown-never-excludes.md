# 0002 Unknown never excludes, and the extractor stays conservative

Status: accepted

## Context
Many criteria need data the patient did not give or that only exists in a lab report. Free-text criteria are hard to read reliably.

## Decision
Rules evaluate to yes, no or unknown (Kleene logic). Only a clearly failed criterion hides a trial; unknown keeps it, marked as open. The default extractor is rule-based and structures only sentences it fully understands; everything else becomes `other` and is shown verbatim "for your doctor to check". The Ollama extractor is optional (`--extractor llm|hybrid`), constrained by the generated JSON Schema and guardrails.

## Consequences
- Fewer wrongly hidden trials, at the cost of longer result lists.
- About 16% of criteria are structured today. On the 35-example developer gold set the rule-based reader gets 33 exact, the 7B model 17. Neither is a clinical evaluation.
