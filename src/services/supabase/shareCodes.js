import { supabase } from './client.js'
import { getCurrentUserId } from './auth.js'

const SHARE_CODE_LENGTH = 6
const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const MAX_RETRIES = 5

function getCrypto() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto
  }
  throw new Error('Cryptographic random source is not available')
}

function generateShareCode() {
  const crypto = getCrypto()
  const array = new Uint32Array(SHARE_CODE_LENGTH)
  crypto.getRandomValues(array)
  let code = ''
  for (let i = 0; i < SHARE_CODE_LENGTH; i++) {
    code += ALPHANUMERIC.charAt(array[i] % ALPHANUMERIC.length)
  }
  return code
}

function isDuplicateKeyError(error) {
  return error?.code === '23505' || /duplicate key/i.test(error?.message)
}

function computeExpirationDate(ttlDays) {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + ttlDays)
  expiresAt.setMilliseconds(0)
  return expiresAt.toISOString()
}

export async function createShareCode(payload, ttlDays = 7) {
  const userId = getCurrentUserId()

  if (!userId) {
    throw new Error('Cannot create share code: user is not authenticated')
  }

  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Invalid payload: payload must be a non-null object')
  }

  if (!Number.isFinite(ttlDays) || ttlDays < 0) {
    ttlDays = 7
  }

  const expiresAt = computeExpirationDate(ttlDays)

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const code = generateShareCode()

    const { error } = await supabase.from('share_codes').insert([
      {
        code,
        user_id: userId,
        payload,
        expires_at: expiresAt
      }
    ])

    if (!error) {
      return code
    }

    if (!isDuplicateKeyError(error)) {
      console.error('Failed to create share code:', error)
      throw new Error('Failed to create share code, please try again')
    }

    console.warn(`Share code collision detected, retrying (${attempt + 1}/${MAX_RETRIES})...`)
  }

  throw new Error('Failed to create share code, please try again')
}

export async function getShareCodePayload(code) {
  const { data, error } = await supabase.rpc('get_share_code', { code_input: code })

  if (error) {
    console.error('Failed to retrieve share code:', error)
    throw new Error('Failed to retrieve share code, please try again')
  }

  if (data === null || data === undefined) {
    throw new Error('Share code not found or expired')
  }

  return data
}
