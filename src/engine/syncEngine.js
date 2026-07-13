import { ref, readonly } from 'vue'
import { useAnalytics } from '../composables/useAnalytics.js'

const _status = ref('idle')
const _lastError = ref(null)
const _isApplying = ref(false)

export const status = readonly(_status)
export const lastError = readonly(_lastError)
export const isApplying = readonly(_isApplying)

let stores = null
let adapter = null
let debounceMs = 3000
let syncTimeout = null
let pendingSync = false
let localSyncInProgress = false
let unsubs = []
let isRunning = false

function isOnline() {
  return typeof navigator !== 'undefined' && navigator.onLine
}

function scheduleSync() {
  if (!isRunning) return

  if (_isApplying.value || localSyncInProgress || _status.value === 'syncing') {
    pendingSync = true
    return
  }

  clearTimeout(syncTimeout)
  syncTimeout = setTimeout(() => {
    performSync()
  }, debounceMs)
}

async function performSync() {
  if (!isRunning || !adapter) return

  if (!isOnline()) {
    _status.value = 'offline'
    localSyncInProgress = false
    return
  }

  pendingSync = false
  localSyncInProgress = true
  _status.value = 'syncing'
  _lastError.value = null

  try {
    await adapter.authenticate()

    await adapter.push({
      profiles: stores.profilesStore.dump(),
      grades: stores.gradesStore.dump()
    })

    const remote = await adapter.pull()

    const { mergeProfiles, mergeGrades } = await import('./stateMerge.js')
    const mergedProfiles = mergeProfiles(
      stores.profilesStore.dump(),
      remote.profiles,
      { syncMode: true }
    )
    const mergedGrades = mergeGrades(
      stores.gradesStore.dump(),
      remote.grades,
      mergedProfiles,
      { syncMode: true }
    )

    _isApplying.value = true
    stores.profilesStore.load(mergedProfiles)
    stores.gradesStore.load(mergedGrades)
    _isApplying.value = false

    _status.value = 'idle'
    localSyncInProgress = false

    const { trackSyncCompleted } = useAnalytics()
    trackSyncCompleted('push_pull')

    if (pendingSync) {
      pendingSync = false
      scheduleSync()
    }
  } catch (err) {
    _isApplying.value = false
    _status.value = 'error'
    _lastError.value = err
    localSyncInProgress = false
    pendingSync = false

    const { trackSyncFailed } = useAnalytics()
    trackSyncFailed(String(err?.message ?? err))
  }
}

function handleOnline() {
  if (isRunning && isOnline() && _status.value !== 'syncing') {
    syncNow()
  }
}

function handleVisibilityChange() {
  if (isRunning && document.visibilityState === 'visible') {
    scheduleSync()
  }
}

/**
 * Start the sync engine.
 * @param {object} options
 * @param {{ profilesStore: object, gradesStore: object }} options.stores
 * @param {import('./syncPort.js').SyncPort} options.adapter
 * @param {number} [options.debounceMs=3000]
 */
export function startSyncEngine({ stores: s, adapter: a, debounceMs: d = 3000 }) {
  if (isRunning) return

  stores = s
  adapter = a
  debounceMs = d
  isRunning = true

  unsubs.push(stores.profilesStore.$subscribe(scheduleSync))
  unsubs.push(stores.gradesStore.$subscribe(scheduleSync))

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline)
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }
}

/**
 * Stop the sync engine and clean up subscriptions and timers.
 */
export function stopSyncEngine() {
  if (!isRunning) return
  isRunning = false

  clearTimeout(syncTimeout)
  syncTimeout = null
  pendingSync = false
  localSyncInProgress = false

  unsubs.forEach((unsub) => unsub())
  unsubs = []

  if (typeof window !== 'undefined') {
    window.removeEventListener('online', handleOnline)
  }
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }

  _status.value = 'idle'
  _lastError.value = null
  _isApplying.value = false
  stores = null
  adapter = null
}

/**
 * Trigger a sync immediately, cancelling any pending debounced sync.
 */
export function syncNow() {
  if (!isRunning) return Promise.resolve()

  clearTimeout(syncTimeout)
  syncTimeout = null
  pendingSync = false
  return performSync()
}
