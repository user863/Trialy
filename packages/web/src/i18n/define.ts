export type Entry = { readonly en: string; readonly de: string }

export const messages = <const T extends Record<string, Entry>>(m: T) => m
