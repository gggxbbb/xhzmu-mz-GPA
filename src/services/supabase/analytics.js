import { supabase } from './client.js'
import { getCurrentUserId } from './auth.js'

const MAX_QUEUE_SIZE = 10
const FLUSH_DELAY_MS = 5000
const MAX_RETRIES = 3
const SENSITIVE_KEYS = new Set([
  'courseName',
  'score',
  'profileName',
  'courseNames',
  'scores',
  'email',
  'phone',
  'name',
  'password',
  'token',
  'userId',
  'id',
  'address',
  'note',
  'notes'
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
      flushTimer = null
      flush().catch((err) => {
        console.error('Unexpected error in analytics flush timer:', err)
      })
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
    properties: filterProperties(properties),
    retryCount: 0
  }

  queue.push(event)

  if (queue.length >= MAX_QUEUE_SIZE) {
    clearFlushTimer()
    flush().catch((err) => {
      console.error('Unexpected error in analytics flush:', err)
    })
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

  if (!supabase) {
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
      requeueEvents(eventsToFlush)
    }
  } catch (err) {
    console.error('Unexpected error flushing analytics events:', err)
    requeueEvents(eventsToFlush)
  }
}

function requeueEvents(events) {
  const eventsToRetry = []

  for (const event of events) {
    const retryCount = event.retryCount + 1
    if (retryCount > MAX_RETRIES) {
      console.error('Dropping analytics event after max retries:', event.name)
      continue
    }
    eventsToRetry.push({ ...event, retryCount })
  }

  if (eventsToRetry.length > 0) {
    queue.unshift(...eventsToRetry)
    startFlushTimer()
  }
}

export function clearQueue() {
  queue = []
  clearFlushTimer()
}
