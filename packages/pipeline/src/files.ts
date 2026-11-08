import { readFile } from "node:fs/promises"

export interface ManifestGroup {
  readonly id: string
  readonly label: string
  readonly version: string
  readonly trials: number
  readonly file: string
}

export interface Manifest {
  readonly groups: ReadonlyArray<ManifestGroup>
  readonly generatedAt: string
  readonly index?: unknown
}

export const readJson = async <T>(path: string): Promise<T> => JSON.parse(await readFile(path, "utf8")) as T

export const readJsonIfPresent = async <T>(path: string): Promise<T | null> => {
  try {
    return await readJson<T>(path)
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null
    throw e
  }
}
