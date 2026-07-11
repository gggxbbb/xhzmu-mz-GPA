import { supabase } from './client.js'
import { getCurrentUserId } from './auth.js'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_COUNT = 3

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const PHONE_RE = /(?:\+?86)?1[3-9]\d{9}/g
// Mask likely score values while preserving line:column numbers in stack traces.
const SCORE_RE = /(?<!:)\b(?:100|\d{1,2}(?:\.\d+)?)\b(?!:)/g

const rateLimitMap = new Map()
let errorHandlersInstalled = false

function sanitize(text) {
  if (typeof text !== 'string') return text
  return text
    .replace(EMAIL_RE, '[email]')
    .replace(PHONE_RE, '[phone]')
    .replace(SCORE_RE, '[score]')
}

function pruneStaleEntries(now) {
  for (const [key, entry] of rateLimitMap) {
    if (now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(key)
    }
  }
}

function isRateLimited(component) {
  const now = Date.now()

  pruneStaleEntries(now)

  let entry = rateLimitMap.get(component)

  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    entry = { count: 0, windowStart: now }
    rateLimitMap.set(component, entry)
  }

  if (entry.count >= RATE_LIMIT_COUNT) {
    return true
  }

  entry.count += 1
  return false
}

export async function reportError(error, component = 'global') {
  const message = sanitize(error?.message ?? String(error))
  const stack = sanitize(error?.stack ?? null)

  if (isRateLimited(component)) {
    return
  }

  const userId = getCurrentUserId()
  const url = sanitize(typeof window !== 'undefined' ? window.location.href : null)

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
  if (errorHandlersInstalled) {
    return
  }
  errorHandlersInstalled = true

  if (app?.config) {
    const existingHandler = app.config.errorHandler
    app.config.errorHandler = (err, instance, info) => {
      reportError(err, 'vue').catch(() => {})
      if (typeof existingHandler === 'function') {
        existingHandler(err, instance, info)
      }
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      const err = event.error ?? new Error(event.message ?? 'Unknown window error')
      reportError(err, 'window').catch(() => {})
    })

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason
      const err =
        reason instanceof Error
          ? reason
          : new Error(typeof reason === 'string' ? reason : 'Unhandled promise rejection')
      reportError(err, 'unhandledrejection').catch(() => {})
    })
  }
}
