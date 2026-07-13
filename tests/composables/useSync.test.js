import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

const engineMocks = {
  syncNow: vi.fn(),
  status: ref('idle'),
  lastError: ref(null),
  isApplying: ref(false)
}

vi.mock('../../src/engine/syncEngine.js', () => ({
  syncNow: (...args) => engineMocks.syncNow(...args),
  status: engineMocks.status,
  lastError: engineMocks.lastError,
  isApplying: engineMocks.isApplying
}))

describe('useSync composable', () => {
  beforeEach(() => {
    vi.resetModules()
    engineMocks.syncNow.mockReset()
    engineMocks.status.value = 'idle'
    engineMocks.lastError.value = null
    engineMocks.isApplying.value = false
  })

  it('re-exports the sync engine surface', async () => {
    const { useSync } = await import('../../src/composables/useSync.js')
    const sync = useSync()

    expect(sync.status).toBe(engineMocks.status)
    expect(sync.lastError).toBe(engineMocks.lastError)
    expect(sync.isApplying).toBe(engineMocks.isApplying)
    expect(typeof sync.sync).toBe('function')
  })

  it('delegates sync calls to the engine', async () => {
    const { useSync } = await import('../../src/composables/useSync.js')
    const { sync } = useSync()

    await sync()

    expect(engineMocks.syncNow).toHaveBeenCalled()
  })
})
