export const FIELD_TERMS: Record<string, string> = {
  Neoplasms: "oncology",
  "Nervous System Diseases": "neurology",
  "Cardiovascular Diseases": "cardiovascular",
  "Respiratory Tract Diseases": "respiratory",
  "Digestive System Diseases": "digestive",
  Infections: "infections",
  "Musculoskeletal Diseases": "musculoskeletal",
  "Skin and Connective Tissue Diseases": "skin",
  "Nutritional and Metabolic Diseases": "metabolic",
  "Endocrine System Diseases": "endocrine",
  "Mental Disorders": "mental-health",
  "Urogenital Diseases": "urogenital",
  "Female Urogenital Diseases and Pregnancy Complications": "women-pregnancy",
  "Hemic and Lymphatic Diseases": "blood",
  "Immune System Diseases": "immune",
  "Eye Diseases": "eye",
  "Otorhinolaryngologic Diseases": "ent",
  "Stomatognathic Diseases": "dental",
  "Congenital, Hereditary, and Neonatal Diseases and Abnormalities": "congenital",
  "Wounds and Injuries": "injuries"
}

export const FIELDS = (terms: ReadonlyArray<string>): string[] => {
  const hit = new Set(terms.map((t) => FIELD_TERMS[t]).filter((f): f is string => f !== undefined))
  return hit.size ? [...hit].sort() : ["other"]
}
