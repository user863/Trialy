export const config = {
  dataUrl: `${import.meta.env.BASE_URL}data`,
  group: import.meta.env.VITE_GROUP ?? "lung",
  maxShortlist: 5,
  pageSize: 20,
  homeCountries: [
    { code: "DE", name: "Germany", example: "10115" },
    { code: "AT", name: "Austria", example: "1010" },
    { code: "CH", name: "Switzerland", example: "8001" },
    { code: "NL", name: "Netherlands", example: "1012" },
    { code: "BE", name: "Belgium", example: "1000" },
    { code: "LU", name: "Luxembourg", example: "1111" },
    { code: "FR", name: "France", example: "75001" },
    { code: "DK", name: "Denmark", example: "1050" },
    { code: "PL", name: "Poland", example: "00001" },
    { code: "CZ", name: "Czechia", example: "11000" }
  ] as const,
  postcodeLength: { DE: 5, AT: 4, CH: 4, NL: 4, BE: 4, LU: 4, FR: 5, DK: 4, PL: 5, CZ: 5 }
} as const
