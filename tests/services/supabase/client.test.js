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

  it('throws when VITE_SUPABASE_URL is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'public-key')
    vi.stubEnv('VITE_SUPABASE_URL', '')

    await expect(import('../../../src/services/supabase/client.js')).rejects.toThrow(
      'Missing environment variable: VITE_SUPABASE_URL'
    )
  })

  it('throws when VITE_SUPABASE_PUBLISHABLE_KEY is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '')

    await expect(import('../../../src/services/supabase/client.js')).rejects.toThrow(
      'Missing environment variable: VITE_SUPABASE_PUBLISHABLE_KEY'
    )
  })
})
