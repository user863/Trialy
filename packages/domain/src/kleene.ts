import type { Tri } from "./schema.js"

export const not = (t: Tri): Tri => (t === "yes" ? "no" : t === "no" ? "yes" : "unknown")

export const and = (ts: ReadonlyArray<Tri>): Tri =>
  ts.includes("no") ? "no" : ts.every((t) => t === "yes") ? "yes" : "unknown"

export const or = (ts: ReadonlyArray<Tri>): Tri =>
  ts.includes("yes") ? "yes" : ts.every((t) => t === "no") ? "no" : "unknown"
