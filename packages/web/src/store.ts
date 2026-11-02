const DB = "trial-finder"
const STORE = "kv"
const mem = new Map<string, unknown>()

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

const open = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(STORE)
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })

export async function kvGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await open()
    return await new Promise<T | undefined>((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(key)
      req.onsuccess = () => resolve(req.result as T | undefined)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return mem.get(key) as T | undefined
  }
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  mem.set(key, value)
  try {
    const db = await open()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite")
      tx.objectStore(STORE).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    return
  }
}

export async function wipeAll(): Promise<void> {
  mem.clear()
  try {
    localStorage.clear()
    sessionStorage.clear()
  } catch {
    /* ignore */
  }
  await new Promise<void>((resolve) => {
    try {
      const r = indexedDB.deleteDatabase(DB)
      r.onsuccess = r.onerror = r.onblocked = () => resolve()
    } catch {
      resolve()
    }
  })
}
