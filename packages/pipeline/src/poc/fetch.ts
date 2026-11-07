import { Effect, Schema as S } from "effect"
import { createWriteStream } from "node:fs"
import { mkdir, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { once } from "node:events"
import { buildUrl, fetchJson, normalise, Page } from "../ctgov.js"
import { config } from "../config.js"
import type { GroupConfig } from "../groups.js"
import { FIELDS } from "./fields.js"

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

const scope = arg("scope") ?? "covered"
if (scope !== "covered" && scope !== "world") throw new Error('--scope must be "covered" or "world"')
const limit = arg("limit") === undefined ? Infinity : Number(arg("limit"))
const out = resolve(arg("out") ?? join(config.paths.cacheDir, "poc", scope))

const group: GroupConfig = {
  id: "all",
  label: "All fields",
  condQuery: "",
  countries: scope === "world" ? "world" : undefined,
  conditionRe: /./,
  reader: "general"
}

const program = Effect.gen(function* () {
  yield* Effect.tryPromise(() => mkdir(out, { recursive: true }))
  const file = createWriteStream(join(out, "trials.ndjson"))
  const fields: Record<string, string[]> = {}
  let token: string | undefined
  let total = 0
  let seen = 0
  let kept = 0
  const started = Date.now()
  do {
    const json = yield* fetchJson(buildUrl(group, token, "protocolSection|ConditionBrowseModule"))
    const page = yield* S.decodeUnknown(Page)(json)
    total ||= page.totalCount ?? 0
    seen += page.studies.length
    token = page.nextPageToken
    const trials = yield* normalise(page.studies, group)
    for (const study of page.studies as any[]) {
      const id = study.protocolSection?.identificationModule?.nctId as string
      const mesh = study.derivedSection?.conditionBrowseModule
      fields[id] = FIELDS(
        [...(mesh?.meshes ?? []), ...(mesh?.ancestors ?? [])].map((m: { term: string }) => m.term)
      )
    }
    for (const t of trials) {
      if (!file.write(JSON.stringify(t) + "\n")) yield* Effect.promise(() => once(file, "drain"))
    }
    kept += trials.length
    yield* Effect.log(`${seen}/${total} fetched, ${kept} kept, ${Math.round((Date.now() - started) / 1000)}s`)
    if (token && seen < limit) yield* Effect.sleep(config.ctgov.pageDelayMs)
  } while (token && seen < limit)
  yield* Effect.promise(() => new Promise<void>((done) => file.end(done)))
  yield* Effect.tryPromise(() =>
    writeFile(
      join(out, "meta.json"),
      JSON.stringify({ scope, fetchedAt: new Date().toISOString(), apiTotal: total, fetched: seen, kept, droppedWithoutSites: seen - kept }, null, 2)
    )
  )
  yield* Effect.tryPromise(() => writeFile(join(out, "fields.json"), JSON.stringify(fields)))
})

Effect.runPromise(program).catch((e) => {
  console.error(e)
  process.exit(1)
})
