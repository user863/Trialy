import { attempt, attemptSync, err, ok, type Result } from "./result"

export type CryptoError = "unsupported" | "not-trialbase" | "wrong-passphrase" | "damaged"

const ITER = 310_000
const APPS = ["trialbase", "trial-finder"]

type Envelope = { readonly salt: string; readonly iv: string; readonly data: string }

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u))
const unb64 = (s: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

const supported = () => typeof crypto !== "undefined" && crypto.subtle !== undefined

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

const isEnvelope = (value: object): value is Envelope =>
  ["salt", "iv", "data"].every((field) => typeof (value as Record<string, unknown>)[field] === "string")

const readEnvelope = (file: string): Result<Envelope, CryptoError> => {
  const parsed = attemptSync((): unknown => JSON.parse(file), (): CryptoError => "damaged")
  if (!parsed.ok) return parsed
  const json = parsed.value
  if (typeof json !== "object" || json === null || !APPS.includes((json as { app?: string }).app ?? "")) return err("not-trialbase")
  return isEnvelope(json) ? ok(json) : err("damaged")
}

export async function encryptJson(data: unknown, pass: string): Promise<Result<string, CryptoError>> {
  if (!supported()) return err("unsupported")
  return attempt(async () => {
    const salt = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)))
    const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)))
    const k = await key(pass, salt, ["encrypt"])
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, new TextEncoder().encode(JSON.stringify(data))))
    return JSON.stringify({ app: "trialbase", v: 1, iter: ITER, salt: b64(salt), iv: b64(iv), data: b64(ct) })
  }, (): CryptoError => "unsupported")
}

export async function decryptJson(file: string, pass: string): Promise<Result<unknown, CryptoError>> {
  if (!supported()) return err("unsupported")
  const envelope = readEnvelope(file)
  if (!envelope.ok) return envelope
  const bytes = attemptSync(
    () => ({ salt: unb64(envelope.value.salt), iv: unb64(envelope.value.iv), data: unb64(envelope.value.data) }),
    (): CryptoError => "damaged"
  )
  if (!bytes.ok) return bytes
  const { salt, iv, data } = bytes.value
  return attempt(async () => {
    const k = await key(pass, salt, ["decrypt"])
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, k, data)
    return JSON.parse(new TextDecoder().decode(plain)) as unknown
  }, (): CryptoError => "wrong-passphrase")
}
