import { describe, it, expect, vi, beforeEach } from 'vitest'

const createClientMock = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock
}))

describe('Supabase client', () => {
  beforeEach(() => {
    vi.resetModules()
    createClientMock.mockClear()
    vi.unstubAllEnvs()
  })

  it('calls createClient with URL, key, and auth options', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'public-key')

    await import('../../../src/services/supabase/client.js')

    expect(createClientMock).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'public-key',
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false
        }
      }
    )
  })

  it('returns null when VITE_SUPABASE_URL is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'public-key')
    vi.stubEnv('VITE_SUPABASE_URL', '')

    const { supabase } = await import('../../../src/services/supabase/client.js')
    expect(supabase).toBeNull()
    expect(createClientMock).not.toHaveBeenCalled()
  })

  it('returns null when VITE_SUPABASE_PUBLISHABLE_KEY is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '')

    const { supabase } = await import('../../../src/services/supabase/client.js')
    expect(supabase).toBeNull()
    expect(createClientMock).not.toHaveBeenCalled()
  })
})
