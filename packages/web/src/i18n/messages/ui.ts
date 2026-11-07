import { messages } from "../define"

export const ui = messages({
  "support.text": {
    en: "Need to talk to someone? The <link1>Krebsinformationsdienst</link1> (DKFZ) answers questions free of charge on <b>0800 420 30 40</b>, and the <link2>INFONETZ KREBS</link2> on <b>0800 80708877</b>. Both can also point you to psycho-oncology support.",
    de: "Möchten Sie mit jemandem sprechen? Der <link1>Krebsinformationsdienst</link1> (DKFZ) beantwortet Fragen kostenlos unter <b>0800 420 30 40</b>, das <link2>INFONETZ KREBS</link2> unter <b>0800 80708877</b>. Beide können Ihnen auch psychoonkologische Unterstützung vermitteln."
  },
  "disclaimer.text": {
    en: "These are <b>possible fits to discuss with your doctor</b>, not a promise that a trial will help or that you qualify. Data comes from public registries and may be incomplete or out of date. The treating team always decides.",
    de: "Das sind <b>mögliche Treffer, die Sie mit Ihrer Ärztin oder Ihrem Arzt besprechen können</b>, kein Versprechen, dass eine Studie hilft oder dass Sie teilnehmen können. Die Daten stammen aus öffentlichen Registern und können unvollständig oder veraltet sein. Das behandelnde Team entscheidet immer."
  },
  "tier.recruiting.one": { en: "Recruiting · {count} site", de: "Rekrutiert · {count} Zentrum" },
  "tier.recruiting.other": { en: "Recruiting · {count} sites", de: "Rekrutiert · {count} Zentren" },
  "tier.unstated": { en: "Site status not stated", de: "Zentrumsstatus nicht angegeben" },
  "tier.unstated.title": {
    en: "The registry does not state whether the sites are recruiting. Confirm with the study team.",
    de: "Das Register gibt nicht an, ob die Zentren rekrutieren. Fragen Sie beim Studienteam nach."
  },
  "tier.none": { en: "No recruiting site listed", de: "Kein rekrutierendes Zentrum aufgeführt" },
  "tier.none.title": {
    en: "ClinicalTrials.gov lists this study as recruiting overall, but none of its sites in Germany, Austria, Switzerland or the neighbouring countries say they are recruiting. It stays in the list, ranked lower. Ask the study team before travelling.",
    de: "ClinicalTrials.gov führt diese Studie insgesamt als rekrutierend, aber keines ihrer Zentren in Deutschland, Österreich, der Schweiz oder den Nachbarländern gibt an zu rekrutieren. Sie bleibt in der Liste, steht aber weiter unten. Fragen Sie beim Studienteam nach, bevor Sie reisen."
  },
  "fulfilled.line": { en: "{met} of {total} criteria fulfilled", de: "{met} von {total} Kriterien erfüllt" },
  "fulfilled.notMet": { en: "{notMet} not fulfilled", de: "{notMet} nicht erfüllt" },
  "status.met": { en: "Fulfilled", de: "Erfüllt" },
  "status.notMet": { en: "Not fulfilled", de: "Nicht erfüllt" },
  "status.unknown": { en: "Open", de: "Offen" },
  "criteria.inclusion": { en: "Inclusion criteria", de: "Einschlusskriterien" },
  "criteria.inclusion.note": { en: "You need to meet these.", de: "Diese müssen Sie erfüllen." },
  "criteria.exclusion": { en: "Exclusion criteria", de: "Ausschlusskriterien" },
  "criteria.exclusion.note": {
    en: "Fulfilled means the exclusion does not apply to you.",
    de: "Erfüllt bedeutet, dass der Ausschluss auf Sie nicht zutrifft."
  },
  "criteria.count": { en: "{fulfilled} of {total} fulfilled", de: "{fulfilled} von {total} erfüllt" },

  "said.cancerType": { en: "You said: {cancer}", de: "Sie haben angegeben: {cancer}" },
  "said.extent": { en: "You said: {extent}", de: "Sie haben angegeben: {extent}" },
  "said.stage": { en: "You said: stage {stage}", de: "Sie haben angegeben: Stadium {stage}" },
  "said.gene.positive": { en: "You said: {gene} alteration present", de: "Sie haben angegeben: {gene}-Veränderung vorhanden" },
  "said.gene.negative": { en: "You said: no {gene} alteration", de: "Sie haben angegeben: keine {gene}-Veränderung" },
  "said.pdl1.lt1": { en: "You said: PD-L1 below 1%", de: "Sie haben angegeben: PD-L1 unter 1 %" },
  "said.pdl1.1to49": { en: "You said: PD-L1 1–49%", de: "Sie haben angegeben: PD-L1 1–49 %" },
  "said.pdl1.ge50": { en: "You said: PD-L1 50% or higher", de: "Sie haben angegeben: PD-L1 50 % oder höher" },
  "said.yesNo": { en: "You said: {value}", de: "Sie haben angegeben: {value}" },
  "said.lines.one": { en: "You said: {count} line", de: "Sie haben angegeben: {count} Linie" },
  "said.lines.other": { en: "You said: {count} lines", de: "Sie haben angegeben: {count} Linien" },
  "said.current": { en: "You said: currently {therapy}", de: "Sie haben angegeben: aktuell {therapy}" },
  "said.current.none": { en: "You said: currently no treatment", de: "Sie haben angegeben: aktuell keine Behandlung" },
  "said.lab": { en: "You entered: {value}", de: "Sie haben eingetragen: {value}" },
  "said.age": { en: "You said: {years} years", de: "Sie haben angegeben: {years} Jahre" },
  "said.sex": { en: "You said: {sex}", de: "Sie haben angegeben: {sex}" },
  "said.ecog": { en: "You said: ECOG {ecog}", de: "Sie haben angegeben: ECOG {ecog}" },
  "said.brain.none": { en: "You said: no brain metastases", de: "Sie haben angegeben: keine Hirnmetastasen" },
  "said.brain.treated": { en: "You said: brain metastases, treated and stable", de: "Sie haben angegeben: Hirnmetastasen, behandelt und stabil" },
  "said.brain.active": { en: "You said: brain metastases, active", de: "Sie haben angegeben: Hirnmetastasen, aktiv" },

  "said.course.rrms": { en: "You said: relapsing-remitting MS", de: "Sie haben angegeben: schubförmig remittierende MS" },
  "said.course.spms": { en: "You said: secondary progressive MS", de: "Sie haben angegeben: sekundär progrediente MS" },
  "said.course.ppms": { en: "You said: primary progressive MS", de: "Sie haben angegeben: primär progrediente MS" },
  "said.course.cis": { en: "You said: a first episode (clinically isolated syndrome)", de: "Sie haben angegeben: ein erstes Ereignis (klinisch isoliertes Syndrom)" },
  "said.edss": { en: "You said: EDSS {value}", de: "Sie haben angegeben: EDSS {value}" },
  "said.relapse.lt1": { en: "You said: last relapse within the last month", de: "Sie haben angegeben: letzter Schub innerhalb des letzten Monats" },
  "said.relapse.1to3": { en: "You said: last relapse 1 to 3 months ago", de: "Sie haben angegeben: letzter Schub vor 1 bis 3 Monaten" },
  "said.relapse.3to12": { en: "You said: last relapse 3 to 12 months ago", de: "Sie haben angegeben: letzter Schub vor 3 bis 12 Monaten" },
  "said.relapse.12to24": { en: "You said: last relapse 1 to 2 years ago", de: "Sie haben angegeben: letzter Schub vor 1 bis 2 Jahren" },
  "said.relapse.gt24": { en: "You said: last relapse longer than 2 years ago, or never", de: "Sie haben angegeben: letzter Schub länger als 2 Jahre her oder nie" }
})
