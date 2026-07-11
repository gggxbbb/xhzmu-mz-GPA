import { supabase } from './client.js'
import { getCurrentUserId } from './auth.js'

const SHARE_CODE_LENGTH = 6
const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

function generateShareCode() {
  let code = ''
  for (let i = 0; i < SHARE_CODE_LENGTH; i++) {
    code += ALPHANUMERIC.charAt(Math.floor(Math.random() * ALPHANUMERIC.length))
  }
  return code
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

  const code = generateShareCode()
  const expiresAt = computeExpirationDate(ttlDays)

  const { error } = await supabase.from('share_codes').insert([
    {
      code,
      user_id: userId,
      payload,
      expires_at: expiresAt
    }
  ])

  if (error) {
    throw new Error(`Failed to create share code: ${error.message}`)
  }

  return code
}

export async function getShareCodePayload(code) {
  const { data, error } = await supabase.rpc('get_share_code', { code_input: code })

  if (error) {
    throw new Error(`Failed to retrieve share code: ${error.message}`)
  }

  if (data === null || data === undefined) {
    throw new Error('Share code not found or expired')
  }

  return data
}
