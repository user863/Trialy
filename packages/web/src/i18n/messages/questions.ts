import { messages } from "../define"

export const questions = messages({
  "answer.yes": { en: "Yes", de: "Ja" },
  "answer.no": { en: "No", de: "Nein" },
  "answer.unknown": { en: "I don’t know", de: "Weiß ich nicht" },

  "gene.EGFR": { en: "EGFR mutation (e.g. exon 19 deletion, L858R, exon 20 insertion)", de: "EGFR-Mutation (z. B. Exon-19-Deletion, L858R, Exon-20-Insertion)" },
  "gene.ALK": { en: "ALK rearrangement", de: "ALK-Umlagerung (Rearrangement)" },
  "gene.ROS1": { en: "ROS1 rearrangement", de: "ROS1-Umlagerung (Rearrangement)" },
  "gene.KRAS": { en: "KRAS mutation (e.g. G12C)", de: "KRAS-Mutation (z. B. G12C)" },
  "gene.BRAF": { en: "BRAF mutation (e.g. V600E)", de: "BRAF-Mutation (z. B. V600E)" },
  "gene.MET": { en: "MET exon 14 skipping or amplification", de: "MET-Exon-14-Skipping oder -Amplifikation" },
  "gene.RET": { en: "RET fusion", de: "RET-Fusion" },
  "gene.HER2": { en: "HER2 (ERBB2) mutation", de: "HER2-Mutation (ERBB2)" },
  "gene.NTRK": { en: "NTRK fusion", de: "NTRK-Fusion" },
  "gene.NRG1": { en: "NRG1 fusion", de: "NRG1-Fusion" },

  "therapy.label.chemotherapy": { en: "Chemotherapy", de: "Chemotherapie" },
  "therapy.hint.chemotherapy": {
    en: "for example cisplatin, carboplatin, pemetrexed, docetaxel, etoposide",
    de: "zum Beispiel Cisplatin, Carboplatin, Pemetrexed, Docetaxel, Etoposid"
  },
  "therapy.label.immunotherapy": { en: "Immunotherapy", de: "Immuntherapie" },
  "therapy.hint.immunotherapy": {
    en: "for example pembrolizumab (Keytruda), nivolumab, atezolizumab, durvalumab",
    de: "zum Beispiel Pembrolizumab (Keytruda), Nivolumab, Atezolizumab, Durvalumab"
  },
  "therapy.label.targeted": { en: "Targeted therapy (tablets for a gene change)", de: "Zielgerichtete Therapie (Tabletten bei einer Genveränderung)" },
  "therapy.hint.targeted": {
    en: "for example osimertinib, alectinib, lorlatinib, sotorasib",
    de: "zum Beispiel Osimertinib, Alectinib, Lorlatinib, Sotorasib"
  },
  "therapy.label.radiotherapy": { en: "Radiotherapy", de: "Strahlentherapie" },
  "therapy.hint.radiotherapy": { en: "radiation of the lung, brain or elsewhere", de: "Bestrahlung der Lunge, des Gehirns oder anderer Stellen" },
  "therapy.label.surgery": { en: "Surgery on the tumour", de: "Operation am Tumor" },
  "therapy.hint.surgery": { en: "removal of part of the lung or other tumour surgery", de: "Entfernung eines Teils der Lunge oder andere Tumoroperation" },
  "therapy.systemic": { en: "drug treatment", de: "medikamentöse Behandlung" },

  "step.type.title": { en: "What type of lung cancer was diagnosed?", de: "Welche Art von Lungenkrebs wurde festgestellt?" },
  "step.type.help": {
    en: "Check your doctor’s letter or pathology report. <b>NSCLC</b> means non-small cell lung cancer, <b>SCLC</b> means small cell lung cancer. Other types, such as mesothelioma, are not covered yet.",
    de: "Schauen Sie unter „Diagnose“ im Arztbrief oder im pathologischen Befund. <b>NSCLC</b> = nicht-kleinzelliges Lungenkarzinom. <b>SCLC</b> = kleinzelliges Lungenkarzinom. Andere Arten, etwa das Mesotheliom, sind noch nicht abgedeckt."
  },
  "step.type.name": { en: "Cancer type", de: "Krebsart" },
  "step.type.nsclc": { en: "Non-small cell lung cancer (NSCLC)", de: "Nicht-kleinzelliges Lungenkarzinom (NSCLC)" },
  "step.type.sclc": { en: "Small cell lung cancer (SCLC)", de: "Kleinzelliges Lungenkarzinom (SCLC)" },

  "step.histology.title": { en: "What does the tissue look like under the microscope?", de: "Wie sieht das Gewebe unter dem Mikroskop aus?" },
  "step.histology.help": {
    en: "Also in the pathology report. <b>Adenocarcinoma</b> and <b>squamous cell carcinoma</b> are the two most common kinds of NSCLC.",
    de: "Ebenfalls im pathologischen Befund (Histologie). <b>Adenokarzinom</b> und <b>Plattenepithelkarzinom</b> sind die beiden häufigsten Formen des NSCLC."
  },
  "step.histology.name": { en: "Histology", de: "Histologie" },
  "step.histology.adenocarcinoma": { en: "Adenocarcinoma (Adenokarzinom)", de: "Adenokarzinom" },
  "step.histology.squamous": { en: "Squamous cell carcinoma (Plattenepithelkarzinom)", de: "Plattenepithelkarzinom" },
  "step.histology.other": { en: "Something else", de: "Etwas anderes" },

  "step.stage.title": { en: "How far has the cancer spread?", de: "Wie weit hat sich der Krebs ausgebreitet?" },
  "step.stage.help": {
    en: "Doctors give a stage from I to IV or describe the disease as “localised”, “locally advanced” or “metastatic”. Stage IV or “metastatic” means it has spread to other organs.",
    de: "Ärztinnen und Ärzte geben ein Stadium von I bis IV an (UICC-Stadium) oder beschreiben die Erkrankung als „lokalisiert“, „lokal fortgeschritten“ oder „metastasiert“. Stadium IV oder „metastasiert“ bedeutet, dass sich der Krebs auf andere Organe ausgebreitet hat."
  },
  "step.stage.name": { en: "Stage", de: "Stadium" },
  "step.stage.I.hint": { en: "small, in one place", de: "klein, an einer Stelle" },
  "step.stage.II.hint": { en: "larger or in nearby lymph nodes", de: "größer oder in nahegelegenen Lymphknoten" },
  "step.stage.III.hint": { en: "locally advanced", de: "lokal fortgeschritten" },
  "step.stage.IV.hint": { en: "metastatic, spread to other organs", de: "metastasiert, in andere Organe ausgebreitet" },

  "step.extent.title": { en: "Limited or extensive disease?", de: "Begrenzte oder ausgedehnte Erkrankung?" },
  "step.extent.help": {
    en: "For small cell lung cancer doctors often say “limited disease” or “extensive disease” instead of a stage.",
    de: "Beim kleinzelligen Lungenkarzinom sprechen Ärztinnen und Ärzte statt von einem Stadium oft von „limited disease“ (begrenzt) oder „extensive disease“ (ausgedehnt)."
  },
  "step.extent.name": { en: "SCLC extent", de: "Ausdehnung beim SCLC" },
  "step.extent.limited": { en: "Limited disease", de: "Limited Disease (begrenzt)" },
  "step.extent.limited.hint": { en: "within one area that can be treated with radiation", de: "innerhalb eines Bereichs, der bestrahlt werden kann" },
  "step.extent.extensive": { en: "Extensive disease", de: "Extensive Disease (ausgedehnt)" },

  "step.markers.title": { en: "Gene changes found in the tumour", de: "Im Tumor gefundene Genveränderungen" },
  "step.markers.help": {
    en: "These come from molecular testing of the tumour. Choose “Found” only if your report names a change; choose “Not found” if the test looked and the result was negative. If it was not tested or you can’t tell, leave “I don’t know”. That never excludes a trial.",
    de: "Diese stammen aus der molekularen Untersuchung des Tumors (Molekularpathologie, Next-Generation-Sequencing). Wählen Sie „Gefunden“ nur, wenn Ihr Befund eine Veränderung nennt; wählen Sie „Nicht gefunden“, wenn getestet wurde und das Ergebnis negativ war. Wurde nicht getestet oder können Sie es nicht sagen, lassen Sie „Weiß ich nicht“ stehen. Das schließt nie eine Studie aus."
  },
  "step.markers.found": { en: "Found", de: "Gefunden" },
  "step.markers.notFound": { en: "Not found", de: "Nicht gefunden" },

  "step.pdl1.title": { en: "PD-L1 level", de: "PD-L1-Wert" },
  "step.pdl1.help": {
    en: "Reported as a percentage, often called “TPS” (tumour proportion score) or “PD-L1 expression”, in the pathology report.",
    de: "Wird als Prozentwert angegeben, oft als „TPS“ (Tumor Proportion Score) oder „PD-L1-Expression“, im pathologischen Befund."
  },
  "step.pdl1.name": { en: "PD-L1", de: "PD-L1" },
  "step.pdl1.ge50": { en: "50% or higher", de: "50 % oder höher" },
  "step.pdl1.1to49": { en: "1% to 49%", de: "1 % bis 49 %" },
  "step.pdl1.lt1": { en: "Below 1% (negative)", de: "Unter 1 % (negativ)" },

  "step.prior.title": { en: "Which treatments have you already had for the cancer?", de: "Welche Behandlungen haben Sie wegen des Krebses bereits erhalten?" },
  "step.prior.help": {
    en: "Check your treatment history in your doctor’s letters. Include treatment at any time, also before the cancer spread.",
    de: "Siehe „Therapie“ oder „bisherige Behandlung“ in Ihren Arztbriefen. Zählen Sie Behandlungen zu jedem Zeitpunkt mit, auch vor der Ausbreitung des Krebses."
  },

  "step.lines.title": {
    en: "How many rounds of drug treatment for advanced disease?",
    de: "Wie viele Runden medikamentöser Behandlung gab es bei fortgeschrittener Erkrankung?"
  },
  "step.lines.help": {
    en: "A “line” is one treatment plan given because the cancer had spread or come back. A new line starts when the plan is changed because the cancer grew. Treatment given after surgery to prevent a return does not count. If you have not had any drug treatment for advanced disease yet, enter 0.",
    de: "Eine „Linie“ (Therapielinie) ist ein Behandlungsplan, der gegeben wird, weil sich der Krebs ausgebreitet hat oder zurückgekehrt ist. Eine neue Linie beginnt, wenn der Plan geändert wird, weil der Krebs gewachsen ist. Eine Behandlung nach einer Operation, die ein Wiederkehren verhindern soll, zählt nicht. Wenn Sie bei fortgeschrittener Erkrankung noch keine medikamentöse Behandlung hatten, geben Sie 0 ein."
  },
  "step.lines.label": { en: "Lines of drug treatment so far", de: "Bisherige Linien medikamentöser Behandlung" },
  "step.lines.unit": { en: "lines", de: "Linien" },
  "step.lines.empty": { en: "Leave empty if you don’t know.", de: "Lassen Sie das Feld leer, wenn Sie es nicht wissen." },

  "step.current.title": { en: "What treatment are you on right now?", de: "Welche Behandlung erhalten Sie gerade?" },
  "step.current.help": {
    en: "Whatever you are currently being treated with. Choose “none” if you are between treatments or not treated at the moment.",
    de: "Womit Sie aktuell behandelt werden. Wählen Sie „keine“, wenn Sie zwischen zwei Behandlungen sind oder derzeit nicht behandelt werden."
  },
  "step.current.name": { en: "Current treatment", de: "Aktuelle Behandlung" },
  "step.current.none": { en: "No treatment right now", de: "Derzeit keine Behandlung" },
  "step.current.targeted": { en: "Targeted therapy", de: "Zielgerichtete Therapie" },

  "step.health.title": { en: "Other health conditions that trials often ask about", de: "Weitere Erkrankungen, nach denen Studien oft fragen" },
  "step.health.help": {
    en: "Check your doctor’s letters for brain metastases, lung fibrosis or interstitial lung disease (ILD), and autoimmune disease.",
    de: "Achten Sie in Ihren Arztbriefen auf „Hirnmetastasen“, „Lungenfibrose / interstitielle Lungenerkrankung (ILD)“ oder „Autoimmunerkrankung“."
  },
  "step.health.brain": { en: "Cancer in the brain (brain metastases)", de: "Krebs im Gehirn (Hirnmetastasen)" },
  "step.health.brain.none": { en: "None", de: "Keine" },
  "step.health.brain.treated": { en: "Yes, treated and stable", de: "Ja, behandelt und stabil" },
  "step.health.brain.active": { en: "Yes, untreated or causing symptoms", de: "Ja, unbehandelt oder mit Beschwerden" },
  "step.health.ild": { en: "Scarring or inflammation of the lung tissue", de: "Vernarbung oder Entzündung des Lungengewebes" },
  "step.health.ild.hint": { en: "interstitial lung disease, pulmonary fibrosis, pneumonitis", de: "interstitielle Lungenerkrankung, Lungenfibrose, Pneumonitis" },
  "step.health.autoimmune": { en: "An autoimmune disease", de: "Eine Autoimmunerkrankung" },
  "step.health.autoimmune.hint": {
    en: "for example rheumatoid arthritis, lupus, Crohn’s disease, multiple sclerosis",
    de: "zum Beispiel rheumatoide Arthritis, Lupus, Morbus Crohn, Multiple Sklerose"
  },

  "step.person.title": { en: "About you", de: "Über Sie" },
  "step.person.help": {
    en: "Age and sex are used for the age and sex limits many trials have. Nothing here is sent anywhere.",
    de: "Alter und Geschlecht werden für die Alters- und Geschlechtsgrenzen verwendet, die viele Studien haben. Nichts davon wird irgendwohin gesendet."
  },
  "step.person.age": { en: "Age", de: "Alter" },
  "step.person.years": { en: "years", de: "Jahre" },
  "step.person.sex": { en: "Sex (as used in trial criteria)", de: "Geschlecht (wie in Studienkriterien angegeben)" },
  "step.person.sex.hint": {
    en: "Registries list sex, not gender. If you prefer not to say, trials are not filtered by it.",
    de: "Register geben das biologische Geschlecht an, nicht die Geschlechtsidentität. Ohne Angabe wird nicht danach gefiltert."
  },
  "step.person.female": { en: "Female", de: "Weiblich" },
  "step.person.male": { en: "Male", de: "Männlich" },
  "step.person.unknown": { en: "Prefer not to say", de: "Möchte ich nicht angeben" },

  "step.fitness.title": { en: "How are you managing day to day?", de: "Wie kommen Sie im Alltag zurecht?" },
  "step.fitness.help": {
    en: "Doctors summarise this as the “ECOG performance status” (0 to 4). If your letter names a number you can pick the matching description. Otherwise choose the one that fits best.",
    de: "Ärztinnen und Ärzte fassen das als „ECOG-Performance-Status“ (0 bis 4) zusammen. Nennt Ihr Arztbrief eine Zahl, können Sie die passende Beschreibung wählen. Andernfalls wählen Sie die, die am besten passt."
  },
  "step.fitness.name": { en: "Day-to-day condition", de: "Zustand im Alltag" },
  "step.fitness.0": { en: "Fully active", de: "Voll aktiv" },
  "step.fitness.0.hint": { en: "I can do everything as before the illness (ECOG 0)", de: "Ich kann alles wie vor der Erkrankung tun (ECOG 0)" },
  "step.fitness.1": { en: "Slightly limited", de: "Leicht eingeschränkt" },
  "step.fitness.1.hint": {
    en: "I tire more easily but can walk and do light work (ECOG 1)",
    de: "Ich ermüde schneller, kann aber gehen und leichte Arbeit verrichten (ECOG 1)"
  },
  "step.fitness.2": { en: "Up and about, but can’t work", de: "Auf den Beinen, aber arbeitsunfähig" },
  "step.fitness.2.hint": {
    en: "I look after myself and am up more than half the day (ECOG 2)",
    de: "Ich versorge mich selbst und bin mehr als die Hälfte des Tages auf den Beinen (ECOG 2)"
  },
  "step.fitness.3": { en: "Limited self-care", de: "Eingeschränkte Selbstversorgung" },
  "step.fitness.3.hint": {
    en: "I am in bed or a chair more than half the day (ECOG 3)",
    de: "Ich liege oder sitze mehr als die Hälfte des Tages (ECOG 3)"
  },
  "step.fitness.4": { en: "Needing full care", de: "Pflegebedürftig" },
  "step.fitness.4.hint": { en: "I can’t look after myself at all (ECOG 4)", de: "Ich kann mich überhaupt nicht selbst versorgen (ECOG 4)" },

  "step.labs.title": { en: "Blood test values (optional)", de: "Blutwerte (optional)" },
  "step.labs.help": {
    en: "Only if you have a recent blood count handy. Leave anything you can’t find empty. It is perfectly fine to skip this page.",
    de: "Nur, wenn Sie ein aktuelles Blutbild zur Hand haben. Lassen Sie leer, was Sie nicht finden. Sie können diese Seite ohne Weiteres überspringen."
  },
  "step.labs.anc": { en: "Neutrophils (ANC)", de: "Neutrophile Granulozyten (ANC)" },
  "step.labs.anc.hint": { en: "also “Neutrophile”; 1500/µL = 1.5", de: "auch „Neutrophile“; 1500/µL = 1,5" },
  "step.labs.platelets": { en: "Platelets", de: "Thrombozyten" },
  "step.labs.platelets.hint": { en: "“Thrombozyten”; 150 000/µL = 150", de: "auch „Plättchen“; 150 000/µL = 150" },
  "step.labs.hemoglobin": { en: "Hemoglobin", de: "Hämoglobin" },
  "step.labs.hemoglobin.hint": { en: "“Hämoglobin”; 90 g/L = 9", de: "90 g/L = 9" },
  "step.labs.crcl": { en: "Creatinine clearance", de: "Kreatinin-Clearance" },
  "step.labs.crcl.hint": { en: "kidney function (“GFR”, “Kreatinin-Clearance”)", de: "Nierenfunktion („GFR“, „Kreatinin-Clearance“)" },

  "step.where.title": { en: "Where do you live?", de: "Wo wohnen Sie?" },
  "step.where.help": {
    en: "Used to sort trials by distance. Your postcode is looked up in a table inside this page. It is <b>not</b> sent to any routing or map service. Distances are straight-line estimates.",
    de: "Dient dazu, Studien nach Entfernung zu sortieren. Ihre Postleitzahl wird in einer Tabelle innerhalb dieser Seite nachgeschlagen. Sie wird <b>nicht</b> an einen Routen- oder Kartendienst gesendet. Entfernungen sind Luftlinien-Schätzungen."
  },
  "step.where.postcode": { en: "Postcode", de: "Postleitzahl" },
  "step.where.found": {
    en: "Found. Distances will be shown from the centre of this postcode area.",
    de: "Gefunden. Entfernungen werden ab der Mitte dieses Postleitzahlgebiets angezeigt."
  },
  "step.where.unknown": {
    en: "We don’t know this postcode, so distances stay hidden. You can still use every other feature.",
    de: "Diese Postleitzahl ist uns nicht bekannt, deshalb bleiben Entfernungen ausgeblendet. Alle anderen Funktionen können Sie weiterhin nutzen."
  },
  "step.where.empty": {
    en: "Optional. Without it, trials are not sorted by distance.",
    de: "Optional. Ohne sie werden Studien nicht nach Entfernung sortiert."
  },

  "field.biomarker": { en: "{gene} gene result", de: "Genergebnis {gene}" },
  "field.priorTherapy": { en: "previous {therapy}", de: "bisherige Behandlung: {therapy}" },
  "field.lab": { en: "blood value ({lab})", de: "Blutwert ({lab})" },
  "field.cancerType": { en: "lung cancer type", de: "Art des Lungenkrebses" },
  "field.histology": { en: "tissue type", de: "Gewebetyp" },
  "field.stage": { en: "stage", de: "Stadium" },
  "field.sclcExtent": { en: "limited or extensive disease", de: "begrenzte oder ausgedehnte Erkrankung" },
  "field.pdl1": { en: "PD-L1 level", de: "PD-L1-Wert" },
  "field.priorLines": { en: "lines of drug treatment", de: "Linien medikamentöser Behandlung" },
  "field.currentTherapy": { en: "current treatment", de: "aktuelle Behandlung" },
  "field.age": { en: "age", de: "Alter" },
  "field.sex": { en: "sex", de: "Geschlecht" },
  "field.ecog": { en: "day-to-day condition", de: "Zustand im Alltag" },
  "field.brainMets": { en: "brain metastases", de: "Hirnmetastasen" },
  "field.ild": { en: "lung scarring / inflammation", de: "Vernarbung / Entzündung der Lunge" },
  "field.autoimmune": { en: "autoimmune disease", de: "Autoimmunerkrankung" },

  "step.condition.title": { en: "Which condition are you looking for trials for?", de: "Für welche Erkrankung suchen Sie Studien?" },
  "step.condition.help": {
    en: "Trialy compares your answers with each trial’s criteria for lung cancer and multiple sclerosis, and shows every criterion as the registry wrote it, for you and your doctor to check.",
    de: "Trialy gleicht Lungenkrebs Kriterium für Kriterium ab. Bei Multipler Sklerose werden nur Alter und Geschlecht verwendet; alle anderen Kriterien werden so gezeigt, wie das Register sie geschrieben hat, damit Sie und Ihre Ärztin oder Ihr Arzt sie prüfen können."
  },
  "step.condition.name": { en: "Condition", de: "Erkrankung" },
  "step.condition.lung.hint": {
    en: "matched on diagnosis, stage, gene changes and treatment history",
    de: "abgeglichen nach Diagnose, Stadium, Genveränderungen und Behandlungsverlauf"
  },
  "step.condition.ms.hint": {
    en: "matched on age and sex only; other criteria shown as written",
    de: "abgeglichen nur nach Alter und Geschlecht; andere Kriterien wie geschrieben angezeigt"
  },

  "step.mscourse.title": { en: "Which type of multiple sclerosis do you have?", de: "Welche Verlaufsform der Multiplen Sklerose haben Sie?" },
  "step.mscourse.help": {
    en: "Your neurologist’s letter usually names it: relapsing-remitting (RRMS), secondary progressive (SPMS) or primary progressive (PPMS).",
    de: "Meist steht sie im Arztbrief unter „Verlaufsform“: schubförmig remittierend (RRMS), sekundär progredient (SPMS) oder primär progredient (PPMS)."
  },
  "step.mscourse.name": { en: "Type of multiple sclerosis", de: "Verlaufsform der Multiplen Sklerose" },
  "step.mscourse.rrms": { en: "Relapsing-remitting MS (RRMS)", de: "Schubförmig remittierende MS (RRMS)" },
  "step.mscourse.rrms.hint": { en: "symptoms come in attacks, then improve", de: "Beschwerden treten in Schüben auf und bilden sich zurück" },
  "step.mscourse.spms": { en: "Secondary progressive MS (SPMS)", de: "Sekundär progrediente MS (SPMS)" },
  "step.mscourse.spms.hint": { en: "steady worsening after a relapsing phase", de: "stetige Verschlechterung nach einer schubförmigen Phase" },
  "step.mscourse.ppms": { en: "Primary progressive MS (PPMS)", de: "Primär progrediente MS (PPMS)" },
  "step.mscourse.ppms.hint": { en: "steady worsening from the start, without clear relapses", de: "stetige Verschlechterung von Anfang an, ohne deutliche Schübe" },
  "step.mscourse.cis": { en: "A first episode (clinically isolated syndrome)", de: "Ein erstes Ereignis (klinisch isoliertes Syndrom)" },
  "step.mscourse.cis.hint": { en: "one episode, MS not yet confirmed", de: "ein einzelnes Ereignis, MS noch nicht bestätigt" },

  "step.edss.title": { en: "Your EDSS score (optional)", de: "Ihr EDSS-Wert (optional)" },
  "step.edss.help": {
    en: "The EDSS (Expanded Disability Status Scale) rates disability from 0 (no signs) to 10 in steps of 0.5. Your neurologist’s letter usually lists it. Leave it empty if you don’t know it.",
    de: "Der EDSS (Expanded Disability Status Scale) bewertet die Beeinträchtigung von 0 (keine Zeichen) bis 10 in Schritten von 0,5. Im Arztbrief steht er als „EDSS“. Lassen Sie das Feld leer, wenn Sie ihn nicht kennen."
  },
  "step.edss.label": { en: "EDSS (0 to 10)", de: "EDSS (0 bis 10)" },
  "step.edss.hint": { en: "for example 3.5", de: "zum Beispiel 3,5" },

  "step.relapse.title": { en: "When was your last relapse?", de: "Wann war Ihr letzter Schub?" },
  "step.relapse.help": {
    en: "A relapse is new or worsening symptoms lasting at least 24 hours, not caused by fever or an infection. Choose “Longer than 2 years ago, or never” if you have not had one.",
    de: "Ein Schub ist das Neuauftreten oder die Verschlechterung von Beschwerden über mindestens 24 Stunden, nicht durch Fieber oder einen Infekt bedingt. Wählen Sie „Länger als 2 Jahre her oder nie“, wenn Sie keinen hatten."
  },
  "step.relapse.name": { en: "Last relapse", de: "Letzter Schub" },
  "step.relapse.lt1": { en: "Within the last month", de: "Innerhalb des letzten Monats" },
  "step.relapse.1to3": { en: "1 to 3 months ago", de: "Vor 1 bis 3 Monaten" },
  "step.relapse.3to12": { en: "3 to 12 months ago", de: "Vor 3 bis 12 Monaten" },
  "step.relapse.12to24": { en: "1 to 2 years ago", de: "Vor 1 bis 2 Jahren" },
  "step.relapse.gt24": { en: "Longer than 2 years ago, or never", de: "Länger als 2 Jahre her oder nie" },

  "step.mstherapy.title": { en: "Which MS treatments have you had before?", de: "Welche MS-Behandlungen hatten Sie schon einmal?" },
  "step.mstherapy.help": {
    en: "Check your treatment history in your doctor’s letters. Include treatment at any time, also if you have stopped it.",
    de: "Siehe „Therapie“ oder „bisherige Behandlung“ in Ihren Arztbriefen. Zählen Sie Behandlungen zu jedem Zeitpunkt mit, auch wenn Sie sie beendet haben."
  },
  "mstherapy.interferon": { en: "Interferon beta", de: "Interferon beta" },
  "mstherapy.interferon.hint": { en: "for example Avonex, Rebif, Betaferon, Plegridy", de: "zum Beispiel Avonex, Rebif, Betaferon, Plegridy" },
  "mstherapy.glatiramer": { en: "Glatiramer acetate", de: "Glatirameracetat" },
  "mstherapy.glatiramer.hint": { en: "for example Copaxone", de: "zum Beispiel Copaxone" },
  "mstherapy.natalizumab": { en: "Natalizumab", de: "Natalizumab" },
  "mstherapy.natalizumab.hint": { en: "Tysabri", de: "Tysabri" },
  "mstherapy.antiCd20": { en: "Anti-CD20 antibody", de: "Anti-CD20-Antikörper" },
  "mstherapy.antiCd20.hint": {
    en: "ocrelizumab (Ocrevus), ofatumumab (Kesimpta), rituximab, ublituximab",
    de: "Ocrelizumab (Ocrevus), Ofatumumab (Kesimpta), Rituximab, Ublituximab"
  },
  "mstherapy.s1p": { en: "S1P modulator (tablets)", de: "S1P-Modulator (Tabletten)" },
  "mstherapy.s1p.hint": {
    en: "fingolimod (Gilenya), siponimod (Mayzent), ozanimod (Zeposia), ponesimod (Ponvory)",
    de: "Fingolimod (Gilenya), Siponimod (Mayzent), Ozanimod (Zeposia), Ponesimod (Ponvory)"
  },
  "mstherapy.fumarate": { en: "Fumarate (tablets)", de: "Fumarat (Tabletten)" },
  "mstherapy.fumarate.hint": {
    en: "dimethyl fumarate (Tecfidera), diroximel fumarate (Vumerity)",
    de: "Dimethylfumarat (Tecfidera), Diroximelfumarat (Vumerity)"
  },
  "mstherapy.teriflunomide": { en: "Teriflunomide (tablets)", de: "Teriflunomid (Tabletten)" },
  "mstherapy.teriflunomide.hint": { en: "Aubagio", de: "Aubagio" },
  "mstherapy.cladribine": { en: "Cladribine (tablets)", de: "Cladribin (Tabletten)" },
  "mstherapy.cladribine.hint": { en: "Mavenclad", de: "Mavenclad" },
  "mstherapy.alemtuzumab": { en: "Alemtuzumab", de: "Alemtuzumab" },
  "mstherapy.alemtuzumab.hint": { en: "Lemtrada", de: "Lemtrada" },

  "step.mshealth.title": { en: "Other things MS trials often ask about", de: "Weitere Punkte, nach denen MS-Studien oft fragen" },
  "step.mshealth.help": {
    en: "Each question can be answered yes, no or “I don’t know”. “I don’t know” never excludes a trial.",
    de: "Jede Frage lässt sich mit Ja, Nein oder „Weiß ich nicht“ beantworten. „Weiß ich nicht“ schließt nie eine Studie aus."
  },
  "step.mshealth.pregnancy": { en: "Pregnant, breastfeeding or planning to become pregnant", de: "Schwanger, stillend oder Schwangerschaft geplant" },
  "step.mshealth.mri": { en: "Unable to have an MRI scan", de: "MRT-Untersuchung nicht möglich" },
  "step.mshealth.mri.hint": {
    en: "for example a pacemaker or other implant, or severe claustrophobia",
    de: "zum Beispiel Herzschrittmacher oder anderes Implantat, oder ausgeprägte Platzangst"
  },
  "step.mshealth.steroids": { en: "Steroid treatment in the last 3 months", de: "Steroidbehandlung in den letzten 3 Monaten" },
  "step.mshealth.steroids.hint": { en: "often given for a relapse, as an infusion or tablets", de: "oft bei einem Schub, als Infusion oder Tabletten" },
  "step.mshealth.infection": { en: "HIV, hepatitis B or C, or tuberculosis", de: "HIV, Hepatitis B oder C oder Tuberkulose" },
  "step.mshealth.infection.hint": { en: "current or past", de: "aktuell oder früher" },
  "step.mshealth.cancer": { en: "Cancer now or in the past", de: "Krebserkrankung aktuell oder früher" },
  "step.mshealth.cancer.hint": { en: "also cancer that was treated long ago", de: "auch eine Krebserkrankung, die lange zurückliegt" },
  "step.mshealth.psychiatric": { en: "Psychiatric condition", de: "Psychiatrische Erkrankung" },
  "step.mshealth.psychiatric.hint": { en: "for example depression or psychosis, current or past", de: "zum Beispiel Depression oder Psychose, aktuell oder früher" },
  "step.mshealth.autoimmune": { en: "Another autoimmune or neurological disease besides MS", de: "Eine weitere Autoimmun- oder neurologische Erkrankung neben MS" },
  "step.mshealth.autoimmune.hint": { en: "for example lupus, rheumatoid arthritis, NMOSD or epilepsy", de: "zum Beispiel Lupus, rheumatoide Arthritis, NMOSD oder Epilepsie" },
  "step.mshealth.trial": { en: "In another study or on an investigational drug", de: "In einer anderen Studie oder mit einem Prüfpräparat behandelt" },
  "step.mshealth.trial.hint": { en: "now or in the last few months", de: "aktuell oder in den letzten Monaten" },

  "field.msCourse": { en: "type of MS", de: "Verlaufsform der MS" },
  "field.edss": { en: "EDSS score", de: "EDSS-Wert" },
  "field.lastRelapse": { en: "last relapse", de: "letzter Schub" },
  "field.msTherapy": { en: "earlier treatment with {therapy}", de: "bisherige Behandlung mit {therapy}" },
  "field.pregnancy": { en: "pregnancy or breastfeeding status", de: "Schwangerschaft oder Stillzeit" },
  "field.mriUnsuitable": { en: "ability to have an MRI", de: "Möglichkeit einer MRT-Untersuchung" },
  "field.recentSteroids": { en: "recent steroid treatment", de: "kürzliche Steroidbehandlung" },
  "field.chronicInfection": { en: "HIV, hepatitis or tuberculosis status", de: "HIV, Hepatitis oder Tuberkulose" },
  "field.cancerHistory": { en: "history of cancer", de: "Krebserkrankung in der Vorgeschichte" },
  "field.psychiatric": { en: "psychiatric condition", de: "psychiatrische Erkrankung" },
  "field.otherAutoimmune": { en: "another autoimmune or neurological disease", de: "weitere Autoimmun- oder neurologische Erkrankung" },
  "field.otherTrial": { en: "participation in another study", de: "Teilnahme an einer anderen Studie" }
})
