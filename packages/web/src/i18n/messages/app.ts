import { messages } from "../define"

export const app = messages({
  "error.dataLoad": {
    en: "The trial data could not be loaded ({reason}). Run “npm run pipeline” to build it, then reload.",
    de: "Die Studiendaten konnten nicht geladen werden ({reason}). Führen Sie „npm run pipeline“ aus, um sie zu erzeugen, und laden Sie die Seite dann neu."
  },

  "group.lung": { en: "Lung cancer", de: "Lungenkrebs" },
  "group.ms": { en: "Multiple sclerosis", de: "Multiple Sklerose" }
})
