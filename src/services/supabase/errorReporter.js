import { supabase } from './client.js'
import { getCurrentUserId } from './auth.js'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_COUNT = 3

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const PHONE_RE = /(?:\+?86)?1[3-9]\d{9}/g
const UUID_RE = /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g
const TOKEN_RE = /\b(eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*)\b/g
const SHARE_CODE_RE = /(share[_-]?code|code[_-]?input|code)\s*[:=]\s*([A-Za-z0-9]{6})/gi

const rateLimitMap = new Map()
let errorHandlersInstalled = false

function maskScores(text) {
  // Mask likely score values while preserving line:column markers like "foo:42:15".
  // Implemented without regex lookbehind for Safari < 16.4 compatibility.
  const protectedMarkers = []
  text = text.replace(/:\d+:\d+/g, (match) => {
    const placeholder = `__LINE_COL_${protectedMarkers.length}__`
    protectedMarkers.push(match)
    return placeholder
  })

  text = text.replace(/\b(?:100|\d{1,2}(?:\.\d+)?)\b/g, '[score]')

  protectedMarkers.forEach((marker, index) => {
    text = text.replace(`__LINE_COL_${index}__`, marker)
  })

  return text
}

function sanitize(text) {
  if (typeof text !== 'string') return text
  text = text
    .replace(EMAIL_RE, '[email]')
    .replace(PHONE_RE, '[phone]')
    .replace(UUID_RE, '[uuid]')
    .replace(TOKEN_RE, '[token]')
    .replace(SHARE_CODE_RE, '$1=[share-code]')
    .replace(/\buser[_-]?id\s*[:=]\s*[^\s&]+/gi, '[user-id]')
    .replace(/\bid\s*[:=]\s*[^\s&]+/gi, '[id]')
    .replace(/\baccess[_-]?token\s*[:=]\s*[^\s&]+/gi, '[access-token]')
    .replace(/\brefresh[_-]?token\s*[:=]\s*[^\s&]+/gi, '[refresh-token]')
    .replace(/\b[a-z]{2}-[a-z]{2}\b/gi, (match) => (match === 'zh-CN' || match === 'en-US' ? match : '[lang]'))
    .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?\b/g, '[timestamp]')

  return maskScores(text)
}

function pruneStaleEntries(now) {
  for (const [key, entry] of rateLimitMap) {
    if (now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(key)
    }
  }
}

function isRateLimited(key) {
  const now = Date.now()

  pruneStaleEntries(now)

  let entry = rateLimitMap.get(key)

  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    entry = { count: 0, windowStart: now }
    rateLimitMap.set(key, entry)
  }

  if (entry.count >= RATE_LIMIT_COUNT) {
    return true
  }

  entry.count += 1
  return false
}

export async function reportError(error, component = 'global') {
  if (!supabase) {
    return
  }

  const rawMessage = error?.message ?? String(error)
  const rawStack = error?.stack ?? null
  const message = sanitize(rawMessage)
  const stack = sanitize(rawStack)
  const url = sanitize(typeof window !== 'undefined' ? window.location.href : null)
  const rateLimitKey = `${component}:${message}`

  if (isRateLimited(rateLimitKey)) {
    return
  }

  const userId = getCurrentUserId()

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
