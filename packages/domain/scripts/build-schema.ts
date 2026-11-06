import { JSONSchema } from "effect"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { Bundle, Profile, Rule } from "../src/schema.js"

const outDir = join(dirname(fileURLToPath(import.meta.url)), "../schema")

const documents = {
  "rule.schema.json": { title: "Trialy rule", schema: Rule },
  "bundle.schema.json": { title: "Trialy trial bundle", schema: Bundle },
  "profile.schema.json": { title: "Trialy patient profile", schema: Profile }
} as const

await mkdir(outDir, { recursive: true })

for (const [file, { title, schema }] of Object.entries(documents)) {
  const json = { ...JSONSchema.make(schema as never), title }
  await writeFile(join(outDir, file), `${JSON.stringify(json, null, 2)}\n`)
}
