const ITER = 310_000
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u))
const unb64 = (s: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

const key = async (pass: string, salt: Uint8Array<ArrayBuffer>, usage: KeyUsage[]) => {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"])
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    usage
  )
}

export async function encryptJson(data: unknown, pass: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)))
  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)))
  const k = await key(pass, salt, ["encrypt"])
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, new TextEncoder().encode(JSON.stringify(data))))
  return JSON.stringify({ app: "trialbase", v: 1, iter: ITER, salt: b64(salt), iv: b64(iv), data: b64(ct) })
}

export async function decryptJson(file: string, pass: string): Promise<unknown> {
  const f = JSON.parse(file)
  if (f.app !== "trialbase" && f.app !== "trial-finder") throw new Error("This is not a TrialBase file.")
  const k = await key(pass, unb64(f.salt), ["decrypt"])
  try {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(f.iv) }, k, unb64(f.data))
    return JSON.parse(new TextDecoder().decode(pt))
  } catch {
    throw new Error("Wrong passphrase, or the file is damaged.")
  }
}
