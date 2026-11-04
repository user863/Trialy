import { attempt, err, ok, type Result } from "./result"

const DB = "trial-finder"
const STORE = "kv"

export type StoreError = "unavailable" | "blocked"

const unavailable = (): StoreError => "unavailable"

// IndexedDB and localStorage throw in private windows or with blocked site data; the app must still work
export const pref = {
  get: (key: string) => {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set: (key: string, value: string | null) => {
    try {
      if (value === null) localStorage.removeItem(key)
      else localStorage.setItem(key, value)
    } catch {
      return
    }
  }
}

let connection: Promise<IDBDatabase> | null = null

const connect = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => {
      const db = request.result
      db.onversionchange = () => {
        db.close()
        connection = null
      }
      resolve(db)
    }
    request.onerror = () => reject(request.error)
  })

const open = () =>
  (connection ??= connect().catch((cause) => {
    connection = null
    throw cause
  }))

export const kvGet = <T>(key: string): Promise<Result<T | undefined, StoreError>> =>
  attempt(async () => {
    const db = await open()
    return new Promise<T | undefined>((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).get(key)
      request.onsuccess = () => resolve(request.result as T | undefined)
      request.onerror = () => reject(request.error)
    })
  }, unavailable)

export const kvSet = (key: string, value: unknown): Promise<Result<void, StoreError>> =>
  attempt(async () => {
    const db = await open()
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite")
      tx.objectStore(STORE).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }, unavailable)

const clearWebStorage = () =>
  attempt(async () => {
    localStorage.clear()
    sessionStorage.clear()
  }, unavailable)

const deleteDatabase = async (): Promise<Result<void, StoreError>> => {
  const db = await connection?.catch(() => null)
  db?.close()
  connection = null
  return new Promise((resolve) => {
    try {
      const request = indexedDB.deleteDatabase(DB)
      request.onsuccess = () => resolve(ok(undefined))
      request.onerror = () => resolve(err("unavailable"))
      request.onblocked = () => resolve(err("blocked"))
    } catch {
      resolve(err("unavailable"))
    }
  })
}

export const wipeAll = async (): Promise<Result<void, StoreError>> => {
  const [webStorage, database] = await Promise.all([clearWebStorage(), deleteDatabase()])
  return webStorage.ok ? database : webStorage
}
