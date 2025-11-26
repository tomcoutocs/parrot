// Encryption key from environment variable
// This should be a 32-byte (256-bit) key for AES-256
const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_KEY || process.env.NEXT_PUBLIC_API_KEY_ENCRYPTION_KEY

// Algorithm for encryption
const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256 // 256 bits
const IV_LENGTH = 12 // 12 bytes for AES-GCM (recommended)
const SALT_LENGTH = 16 // 16 bytes for salt
const TAG_LENGTH = 16 // 16 bytes for authentication tag
const PBKDF2_ITERATIONS = 100000

/**
 * Converts a string to ArrayBuffer
 */
function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoded = new TextEncoder().encode(str)
  const buffer = encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength)
  return buffer as ArrayBuffer
}

/**
 * Converts ArrayBuffer to string
 */
function arrayBufferToString(buffer: ArrayBuffer): string {
  return new TextDecoder().decode(buffer)
}

/**
 * Converts base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Converts ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Derives a key from the encryption key using PBKDF2
 */
async function deriveKey(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
  // Import the password as a key
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    stringToArrayBuffer(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  // Derive the key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypts a string value
 * Returns base64 encoded string: salt:iv:encryptedDataWithTag
 */
export async function encrypt(text: string): Promise<string | null> {
  if (!text || text.trim() === '') {
    return null
  }

  if (!ENCRYPTION_KEY) {
    console.warn('API_KEY_ENCRYPTION_KEY not set, storing API keys in plain text (not recommended for production)')
    return text // Fallback to plain text if encryption key is not set
  }

  try {
    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
    
    // Derive key from password and salt
    const key = await deriveKey(ENCRYPTION_KEY, salt.buffer)
    
    // Encrypt the text
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      stringToArrayBuffer(text)
    )
    
    // Combine salt:iv:encryptedDataWithTag
    const saltBase64 = arrayBufferToBase64(salt.buffer)
    const ivBase64 = arrayBufferToBase64(iv.buffer)
    const encryptedBase64 = arrayBufferToBase64(encryptedData)
    
    const result = `${saltBase64}:${ivBase64}:${encryptedBase64}`
    
    return result
  } catch (error) {
    console.error('Error encrypting data:', error)
    // Fallback to plain text if encryption fails
    return text
  }
}

/**
 * Decrypts an encrypted string
 * Expects base64 encoded string: salt:iv:encryptedDataWithTag
 */
export async function decrypt(encryptedText: string | null | undefined): Promise<string | null> {
  if (!encryptedText || encryptedText.trim() === '') {
    return null
  }

  if (!ENCRYPTION_KEY) {
    // If no encryption key, assume it's plain text (backwards compatibility)
    return encryptedText
  }

  try {
    // Check if it's already plain text (doesn't contain colons in the expected format)
    // Encrypted data should have format: salt:iv:encryptedDataWithTag (3 parts)
    const parts = encryptedText.split(':')
    
    // If it doesn't have 3 parts, assume it's plain text
    if (parts.length !== 3) {
      return encryptedText
    }
    
    const [saltBase64, ivBase64, encryptedBase64] = parts
    
    // Decode from base64
    const salt = base64ToArrayBuffer(saltBase64)
    const iv = base64ToArrayBuffer(ivBase64)
    const encryptedData = base64ToArrayBuffer(encryptedBase64)
    
    // Derive key from password and salt
    const key = await deriveKey(ENCRYPTION_KEY, salt)
    
    // Decrypt the text
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      encryptedData
    )
    
    return arrayBufferToString(decryptedBuffer)
  } catch (error) {
    console.error('Error decrypting data:', error)
    // If decryption fails, it might be plain text (backwards compatibility)
    // Return the original value
    return encryptedText
  }
}

/**
 * Checks if encryption is properly configured
 */
export function isEncryptionConfigured(): boolean {
  return !!ENCRYPTION_KEY
}

