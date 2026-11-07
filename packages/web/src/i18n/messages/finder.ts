import { messages } from "../define"

export const finder = messages({
  "finder.title": { en: "Find a clinical trial that fits you.", de: "Finden Sie eine klinische Studie, die zu Ihnen passt." },
  "finder.conditionLabel": { en: "Your condition", de: "Ihre Erkrankung" },
  "finder.placeholder": { en: "Search your condition", de: "Erkrankung suchen" },
  "finder.go": { en: "Continue to questions", de: "Weiter zu den Fragen" },
  "finder.unsupported": { en: "Only lung cancer and multiple sclerosis are covered so far.", de: "Bisher sind nur Lungenkrebs und Multiple Sklerose abgedeckt." },
  "finder.loadingTrials": { en: "Loading trials…", de: "Studien werden geladen …" },
  "finder.stats.one": {
    en: "{count} recruiting trial in {countries} countries · No account · Answers stay on this device",
    de: "{count} rekrutierende Studie in {countries} Ländern · Kein Konto · Ihre Angaben bleiben auf diesem Gerät"
  },
  "finder.stats.other": {
    en: "{count} recruiting trials in {countries} countries · No account · Answers stay on this device",
    de: "{count} rekrutierende Studien in {countries} Ländern · Kein Konto · Ihre Angaben bleiben auf diesem Gerät"
  },
  "finder.how": { en: "How it works", de: "So funktioniert es" },
  "finder.step1.title": { en: "Name your condition", de: "Nennen Sie Ihre Erkrankung" },
  "finder.step1.text": { en: "One search. No account, no form to fill in first.", de: "Eine Suche. Kein Konto, kein Formular vorab." },
  "finder.step2.title": { en: "Answer what you know", de: "Beantworten Sie, was Sie wissen" },
  "finder.step2.text": {
    en: "Every question accepts “I don’t know”, and that never rules a trial out.",
    de: "Jede Frage lässt „Weiß ich nicht“ zu, und das schließt nie eine Studie aus."
  },
  "finder.step3.title": { en: "See why each trial fits", de: "Sehen Sie, warum eine Studie passt" },
  "finder.step3.text": {
    en: "Each criterion is marked fulfilled, not fulfilled or open, beside the registry’s own wording.",
    de: "Jedes Kriterium ist als erfüllt, nicht erfüllt oder offen markiert, neben dem Originaltext des Registers."
  },
  "finder.why.title": { en: "See exactly why a trial fits.", de: "Sehen Sie genau, warum eine Studie passt." },
  "finder.why.lead": {
    en: "Inclusion and exclusion criteria are listed separately. What you fulfil is marked, so what is left to discuss is clear at a glance.",
    de: "Ein- und Ausschlusskriterien sind getrennt aufgeführt. Was Sie erfüllen, ist markiert, sodass auf einen Blick klar ist, was noch zu besprechen bleibt."
  },
  "finder.principle1.title": { en: "Unknown never excludes", de: "Unbekannt schließt nie aus" },
  "finder.principle1.text": {
    en: "A trial is hidden only when one of your answers clearly fails a criterion. Gaps stay open for your doctor.",
    de: "Eine Studie wird nur ausgeblendet, wenn eine Ihrer Angaben ein Kriterium eindeutig nicht erfüllt. Lücken bleiben für Ihre Ärztin oder Ihren Arzt offen."
  },
  "finder.principle2.title": { en: "Recruiting first", de: "Rekrutierende zuerst" },
  "finder.principle2.text": {
    en: "Trials with a site that says it is recruiting come first. The rest stay visible and are labelled.",
    de: "Studien mit einem Zentrum, das angibt zu rekrutieren, stehen zuerst. Die übrigen bleiben sichtbar und sind gekennzeichnet."
  },
  "finder.principle3.title": { en: "The registry’s own words", de: "Die Worte des Registers" },
  "finder.principle3.text": {
    en: "Every criterion shows the original sentence, so you can check how it was read.",
    de: "Jedes Kriterium zeigt den Originalsatz, sodass Sie nachvollziehen können, wie er gelesen wurde."
  },
  "finder.faq": { en: "Questions", de: "Fragen" },
  "finder.faq1.q": { en: "Is this medical advice?", de: "Ist das eine medizinische Beratung?" },
  "finder.faq1.a": {
    en: "No. Trialy shows which public trials may fit what you tell it. Your treating team decides whether you qualify.",
    de: "Nein. Trialy zeigt, welche öffentlichen Studien zu Ihren Angaben passen könnten. Ob Sie teilnehmen können, entscheidet Ihr behandelndes Team."
  },
  "finder.faq2.q": { en: "Where do my answers go?", de: "Wohin gehen meine Angaben?" },
  "finder.faq2.a": {
    en: "Nowhere. Matching runs in your browser and answers are stored only on this device. There are no accounts and no tracking, and you can delete everything at any time.",
    de: "Nirgendwohin. Der Abgleich läuft in Ihrem Browser, und Ihre Angaben werden nur auf diesem Gerät gespeichert. Es gibt keine Konten und kein Tracking, und Sie können jederzeit alles löschen."
  },
  "finder.faq3.q": { en: "Where does the trial data come from?", de: "Woher stammen die Studiendaten?" },
  "finder.faq3.a": {
    en: "ClinicalTrials.gov, the public registry. The list is prepared in advance and downloaded once, so your searches never reach a server.",
    de: "Von ClinicalTrials.gov, dem öffentlichen Register. Die Liste wird vorab aufbereitet und einmal heruntergeladen, sodass Ihre Suchanfragen nie einen Server erreichen."
  },
  "finder.faq4.q": {
    en: "Why is a recruiting trial listed without a recruiting site?",
    de: "Warum steht eine rekrutierende Studie ohne rekrutierendes Zentrum in der Liste?"
  },
  "finder.faq4.a": {
    en: "Registries often mark a trial as recruiting overall while no nearby site says so. We keep it, rank it lower and label it, because some are still worth asking about.",
    de: "Register markieren eine Studie oft insgesamt als rekrutierend, obwohl kein Zentrum in der Nähe das angibt. Wir behalten sie, ordnen sie weiter unten ein und kennzeichnen sie, weil sich bei manchen eine Nachfrage dennoch lohnt."
  },
  "finder.faq5.q": { en: "What if I do not know an answer?", de: "Was, wenn ich eine Antwort nicht weiß?" },
  "finder.faq5.a": {
    en: "Choose “I don’t know”. The trial stays in the list and the criterion is marked open.",
    de: "Wählen Sie „Weiß ich nicht“. Die Studie bleibt in der Liste und das Kriterium wird als offen markiert."
  },
  "finder.faq6.q": { en: "Which conditions and countries are covered?", de: "Welche Erkrankungen und Länder sind abgedeckt?" },
  "finder.faq6.a": {
    en: "Lung cancer and multiple sclerosis, with sites in Germany, Austria, Switzerland and their neighbours. Lung cancer is matched criterion by criterion. For multiple sclerosis only age and sex are matched, and every other criterion is shown as the registry wrote it. More conditions are next.",
    de: "Lungenkrebs und Multiple Sklerose, mit Zentren in Deutschland, Österreich, der Schweiz und deren Nachbarländern. Lungenkrebs wird Kriterium für Kriterium abgeglichen. Bei Multipler Sklerose werden nur Alter und Geschlecht abgeglichen, alle anderen Kriterien werden so gezeigt, wie das Register sie geschrieben hat. Weitere Erkrankungen folgen."
  },
  "finder.close.title": { en: "See which trials fit you.", de: "Sehen Sie, welche Studien zu Ihnen passen." },
  "finder.close.button": { en: "Search my condition", de: "Meine Erkrankung suchen" }
})
