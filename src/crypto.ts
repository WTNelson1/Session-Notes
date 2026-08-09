// End-to-end encryption for sync: AES-256-GCM with a key derived from the
// user's passphrase via PBKDF2. Only ciphertext ever leaves the device.

const ITERATIONS = 310_000

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(s)
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export interface EncryptedPayload {
  v: 1
  salt: string
  iv: string
  data: string
}

export async function encryptJSON(obj: unknown, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt)
  const plaintext = new TextEncoder().encode(JSON.stringify(obj))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    plaintext,
  )
  const payload: EncryptedPayload = { v: 1, salt: toB64(salt), iv: toB64(iv), data: toB64(ciphertext) }
  return JSON.stringify(payload)
}

export async function decryptJSON<T>(payloadStr: string, passphrase: string): Promise<T> {
  const payload = JSON.parse(payloadStr) as EncryptedPayload
  const key = await deriveKey(passphrase, fromB64(payload.salt))
  let plaintext: ArrayBuffer
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromB64(payload.iv) as BufferSource },
      key,
      fromB64(payload.data) as BufferSource,
    )
  } catch {
    throw new Error('Could not decrypt — is the sync passphrase the same on all devices?')
  }
  return JSON.parse(new TextDecoder().decode(plaintext)) as T
}
