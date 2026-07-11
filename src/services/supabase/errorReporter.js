import { supabase } from './client.js'
import { getCurrentUserId } from './auth.js'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 3

const rateLimitMap = new Map()

function getRateLimitKey(component, message) {
  return `${component}::${message}`
}

function isRateLimited(component, message) {
  const key = getRateLimitKey(component, message)
  const now = Date.now()
  let entry = rateLimitMap.get(key)

  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    entry = { count: 0, windowStart: now }
    rateLimitMap.set(key, entry)
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return true
  }

  entry.count += 1
  return false
}

export async function reportError(error, component = 'global') {
  const message = error?.message ?? String(error)
  const stack = error?.stack ?? null

  if (isRateLimited(component, message)) {
    return
  }

  const userId = getCurrentUserId()
  const url = typeof window !== 'undefined' ? window.location.href : null

  try {
    const { error: insertError } = await supabase
      .from('errors')
      .insert([{ user_id: userId, message, stack, component, url }])

    if (insertError) {
      console.error('Failed to report error to Supabase:', insertError)
    }
  } catch (err) {
    console.error('Unexpected error reporting error to Supabase:', err)
  }
}

export function installErrorHandlers(app) {
  if (app?.config) {
    const existingHandler = app.config.errorHandler
    app.config.errorHandler = (err, instance, info) => {
      reportError(err, 'vue')
      if (typeof existingHandler === 'function') {
        existingHandler(err, instance, info)
      }
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      const err = event.error ?? new Error(event.message ?? 'Unknown window error')
      reportError(err, 'window')
    })

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason
      const err =
        reason instanceof Error
          ? reason
          : new Error(typeof reason === 'string' ? reason : 'Unhandled promise rejection')
      reportError(err, 'unhandledrejection')
    })
  }
}
