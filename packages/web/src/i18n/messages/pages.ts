import { messages } from "../define"

export const pages = messages({
  "wizard.progress": { en: "Question {current} of {total}", de: "Frage {current} von {total}" },
  "wizard.where": { en: "Where do I find this?", de: "Wo finde ich das?" },
  "wizard.back": { en: "Back", de: "Zurück" },
  "wizard.next": { en: "Next", de: "Weiter" },
  "wizard.finish": { en: "Show my results", de: "Meine Ergebnisse anzeigen" },
  "wizard.skip": { en: "Skip", de: "Überspringen" },
  "wizard.skipAhead": {
    en: "<link>Skip ahead to the results</link>. You can come back and answer more at any time, and the list updates straight away.",
    de: "<link>Direkt zu den Ergebnissen springen</link>. Sie können jederzeit zurückkommen und weitere Fragen beantworten, die Liste aktualisiert sich sofort."
  },

  "results.title": { en: "Matching trials", de: "Passende Studien" },
  "results.summary": { en: "{visible} of {total} trials may fit.", de: "{visible} von {total} Studien kommen möglicherweise in Frage." },
  "results.answer": { en: "Answer a few questions", de: "Ein paar Fragen beantworten" },
  "results.edit": { en: "Edit my answers", de: "Meine Angaben ändern" },
  "results.total.one": { en: "{count} trial", de: "{count} Studie" },
  "results.total.other": { en: "{count} trials", de: "{count} Studien" },
  "results.matching": { en: "Matching…", de: "Abgleich läuft …" },
  "results.none": { en: "No trials match these filters.", de: "Keine Studien passen zu diesen Filtern." },
  "results.more": { en: "Show more ({left} left)", de: "Mehr anzeigen (noch {left})" },



  "filters.title": { en: "Filters", de: "Filter" },
  "filters.sort": { en: "Sort by", de: "Sortieren nach" },
  "sort.recommended": { en: "Recommended", de: "Empfohlen" },
  "sort.distance": { en: "Distance, nearest first", de: "Entfernung, nächste zuerst" },
  "sort.needPostcode": { en: "enter a postcode first", de: "zuerst Postleitzahl eingeben" },
  "sort.phase": { en: "Phase, latest first", de: "Phase, späteste zuerst" },
  "sort.updated": { en: "Last updated, newest first", de: "Zuletzt aktualisiert, neueste zuerst" },
  "sort.sites": { en: "Recruiting sites, most first", de: "Zentren mit Rekrutierung, meiste zuerst" },
  "filters.distance": { en: "Distance", de: "Entfernung" },
  "filters.anyDistance": { en: "Any distance", de: "Beliebige Entfernung" },
  "filters.enterPostcode": { en: "Enter a postcode to filter", de: "Postleitzahl eingeben, um zu filtern" },
  "filters.within": { en: "within {km} km", de: "bis {km} km" },
  "filters.country": { en: "Country with a site", de: "Land mit Zentrum" },
  "filters.all": { en: "All", de: "Alle" },
  "filters.phase": { en: "Phase", de: "Phase" },
  "filters.kind": { en: "Treatment type", de: "Art der Behandlung" },
  "kind.medicine": { en: "Medicine", de: "Medikament" },
  "kind.radiation": { en: "Radiation", de: "Strahlentherapie" },
  "kind.procedure": { en: "Procedure or device", de: "Eingriff oder Gerät" },
  "kind.other": { en: "Other", de: "Sonstiges" },
  "filters.recruitment": { en: "Recruitment", de: "Rekrutierung" },
  "filters.recruitingOrSoon": { en: "Recruiting or about to", de: "Rekrutiert oder kurz davor" },
  "filters.recruitingNow": { en: "Recruiting now", de: "Rekrutiert jetzt" },
  "filters.notYet": { en: "Not yet recruiting", de: "Rekrutiert noch nicht" },
  "filters.recruitingSite": { en: "Only trials with a recruiting site", de: "Nur Studien mit rekrutierendem Zentrum" },
  "filters.showNotFulfilled": { en: "Show trials with a criterion not fulfilled ({count})", de: "Studien mit nicht erfülltem Kriterium anzeigen ({count})" },
  "filters.hideStale": { en: "Hide entries not updated for 6 months", de: "Einträge ausblenden, die seit 6 Monaten nicht aktualisiert wurden" },

  "where.label": { en: "Your location", de: "Ihr Standort" },
  "where.country": { en: "Country", de: "Land" },
  "where.postcode": { en: "Postcode", de: "Postleitzahl" },
  "where.unknown": { en: "Postcode not found. Distances stay hidden.", de: "Postleitzahl nicht gefunden. Entfernungen bleiben ausgeblendet." },
  "where.loading": { en: "Keep typing…", de: "Tippen Sie weiter …" },

  "divider.0": { en: "No site is listed as recruiting. Kept visible, ranked lower.", de: "Kein Zentrum ist als rekrutierend aufgeführt. Bleibt sichtbar, steht weiter unten." },
  "divider.1": {
    en: "Site recruitment status not stated. Confirm with the study team.",
    de: "Rekrutierungsstatus der Zentren nicht angegeben. Fragen Sie beim Studienteam nach."
  },

  "card.stale": { en: "Possibly outdated", de: "Möglicherweise veraltet" },
  "card.stale.title": {
    en: "The registry entry has not been updated for over 6 months. Check that it is still recruiting.",
    de: "Der Registereintrag wurde seit über 6 Monaten nicht aktualisiert. Prüfen Sie, ob die Studie noch rekrutiert."
  },
  "card.nearest": { en: "nearest site {distance} away ({city}, {country})", de: "nächstes Zentrum {distance} entfernt ({city}, {country})" },
  "card.saved": { en: "On my shortlist", de: "Auf meiner Merkliste" },
  "card.full": { en: "Shortlist full ({max})", de: "Merkliste voll ({max})" },
  "card.toCheck.one": { en: "{count} criterion to check", de: "{count} Kriterium zu prüfen" },
  "card.toCheck.other": { en: "{count} criteria to check", de: "{count} Kriterien zu prüfen" },
  "card.add": { en: "Add to shortlist", de: "Zur Merkliste hinzufügen" },
  "card.remove": { en: "Remove from shortlist", de: "Von der Merkliste entfernen" },

  "trial.loading": { en: "Loading trial details…", de: "Studiendetails werden geladen …" },
  "trial.notFound": { en: "Trial not found", de: "Studie nicht gefunden" },
  "trial.notFound.text": {
    en: "It may have stopped recruiting since your last visit. <link>Back to results</link>",
    de: "Möglicherweise rekrutiert sie seit Ihrem letzten Besuch nicht mehr. <link>Zurück zu den Ergebnissen</link>"
  },
  "trial.back": { en: "← Back to results", de: "← Zurück zu den Ergebnissen" },
  "trial.noPhase": { en: "no phase stated", de: "keine Phase angegeben" },
  "trial.updated": { en: "registry entry updated {date}", de: "Registereintrag aktualisiert {date}" },
  "trial.unknownDate": { en: "unknown", de: "unbekannt" },
  "trial.outdated": { en: "Possibly outdated: confirm with the site", de: "Möglicherweise veraltet: Fragen Sie beim Zentrum nach" },
  "trial.registryRecruiting": { en: "Registry status: recruiting", de: "Registerstatus: rekrutiert" },
  "trial.registryNotYet": { en: "Registry status: not yet recruiting", de: "Registerstatus: rekrutiert noch nicht" },
  "trial.openRegistry": { en: "Open the {registry} entry in a new tab", de: "Eintrag bei {registry} in neuem Tab öffnen" },
  "trial.print": { en: "Print this trial", de: "Diese Studie drucken" },
  "trial.contact": { en: "Study contact:", de: "Studienkontakt:" },

  "plain.title": { en: "Summary", de: "Zusammenfassung" },
  "plain.note": {
    en: "Assembled from structured registry fields. Read the full registry entry before deciding anything.",
    de: "Aus strukturierten Registerfeldern zusammengestellt. Lesen Sie den vollständigen Registereintrag, bevor Sie etwas entscheiden."
  },
  "plain.tested": { en: "What is tested", de: "Was getestet wird" },
  "plain.against": { en: "Compared with", de: "Verglichen mit" },
  "plain.phase": { en: "Phase", de: "Phase" },
  "plain.randomisation": { en: "Randomisation", de: "Randomisierung" },
  "plain.blinding": { en: "Blinding", de: "Verblindung" },
  "plain.placebo": { en: "Placebo", de: "Placebo" },
  "plain.visits": { en: "Visits", de: "Besuche" },
  "plain.visits.text": {
    en: "The registry data does not state the visit schedule. Ask the trial site.",
    de: "Die Registerdaten nennen keinen Besuchsplan. Fragen Sie beim Studienzentrum nach."
  },
  "phase.EARLY_PHASE1": { en: "Early phase 1", de: "Frühe Phase 1" },
  "phase.PHASE1": { en: "Phase 1", de: "Phase 1" },
  "phase.PHASE2": { en: "Phase 2", de: "Phase 2" },
  "phase.PHASE3": { en: "Phase 3", de: "Phase 3" },
  "phase.PHASE4": { en: "Phase 4", de: "Phase 4" },
  "phase.PHASE1/PHASE2": { en: "Phase 1/2", de: "Phase 1/2" },
  "phase.PHASE2/PHASE3": { en: "Phase 2/3", de: "Phase 2/3" },
  "phase.NA": { en: "n/a", de: "k. A." },
  "phase.text.EARLY_PHASE1": {
    en: "Early phase 1: a very first look at safety in a small group of people.",
    de: "Frühe Phase 1: ein erster Blick auf die Sicherheit in einer kleinen Gruppe von Menschen."
  },
  "phase.text.PHASE1": {
    en: "Phase 1: mainly tests safety and the right dose in a small group of people.",
    de: "Phase 1: prüft vor allem Sicherheit und die richtige Dosis in einer kleinen Gruppe von Menschen."
  },
  "phase.text.PHASE2": {
    en: "Phase 2: tests whether the treatment works and keeps being safe, in a larger group.",
    de: "Phase 2: prüft, ob die Behandlung wirkt und weiterhin sicher ist, in einer größeren Gruppe."
  },
  "phase.text.PHASE3": {
    en: "Phase 3: compares the treatment with the current standard in a large group of people.",
    de: "Phase 3: vergleicht die Behandlung mit dem aktuellen Standard in einer großen Gruppe von Menschen."
  },
  "phase.text.PHASE4": {
    en: "Phase 4: studies an already approved treatment in everyday use.",
    de: "Phase 4: untersucht eine bereits zugelassene Behandlung im Alltag."
  },
  "phase.text.PHASE1/PHASE2": {
    en: "Phase 1/2: combines a first look at safety and the right dose with a first test of whether the treatment works.",
    de: "Phase 1/2: verbindet einen ersten Blick auf Sicherheit und die richtige Dosis mit einem ersten Test, ob die Behandlung wirkt."
  },
  "phase.text.PHASE2/PHASE3": {
    en: "Phase 2/3: combines a test of whether the treatment works with a comparison against the current standard.",
    de: "Phase 2/3: verbindet einen Test, ob die Behandlung wirkt, mit einem Vergleich mit dem aktuellen Standard."
  },
  "phase.text.NA": {
    en: "No phase stated (often the case for non-drug studies).",
    de: "Keine Phase angegeben (bei Studien ohne Arzneimittel oft der Fall)."
  },
  "allocation.randomized": {
    en: "You may be assigned to a treatment group by chance (like a coin toss), so you may not get the new treatment.",
    de: "Sie werden möglicherweise zufällig einer Behandlungsgruppe zugeteilt (wie beim Münzwurf), sodass Sie die neue Behandlung eventuell nicht erhalten."
  },
  "allocation.nonRandomized": {
    en: "Groups are not assigned by chance; assignment follows the study plan (for example by your condition).",
    de: "Die Gruppen werden nicht zufällig zugeteilt; die Zuteilung folgt dem Studienplan (zum Beispiel nach Ihrer Erkrankung)."
  },
  "allocation.unstated": { en: "The registry does not say how people are assigned.", de: "Das Register gibt nicht an, wie die Personen zugeteilt werden." },
  "blinding.open": {
    en: "Open label: you and your doctors know which treatment you receive.",
    de: "Offen (unverblindet): Sie und Ihre Ärztinnen und Ärzte wissen, welche Behandlung Sie erhalten."
  },
  "blinding.blinded": {
    en: "Blinded: you (and possibly your doctors) will not be told which treatment you receive until the study allows it.",
    de: "Verblindet: Sie (und möglicherweise Ihre Ärztinnen und Ärzte) erfahren nicht, welche Behandlung Sie erhalten, bis die Studie es erlaubt."
  },
  "placebo.yes": {
    en: "A placebo (dummy treatment) appears in this study's description. Ask whether it replaces or is added to active treatment.",
    de: "In der Beschreibung dieser Studie kommt ein Placebo (Scheinbehandlung) vor. Fragen Sie nach, ob es eine wirksame Behandlung ersetzt oder zusätzlich gegeben wird."
  },
  "placebo.no": {
    en: "No placebo is named in the registry entry. Check the full protocol to be sure.",
    de: "Im Registereintrag wird kein Placebo genannt. Prüfen Sie das vollständige Studienprotokoll, um sicherzugehen."
  },
  "summary.original": { en: "Original wording", de: "Originaltext" },

  "elig.title": { en: "Eligibility criteria", de: "Teilnahmekriterien" },
  "elig.notMet": {
    en: "At least one criterion is not fulfilled based on your answers. Check that they are right: <link>edit my answers</link>.",
    de: "Nach Ihren Angaben ist mindestens ein Kriterium nicht erfüllt. Prüfen Sie, ob sie stimmen: <link>Meine Angaben bearbeiten</link>."
  },
  "elig.none": { en: "No eligibility criteria could be read from this entry.", de: "Aus diesem Eintrag konnten keine Teilnahmekriterien gelesen werden." },
  "elig.full": { en: "Full eligibility text from the registry", de: "Vollständiger Teilnahmetext aus dem Register" },

  "sites.title": { en: "Sites ({count})", de: "Zentren ({count})" },
  "sites.note": {
    en: "Distances are straight-line estimates from your postcode area, not travel times.",
    de: "Entfernungen sind Luftlinien-Schätzungen ab Ihrem Postleitzahlgebiet, keine Fahrzeiten."
  },
  "sites.enter": { en: "Enter your postcode on the results page to see them.", de: "Geben Sie Ihre Postleitzahl auf der Ergebnisseite ein, um sie zu sehen." },
  "sites.unstated": { en: "status not stated", de: "Status nicht angegeben" },
  "sites.more": { en: "…and {count} more on the registry page.", de: "… und {count} weitere auf der Registerseite." },
  "siteStatus.RECRUITING": { en: "Recruiting", de: "Rekrutiert" },
  "siteStatus.NOT_YET_RECRUITING": { en: "Not yet recruiting", de: "Rekrutiert noch nicht" },
  "siteStatus.ENROLLING_BY_INVITATION": { en: "Enrolling by invitation", de: "Aufnahme nur auf Einladung" },
  "siteStatus.ACTIVE_NOT_RECRUITING": { en: "Active, not recruiting", de: "Aktiv, rekrutiert nicht" },
  "siteStatus.COMPLETED": { en: "Completed", de: "Abgeschlossen" },
  "siteStatus.SUSPENDED": { en: "Suspended", de: "Ausgesetzt" },
  "siteStatus.TERMINATED": { en: "Terminated", de: "Beendet" },
  "siteStatus.WITHDRAWN": { en: "Withdrawn", de: "Zurückgezogen" },
  "registry.title": { en: "Registry entries", de: "Registereinträge" },
  "registry.source": {
    en: "Source: ClinicalTrials.gov. Opening these links contacts the registry directly; this site is not told which trial you open.",
    de: "Quelle: ClinicalTrials.gov. Beim Öffnen dieser Links wird das Register direkt kontaktiert; diese Seite erfährt nicht, welche Studie Sie öffnen."
  },

  "shortlist.title": { en: "My shortlist", de: "Meine Merkliste" },
  "shortlist.lead": {
    en: "Pick up to {max} trials to take to your doctor. Stored only on this device.",
    de: "Wählen Sie bis zu {max} Studien aus, die Sie zu Ihrer Ärztin oder Ihrem Arzt mitnehmen. Nur auf diesem Gerät gespeichert."
  },
  "shortlist.empty": {
    en: "Nothing here yet. Use “Add to shortlist” on a trial in <link>the results</link>.",
    de: "Noch nichts hier. Nutzen Sie „Zur Merkliste hinzufügen“ bei einer Studie in <link>den Ergebnissen</link>."
  },
  "shortlist.nowNotMet": { en: "a criterion is now not met", de: "ein Kriterium ist jetzt nicht erfüllt" },
  "shortlist.remove": { en: "Remove", de: "Entfernen" },
  "shortlist.create": { en: "Create the doctor summary", de: "Zusammenfassung für die Ärztin oder den Arzt erstellen" },

  "summary.back": { en: "← Back", de: "← Zurück" },
  "summary.print": { en: "Print or save as PDF", de: "Drucken oder als PDF speichern" },
  "summary.title": { en: "Clinical trial options to discuss", de: "Studienoptionen zur Besprechung" },
  "summary.intro": {
    en: "Prepared by the patient or a relative on {date} using Trialy (prototype). The information below is self-reported and compared automatically with public registry data. It is not a medical assessment and may contain errors. Eligibility must be confirmed by the treating team and the trial site.",
    de: "Erstellt von der Patientin oder dem Patienten oder einer angehörigen Person am {date} mit Trialy (Prototyp). Die folgenden Angaben sind selbst berichtet und werden automatisch mit öffentlichen Registerdaten verglichen. Sie sind keine medizinische Beurteilung und können Fehler enthalten. Die Eignung muss vom behandelnden Team und vom Studienzentrum bestätigt werden."
  },
  "summary.situation": { en: "Situation as reported by the patient", de: "Situation laut Angaben der Patientin oder des Patienten" },
  "summary.selected": { en: "Trials selected ({count})", de: "Ausgewählte Studien ({count})" },
  "summary.none": { en: "No trials selected.", de: "Keine Studien ausgewählt." },
  "summary.status.recruiting": { en: "recruiting", de: "rekrutiert" },
  "summary.status.notYet": { en: "not yet recruiting", de: "rekrutiert noch nicht" },
  "summary.recruitment": { en: "Recruitment: {text}.", de: "Rekrutierung: {text}." },
  "summary.rec2.one": { en: "{count} listed site says it is recruiting", de: "{count} aufgeführtes Zentrum gibt an zu rekrutieren" },
  "summary.rec2.other": { en: "{count} listed sites say they are recruiting", de: "{count} aufgeführte Zentren geben an zu rekrutieren" },
  "summary.rec1": { en: "site recruitment status not stated in the registry", de: "Rekrutierungsstatus der Zentren im Register nicht angegeben" },
  "summary.rec0": {
    en: "no listed site says it is recruiting; confirm with the study team",
    de: "kein aufgeführtes Zentrum gibt an zu rekrutieren; fragen Sie beim Studienteam nach"
  },
  "summary.compare": { en: "Automatic comparison: {line}.", de: "Automatischer Vergleich: {line}." },
  "summary.failed": { en: "Possibly not met (please check):", de: "Möglicherweise nicht erfüllt (bitte prüfen):" },
  "summary.open": { en: "Open points for the doctor ({count}):", de: "Offene Punkte für die Ärztin oder den Arzt ({count}):" },
  "summary.required": { en: "Required:", de: "Erforderlich:" },
  "summary.exclusion": { en: "Exclusion:", de: "Ausschluss:" },
  "summary.moreOpen": { en: "…and {count} more in the registry entry.", de: "… und {count} weitere im Registereintrag." },
  "summary.nearest": { en: "Nearest site: {facility}, {city} ({distance}).", de: "Nächstes Zentrum: {facility}, {city} ({distance})." },
  "summary.contact": { en: "Contact: {who}.", de: "Kontakt: {who}." },
  "summary.studyContact": { en: "Study contact: {who}.", de: "Studienkontakt: {who}." },
  "summary.registry": { en: "Registry: {urls}", de: "Register: {urls}" },

  "profile.diagnosis": { en: "Diagnosis", de: "Diagnose" },
  "profile.stage": { en: "Stage", de: "Stadium" },
  "profile.genes": { en: "Gene results", de: "Genergebnisse" },
  "profile.pdl1": { en: "PD-L1", de: "PD-L1" },
  "profile.prior": { en: "Previous treatment", de: "Bisherige Behandlung" },
  "profile.lines": { en: "Lines of drug treatment for advanced disease", de: "Linien der medikamentösen Behandlung bei fortgeschrittener Erkrankung" },
  "profile.current": { en: "Current treatment", de: "Aktuelle Behandlung" },
  "profile.brain": { en: "Brain metastases", de: "Hirnmetastasen" },
  "profile.ild": { en: "Interstitial lung disease / pneumonitis", de: "Interstitielle Lungenerkrankung / Pneumonitis" },
  "profile.autoimmune": { en: "Autoimmune disease", de: "Autoimmunerkrankung" },
  "profile.age": { en: "Age", de: "Alter" },
  "profile.sex": { en: "Sex", de: "Geschlecht" },
  "summary.unansweredCount": { en: "{count} questions were not answered and are left out.", de: "{count} Fragen wurden nicht beantwortet und sind hier weggelassen." },
  "profile.ecog": { en: "ECOG performance status (patient-reported)", de: "ECOG-Leistungsstatus (laut Patientin oder Patient)" },
  "profile.unanswered": { en: "not known / not answered", de: "nicht bekannt / nicht beantwortet" },
  "profile.notKnown": { en: "not known", de: "nicht bekannt" },
  "profile.noneEntered": { en: "none entered", de: "nichts eingetragen" },
  "profile.extent.limited": { en: "limited disease", de: "begrenzte Erkrankung (Limited Disease)" },
  "profile.extent.extensive": { en: "extensive disease", de: "ausgedehnte Erkrankung (Extensive Disease)" },
  "profile.gene.positive": { en: "{gene} alteration found", de: "{gene}: Veränderung gefunden" },
  "profile.gene.negative": { en: "{gene} no alteration", de: "{gene}: keine Veränderung" },
  "profile.brain.none": { en: "none", de: "keine" },
  "profile.brain.treated": { en: "yes, treated and stable", de: "ja, behandelt und stabil" },
  "profile.brain.active": { en: "yes, untreated or symptomatic", de: "ja, unbehandelt oder mit Symptomen" },
  "histology.adenocarcinoma": { en: "adenocarcinoma", de: "Adenokarzinom" },
  "histology.squamous": { en: "squamous", de: "Plattenepithelkarzinom" },
  "histology.other": { en: "other", de: "andere" },
  "therapy.chemotherapy": { en: "chemotherapy", de: "Chemotherapie" },
  "therapy.immunotherapy": { en: "immunotherapy", de: "Immuntherapie" },
  "therapy.targeted": { en: "targeted therapy", de: "zielgerichtete Therapie" },
  "therapy.radiotherapy": { en: "radiotherapy", de: "Strahlentherapie" },
  "therapy.surgery": { en: "surgery", de: "Operation" },
  "value.yes": { en: "yes", de: "ja" },
  "value.no": { en: "no", de: "nein" },
  "value.female": { en: "female", de: "weiblich" },
  "value.male": { en: "male", de: "männlich" },

  "privacy.title": { en: "Your data and privacy", de: "Ihre Daten und Ihr Datenschutz" },
  "privacy.stays.title": { en: "What stays in your browser", de: "Was in Ihrem Browser bleibt" },
  "privacy.stays.text": {
    en: "Your answers, your shortlist and your results are stored only in this browser (IndexedDB) and are never sent to any server. The matching is done by code running on your own device.",
    de: "Ihre Angaben, Ihre Merkliste und Ihre Ergebnisse werden nur in diesem Browser (IndexedDB) gespeichert und nie an einen Server gesendet. Der Abgleich erfolgt durch Code, der auf Ihrem eigenen Gerät läuft."
  },
  "privacy.server.title": { en: "What the server sees", de: "Was der Server sieht" },
  "privacy.server.text": {
    en: "When you open this page your browser downloads the static page, one public list of all trials (<code>{file}</code>{trials}) and one postcode table for all supported countries. These files are the same for every visitor, whichever condition you pick, so the server cannot tell what you are interested in. When you open a trial, its full text comes from one of {buckets} shared files that mix many trials, so the server learns at most which of those files you needed, not which trial. Like any website, the server sees your IP address. There are no cookies, trackers, third-party fonts or analytics in this prototype.",
    de: "Wenn Sie diese Seite öffnen, lädt Ihr Browser die statische Seite, eine öffentliche Liste aller Studien (<code>{file}</code>{trials}) und eine Postleitzahltabelle für alle unterstützten Länder herunter. Diese Dateien sind für alle Besucher gleich, egal welche Erkrankung Sie wählen, der Server kann also nicht erkennen, wofür Sie sich interessieren. Wenn Sie eine Studie öffnen, kommt ihr voller Text aus einer von {buckets} gemeinsamen Dateien, in denen viele Studien gemischt sind. Der Server erfährt höchstens, welche dieser Dateien Sie brauchten, nicht welche Studie. Wie jede Website sieht der Server Ihre IP-Adresse. In diesem Prototyp gibt es keine Cookies, Tracker, Schriften von Drittanbietern oder Analysen."
  },
  "privacy.server.count.one": { en: ", {count} trial", de: ", {count} Studie" },
  "privacy.server.count.other": { en: ", {count} trials", de: ", {count} Studien" },
  "privacy.check.title": { en: "How to check this yourself", de: "So können Sie es selbst überprüfen" },
  "privacy.check.text": {
    en: "Open your browser’s developer tools, choose the <em>Network</em> tab, then answer a question. You will see that no request is made when you answer. Opening a trial loads one shared details file. You can also switch off your internet connection after the page has loaded and everything keeps working.",
    de: "Öffnen Sie die Entwicklerwerkzeuge Ihres Browsers, wählen Sie den Reiter <em>Netzwerk</em> (Network) und beantworten Sie dann eine Frage. Sie sehen, dass beim Antworten keine Anfrage gesendet wird. Beim Öffnen einer Studie wird eine gemeinsame Detaildatei geladen. Sie können auch Ihre Internetverbindung trennen, nachdem die Seite geladen ist, und alles funktioniert weiter."
  },
  "privacy.move.title": { en: "Move to another device", de: "Auf ein anderes Gerät übertragen" },
  "privacy.move.text": {
    en: "Export your answers as an encrypted file. The site cannot recover a lost passphrase.",
    de: "Exportieren Sie Ihre Angaben als verschlüsselte Datei. Die Seite kann eine verlorene Passphrase nicht wiederherstellen."
  },
  "privacy.passphrase": { en: "Passphrase", de: "Passphrase" },
  "privacy.export": { en: "Export encrypted file", de: "Verschlüsselte Datei exportieren" },
  "privacy.import": { en: "Import file", de: "Datei importieren" },
  "privacy.shortPass": {
    en: "Please choose a passphrase of at least 8 characters. We cannot recover it for you.",
    de: "Bitte wählen Sie eine Passphrase mit mindestens 8 Zeichen. Wir können sie nicht für Sie wiederherstellen."
  },
  "privacy.exported": {
    en: "Saved. Keep the passphrase safe: without it the file cannot be opened.",
    de: "Gespeichert. Bewahren Sie die Passphrase sicher auf: Ohne sie lässt sich die Datei nicht öffnen."
  },
  "privacy.imported": { en: "Imported. Your answers are loaded on this device.", de: "Importiert. Ihre Angaben sind auf diesem Gerät geladen." },
  "privacy.delete.title": { en: "Delete everything", de: "Alles löschen" },
  "privacy.delete.text": {
    en: "Removes your answers, shortlist and saved state from this browser in one step.",
    de: "Entfernt Ihre Angaben, Ihre Merkliste und den gespeicherten Zustand in einem Schritt aus diesem Browser."
  },
  "privacy.delete.confirm": { en: "Yes, delete everything", de: "Ja, alles löschen" },
  "privacy.cancel": { en: "Cancel", de: "Abbrechen" },
  "privacy.deleted": { en: "Everything was deleted from this browser.", de: "Alles wurde aus diesem Browser gelöscht." },
  "privacy.funding.title": { en: "Funding and sources", de: "Finanzierung und Quellen" },
  "privacy.funding.text": {
    en: "Trial data: ClinicalTrials.gov (U.S. National Library of Medicine). Postcode positions: GeoNames (CC BY 4.0). This prototype has no sponsor funding and no referral deals.",
    de: "Studiendaten: ClinicalTrials.gov (U.S. National Library of Medicine). Postleitzahl-Positionen: GeoNames (CC BY 4.0). Dieser Prototyp hat keine Förderung durch Sponsoren und keine Vermittlungsvereinbarungen."
  },
  "crypto.unsupported": {
    en: "This browser connection cannot encrypt files. Open the site over HTTPS or on localhost.",
    de: "Über diese Browserverbindung lassen sich keine Dateien verschlüsseln. Öffnen Sie die Seite über HTTPS oder auf localhost."
  },
  "crypto.not-trialy": { en: "This is not a Trialy file.", de: "Das ist keine Trialy-Datei." },
  "crypto.wrong-passphrase": { en: "Wrong passphrase, or the file is damaged.", de: "Falsche Passphrase, oder die Datei ist beschädigt." },
  "crypto.damaged": { en: "This file is damaged and cannot be read.", de: "Diese Datei ist beschädigt und kann nicht gelesen werden." },
  "wipe.unavailable": {
    en: "Your browser would not delete the saved data. Clear this site's data in the browser settings instead.",
    de: "Ihr Browser hat das Löschen der gespeicherten Daten verweigert. Löschen Sie stattdessen die Daten dieser Seite in den Browser-Einstellungen."
  },
  "wipe.blocked": { en: "Another Trialy tab is still open. Close it and try again.", de: "Ein weiterer Trialy-Tab ist noch geöffnet. Schließen Sie ihn und versuchen Sie es erneut." },


  "profile.mscourse": { en: "Type of multiple sclerosis", de: "Verlaufsform der Multiplen Sklerose" },
  "profile.edss": { en: "EDSS", de: "EDSS" },
  "profile.relapse": { en: "Last relapse", de: "Letzter Schub" },
  "profile.mstherapies": { en: "Earlier MS treatment", de: "Bisherige MS-Behandlung" },
  "profile.pregnancy": { en: "Pregnant, breastfeeding or planning pregnancy", de: "Schwanger, stillend oder Schwangerschaft geplant" },
  "profile.mri": { en: "Unable to have an MRI", de: "MRT nicht möglich" },
  "profile.steroids": { en: "Steroids in the last 3 months", de: "Steroide in den letzten 3 Monaten" },
  "profile.infection": { en: "HIV, hepatitis B or C, tuberculosis", de: "HIV, Hepatitis B oder C, Tuberkulose" },
  "profile.cancer": { en: "Cancer now or in the past", de: "Krebserkrankung aktuell oder früher" },
  "profile.psychiatric": { en: "Psychiatric condition", de: "Psychiatrische Erkrankung" },
  "profile.otherAutoimmune": { en: "Another autoimmune or neurological disease", de: "Weitere Autoimmun- oder neurologische Erkrankung" },
  "profile.otherTrial": { en: "In another study or on an investigational drug", de: "In einer anderen Studie oder mit Prüfpräparat" },
  "profile.none": { en: "none", de: "keine" }
})
