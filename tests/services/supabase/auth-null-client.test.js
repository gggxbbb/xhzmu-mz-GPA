import { describe, it, expect, vi } from 'vitest'

vi.mock('../../../src/services/supabase/client.js', () => ({
  supabase: null
}))

describe('Anonymous authentication service with uninitialized client', () => {
  it('returns an error without throwing when supabase client is null', async () => {
    const { initAnonymousAuth, getCurrentUserId, isAuthenticated } = await import(
      '../../../src/services/supabase/auth.js'
    )

    await expect(initAnonymousAuth()).resolves.toEqual({
      user: null,
      error: expect.objectContaining({
        message: 'Supabase client is not initialized'
      })
    })
    expect(getCurrentUserId()).toBeNull()
    expect(isAuthenticated()).toBe(false)
  })
})
