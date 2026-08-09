import * as Crypto from 'expo-crypto'

// Security and hashing module for MHike App
// Provides SHA-256 cryptographic hashing and safe token encoding helpers

// Generates a one-way SHA-256 cryptographic hash using expo-crypto
export async function hashData(input: string): Promise<string> {
  if (!input) return ''
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    input,
    { encoding: Crypto.CryptoEncoding.HEX }
  )
}

// Encodes string token for local session storage
export function encryptData(text: string): string {
  if (!text) return ''
  try {
    const encoded = encodeURIComponent(text)
    return typeof globalThis.btoa === 'function' ? globalThis.btoa(encoded) : encoded
  } catch {
    return text
  }
}

// Decodes string token from local session storage
export function decryptData(cipherText: string): string {
  if (!cipherText) return ''
  try {
    const raw = typeof globalThis.atob === 'function' ? globalThis.atob(cipherText) : cipherText
    return decodeURIComponent(raw)
  } catch {
    return cipherText
  }
}

