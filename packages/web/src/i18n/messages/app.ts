import { messages } from "../define"

export const app = messages({
  "error.dataLoad": {
    en: "The trial data could not be loaded ({reason}). Run “npm run pipeline” to build it, then reload.",
    de: "Die Studiendaten konnten nicht geladen werden ({reason}). Führen Sie „npm run pipeline“ aus, um sie zu erzeugen, und laden Sie die Seite dann neu."
  },
  "ics.summary": { en: "Check again for clinical trials", de: "Erneut nach klinischen Studien schauen" },
  "ics.description": {
    en: "Open Trialy, update anything that changed (new scan, new treatment, new test result) and see what is new.",
    de: "Öffnen Sie Trialy, aktualisieren Sie, was sich geändert hat (neue Untersuchung, neue Behandlung, neues Testergebnis), und sehen Sie, was neu ist."
  },
  "map.title": { en: "Where trials are recruiting.", de: "Wo Studien rekrutieren." },
  "map.lead": {
    en: "Cities with sites listed as recruiting in the registry. Add your postcode to sort by distance. It is looked up on this device and never sent anywhere.",
    de: "Städte mit Zentren, die im Register als rekrutierend geführt werden. Geben Sie Ihre Postleitzahl ein, um nach Entfernung zu sortieren. Sie wird auf diesem Gerät nachgeschlagen und nirgendwohin gesendet."
  },
  "map.browse": { en: "Browse trials", de: "Studien ansehen" },
  "map.label": { en: "Map with {count} cities that have recruiting sites", de: "Karte mit {count} Städten mit rekrutierenden Zentren" },
  "map.trials.one": { en: "{count} recruiting trial here", de: "{count} rekrutierende Studie hier" },
  "map.trials.other": { en: "{count} recruiting trials here", de: "{count} rekrutierende Studien hier" },

  "group.lung": { en: "Lung cancer", de: "Lungenkrebs" },
  "group.ms": { en: "Multiple sclerosis", de: "Multiple Sklerose" }
})
