import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'

const authState = {
  userId: 'user-1'
}

const syncMocks = {
  pushState: vi.fn(),
  pullState: vi.fn(),
  mergeProfiles: vi.fn(),
  mergeGrades: vi.fn()
}

const profilesStore = {
  profiles: ref([]),
  load: vi.fn()
}

const gradesStore = {
  gradesByProfile: ref({}),
  load: vi.fn()
}

const analyticsMocks = {
  trackSyncCompleted: vi.fn(),
  trackSyncFailed: vi.fn()
}

vi.mock('../../src/services/supabase/config.js', () => ({
  isSupabaseConfigured: () => true
}))

vi.mock('../../src/services/supabase/sync.js', () => ({
  pushState: (...args) => syncMocks.pushState(...args),
  pullState: () => syncMocks.pullState(),
  mergeProfiles: (...args) => syncMocks.mergeProfiles(...args),
  mergeGrades: (...args) => syncMocks.mergeGrades(...args)
}))

vi.mock('../../src/services/supabase/auth.js', () => ({
  initAnonymousAuth: vi.fn(() => {
    authState.userId = 'user-1'
    return Promise.resolve({ user: { id: 'user-1' }, error: null })
  }),
  getCurrentUserId: () => authState.userId
}))

vi.mock('../../src/stores/profiles.js', () => ({
  useProfilesStore: () => profilesStore
}))

vi.mock('../../src/stores/grades.js', () => ({
  useGradesStore: () => gradesStore
}))

vi.mock('../../src/composables/useAnalytics.js', () => ({
  useAnalytics: () => analyticsMocks
}))

describe('useSync composable', () => {
  beforeEach(() => {
    vi.resetModules()
    authState.userId = 'user-1'

    syncMocks.pushState.mockReset().mockResolvedValue({ error: null })
    syncMocks.pullState.mockReset().mockResolvedValue({
      profiles: [],
      grades: {},
      error: null
    })
    syncMocks.mergeProfiles.mockReset().mockImplementation((local) => local)
    syncMocks.mergeGrades.mockReset().mockImplementation((local) => local)

    profilesStore.load.mockReset()
    gradesStore.load.mockReset()

    analyticsMocks.trackSyncCompleted.mockReset()
    analyticsMocks.trackSyncFailed.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function loadUseSync() {
    const mod = await import('../../src/composables/useSync.js')
    return mod.useSync()
  }

  it('initializes anonymous auth when no user is logged in', async () => {
    authState.userId = null
    const { sync } = await loadUseSync()
    const { initAnonymousAuth } = await import('../../src/services/supabase/auth.js')

    await sync({ profiles: [], grades: {} })

    expect(initAnonymousAuth).toHaveBeenCalled()
    expect(syncMocks.pushState).toHaveBeenCalled()
  })

  it('sets isApplying while loading merged state', async () => {
    const { sync, isApplying } = await loadUseSync()

    let applyingDuringLoad = false
    profilesStore.load.mockImplementation(() => {
      applyingDuringLoad = isApplying.value
    })
    gradesStore.load.mockImplementation(() => {
      applyingDuringLoad = applyingDuringLoad || isApplying.value
    })

    await sync({ profiles: [], grades: {} })

    expect(applyingDuringLoad).toBe(true)
    expect(isApplying.value).toBe(false)
  })

  it('does not re-trigger sync when store loads are caused by applying remote data', async () => {
    const { sync, isApplying } = await loadUseSync()

    let pushCount = 0
    syncMocks.pushState.mockImplementation(() => {
      pushCount += 1
      return Promise.resolve({ error: null })
    })

    await sync({ profiles: [], grades: {} })

    expect(pushCount).toBe(1)
    expect(isApplying.value).toBe(false)
  })

  it('reports sync failure and keeps isApplying false', async () => {
    syncMocks.pushState.mockResolvedValue({ error: new Error('Network down') })

    const { sync, status, isApplying } = await loadUseSync()

    const result = await sync({ profiles: [], grades: {} })

    expect(result.error).toBeInstanceOf(Error)
    expect(status.value).toBe('error')
    expect(isApplying.value).toBe(false)
    expect(analyticsMocks.trackSyncFailed).toHaveBeenCalled()
  })
})
