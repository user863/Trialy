export const config = {
  dataUrl: `${import.meta.env.BASE_URL}data`,
  group: import.meta.env.VITE_GROUP ?? "lung",
  maxShortlist: 5,
  postcodeLength: { DE: 5, AT: 4, CH: 4 }
} as const
