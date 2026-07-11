import { supabase } from './client.js'
import { getCurrentUserId } from './auth.js'

const MAX_QUEUE_SIZE = 10
const FLUSH_DELAY_MS = 5000
const SENSITIVE_KEYS = new Set([
  'courseName',
  'score',
  'profileName',
  'courseNames',
  'scores'
])

let queue = []
let flushTimer = null

function filterProperties(value) {
  if (Array.isArray(value)) {
    return value.map(filterProperties)
  }

  if (value !== null && typeof value === 'object') {
    const filtered = {}
    for (const [key, val] of Object.entries(value)) {
      if (!SENSITIVE_KEYS.has(key)) {
        filtered[key] = filterProperties(val)
      }
    }
    return filtered
  }

  return value
}

function startFlushTimer() {
  if (flushTimer === null) {
    flushTimer = setTimeout(() => {
      flush()
    }, FLUSH_DELAY_MS)
  }
}

function clearFlushTimer() {
  if (flushTimer !== null) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
}

export function track(name, properties = {}) {
  const event = {
    name,
    properties: filterProperties(properties)
  }

  queue.push(event)

  if (queue.length >= MAX_QUEUE_SIZE) {
    clearFlushTimer()
    flush()
  } else {
    startFlushTimer()
  }
}

export async function flush() {
  const eventsToFlush = queue
  queue = []
  clearFlushTimer()

  if (eventsToFlush.length === 0) {
    return
  }

  const userId = getCurrentUserId()
  if (!userId) {
    queue.unshift(...eventsToFlush)
    startFlushTimer()
    return
  }

  const rows = eventsToFlush.map((event) => ({
    user_id: userId,
    name: event.name,
    properties: event.properties
  }))

  try {
    const { error } = await supabase.from('events').insert(rows)
    if (error) {
      console.error('Failed to flush analytics events:', error)
    }
  } catch (err) {
    console.error('Unexpected error flushing analytics events:', err)
  }
}

export function clearQueue() {
  queue = []
  clearFlushTimer()
}
