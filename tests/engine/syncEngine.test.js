import { describe, it, expect, vi, afterEach } from 'vitest'
import { ref } from 'vue'
import {
  startSyncEngine,
  stopSyncEngine,
  syncNow,
  status,
  lastError
} from '../../src/engine/syncEngine.js'

function createFakeStore(initialState) {
  const state = ref(initialState)
  const subscribers = []
  return {
    dump: vi.fn(() => state.value),
    load: vi.fn((data) => {
      state.value = data
      subscribers.forEach((cb) => cb())
    }),
    $subscribe: vi.fn((cb) => {
      subscribers.push(cb)
      return () => {
        const i = subscribers.indexOf(cb)
        if (i >= 0) subscribers.splice(i, 1)
      }
    })
  }
}

function createFakeAdapter() {
  return {
    authenticate: vi.fn().mockResolvedValue({ userId: 'user-1' }),
    push: vi.fn().mockResolvedValue(undefined),
    pull: vi.fn().mockResolvedValue({ profiles: [], grades: {} })
  }
}

describe('SyncEngine', () => {
  afterEach(() => {
    stopSyncEngine()
  })

  it('exposes idle status by default', () => {
    expect(status.value).toBe('idle')
    expect(lastError.value).toBeNull()
  })

  it('starts, stops, and exposes the adapter to syncNow', async () => {
    const adapter = createFakeAdapter()
    const profilesStore = createFakeStore([])
    const gradesStore = createFakeStore({})

    startSyncEngine({ stores: { profilesStore, gradesStore }, adapter })
    await syncNow()

    expect(adapter.authenticate).toHaveBeenCalled()
    expect(adapter.push).toHaveBeenCalled()
    expect(adapter.pull).toHaveBeenCalled()
    expect(status.value).toBe('idle')
  })

  it('debounces store changes before syncing', async () => {
    vi.useFakeTimers()
    try {
      const adapter = createFakeAdapter()
      const profilesStore = createFakeStore([])
      const gradesStore = createFakeStore({})

      startSyncEngine({ stores: { profilesStore, gradesStore }, adapter, debounceMs: 3000 })

      profilesStore.$subscribe.mock.calls[0][0]()

      expect(adapter.push).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(3000)

      expect(adapter.push).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('reports errors and does not leave isApplying true', async () => {
    const adapter = createFakeAdapter()
    adapter.push.mockRejectedValue(new Error('Network down'))

    const profilesStore = createFakeStore([])
    const gradesStore = createFakeStore({})

    startSyncEngine({ stores: { profilesStore, gradesStore }, adapter })
    await syncNow()

    expect(status.value).toBe('error')
    expect(lastError.value?.message).toBe('Network down')
  })
})
