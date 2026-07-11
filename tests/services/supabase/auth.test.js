import { describe, it, expect, vi, beforeEach } from 'vitest'

const { getSessionMock, signInAnonymouslyMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  signInAnonymouslyMock: vi.fn()
}))

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

    const result = await initAnonymousAuth()

    expect(signInAnonymouslyMock).not.toHaveBeenCalled()
    expect(result).toEqual({ user: existingUser, error: null })
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

    const result = await initAnonymousAuth()

    expect(signInAnonymouslyMock).toHaveBeenCalled()
    expect(result).toEqual({ user: anonymousUser, error: null })
    expect(getCurrentUserId()).toBe('anonymous-user-id')
    expect(isAuthenticated()).toBe(true)
  })

  it('falls back to anonymous sign-in when getSession returns an error', async () => {
    const anonymousUser = { id: 'anonymous-user-id' }
    const sessionError = new Error('session error')
    getSessionMock.mockResolvedValue({
      data: { session: null },
      error: sessionError
    })
    signInAnonymouslyMock.mockResolvedValue({
      data: { user: anonymousUser },
      error: null
    })

    const { initAnonymousAuth, getCurrentUserId, isAuthenticated } = await import(
      '../../../src/services/supabase/auth.js'
    )

    const result = await initAnonymousAuth()

    expect(signInAnonymouslyMock).toHaveBeenCalled()
    expect(result).toEqual({ user: anonymousUser, error: null })
    expect(getCurrentUserId()).toBe('anonymous-user-id')
    expect(isAuthenticated()).toBe(true)
  })

  it('returns user null and error when anonymous sign-in fails', async () => {
    const signInError = new Error('anonymous sign-in failed')
    getSessionMock.mockResolvedValue({
      data: { session: null },
      error: null
    })
    signInAnonymouslyMock.mockResolvedValue({
      data: { user: null },
      error: signInError
    })

    const { initAnonymousAuth, getCurrentUserId, isAuthenticated } = await import(
      '../../../src/services/supabase/auth.js'
    )

    const result = await initAnonymousAuth()

    expect(signInAnonymouslyMock).toHaveBeenCalled()
    expect(result).toEqual({ user: null, error: signInError })
    expect(getCurrentUserId()).toBeNull()
    expect(isAuthenticated()).toBe(false)
  })

  it('shares the same in-flight promise for concurrent calls', async () => {
    const anonymousUser = { id: 'anonymous-user-id' }
    getSessionMock.mockResolvedValue({
      data: { session: null },
      error: null
    })
    signInAnonymouslyMock.mockResolvedValue({
      data: { user: anonymousUser },
      error: null
    })

    const { initAnonymousAuth, getCurrentUserId } = await import(
      '../../../src/services/supabase/auth.js'
    )

    const [first, second] = await Promise.all([initAnonymousAuth(), initAnonymousAuth()])

    expect(first).toBe(second)
    expect(signInAnonymouslyMock).toHaveBeenCalledTimes(1)
    expect(getCurrentUserId()).toBe('anonymous-user-id')
  })

  it('returns null for getCurrentUserId before initialization', async () => {
    const { getCurrentUserId, isAuthenticated } = await import(
      '../../../src/services/supabase/auth.js'
    )

    expect(getCurrentUserId()).toBeNull()
    expect(isAuthenticated()).toBe(false)
  })
})
