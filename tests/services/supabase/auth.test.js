import { describe, it, expect, vi, beforeEach } from 'vitest'

const getSessionMock = vi.fn()
const signInAnonymouslyMock = vi.fn()

vi.mock('../../../src/services/supabase/client.js', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      signInAnonymously: signInAnonymouslyMock
    }
  }
}))

describe('Anonymous authentication service', () => {
  beforeEach(() => {
    vi.resetModules()
    getSessionMock.mockReset()
    signInAnonymouslyMock.mockReset()
  })

  it('returns an existing user without signing in anonymously', async () => {
    const existingUser = { id: 'existing-user-id' }
    getSessionMock.mockResolvedValue({
      data: { session: { user: existingUser } },
      error: null
    })

    const { initAnonymousAuth, getCurrentUserId, isAuthenticated } = await import(
      '../../../src/services/supabase/auth.js'
    )

    await initAnonymousAuth()

    expect(signInAnonymouslyMock).not.toHaveBeenCalled()
    expect(getCurrentUserId()).toBe('existing-user-id')
    expect(isAuthenticated()).toBe(true)
  })

  it('signs in anonymously when no session exists', async () => {
    const anonymousUser = { id: 'anonymous-user-id' }
    getSessionMock.mockResolvedValue({
      data: { session: null },
      error: null
    })
    signInAnonymouslyMock.mockResolvedValue({
      data: { user: anonymousUser },
      error: null
    })

    const { initAnonymousAuth, getCurrentUserId, isAuthenticated } = await import(
      '../../../src/services/supabase/auth.js'
    )

    await initAnonymousAuth()

    expect(signInAnonymouslyMock).toHaveBeenCalled()
    expect(getCurrentUserId()).toBe('anonymous-user-id')
    expect(isAuthenticated()).toBe(true)
  })

  it('returns null for getCurrentUserId before initialization', async () => {
    const { getCurrentUserId, isAuthenticated } = await import(
      '../../../src/services/supabase/auth.js'
    )

    expect(getCurrentUserId()).toBeNull()
    expect(isAuthenticated()).toBe(false)
  })
})
