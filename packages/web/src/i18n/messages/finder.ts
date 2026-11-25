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
  "finder.why.title": { en: "See exactly why a trial fits.", de: "Sehen Sie genau, warum eine Studie passt." },
  "finder.why.lead": {
    en: "Inclusion and exclusion criteria are listed separately. What you fulfil is marked, so what is left to discuss is clear at a glance.",
    de: "Ein- und Ausschlusskriterien sind getrennt aufgeführt. Was Sie erfüllen, ist markiert, sodass auf einen Blick klar ist, was noch zu besprechen bleibt."
  },
  "finder.faq": { en: "Questions", de: "Fragen" },
  "finder.faq1.q": { en: "Is this medical advice?", de: "Ist das eine medizinische Beratung?" },
  "finder.faq1.a": {
    en: "No. This is a prototype. Always discuss possible matches with your doctor.",
    de: "Nein. Dies ist ein Prototyp. Besprechen Sie mögliche Treffer immer mit Ihrer Ärztin oder Ihrem Arzt."
  },
  "finder.faq2.q": { en: "Where do my answers go?", de: "Wohin gehen meine Angaben?" },
  "finder.faq2.a": {
    en: "Matching happens entirely on your device. None of your answers are sent to the server.",
    de: "Der Abgleich findet vollständig auf Ihrem Gerät statt. Keine Ihrer Angaben wird an den Server gesendet."
  },
  "finder.faq3.q": {
    en: "Why is a recruiting trial listed without a recruiting site?",
    de: "Warum steht eine rekrutierende Studie ohne rekrutierendes Zentrum in der Liste?"
  },
  "finder.faq3.a": {
    en: "Registries often mark a trial as recruiting overall while no nearby site explicitly says so. Such trials are ranked lower but still kept, because by contacting the sites they may still be available.",
    de: "Register markieren eine Studie oft insgesamt als rekrutierend, obwohl kein Zentrum in der Nähe dies ausdrücklich angibt. Solche Studien stehen weiter unten, bleiben aber in der Liste, weil sie sich durch Kontakt mit den Zentren möglicherweise dennoch nutzen lassen."
  },
  "finder.faq4.q": { en: "What if I do not know an answer?", de: "Was, wenn ich eine Antwort nicht weiß?" },
  "finder.faq4.a": {
    en: "Pick “I don’t know”. The trial stays in the list and the criterion is marked open.",
    de: "Wählen Sie „Weiß ich nicht“. Die Studie bleibt in der Liste und das Kriterium wird als offen markiert."
  },
  "finder.faq5.q": { en: "Which conditions and countries are covered?", de: "Welche Erkrankungen und Länder sind abgedeckt?" },
  "finder.faq5.a": {
    en: "This is a prototype. Currently lung cancer and multiple sclerosis trials with sites in Germany, Austria, Switzerland and their neighbours.",
    de: "Dies ist ein Prototyp. Derzeit sind Studien zu Lungenkrebs und Multipler Sklerose mit Zentren in Deutschland, Österreich, der Schweiz und deren Nachbarländern abgedeckt."
  }
})
