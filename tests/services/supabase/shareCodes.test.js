import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => {
  const getCurrentUserId = vi.fn()
  const insert = vi.fn()
  const rpc = vi.fn()

  const from = vi.fn(() => ({ insert }))

  return { getCurrentUserId, from, insert, rpc }
})

vi.mock('../../../src/services/supabase/auth.js', () => ({
  getCurrentUserId: mocks.getCurrentUserId
}))

vi.mock('../../../src/services/supabase/client.js', () => ({
  supabase: {
    from: mocks.from,
    rpc: mocks.rpc
  }
}))

async function loadShareCodes() {
  return import('../../../src/services/supabase/shareCodes.js')
}

describe('Share code service', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.getCurrentUserId.mockReset().mockReturnValue('user-1')
    mocks.from.mockClear()
    mocks.insert.mockReset().mockResolvedValue({ error: null })
    mocks.rpc.mockReset().mockResolvedValue({ data: { profileId: 'p1' }, error: null })
  })

  it('createShareCode inserts and returns a 6-character alphanumeric code', async () => {
    const { createShareCode } = await loadShareCodes()

    const payload = { profileId: 'p1', grades: { math: 90 } }
    const code = await createShareCode(payload, 3)

    expect(code).toHaveLength(6)
    expect(code).toMatch(/^[A-Za-z0-9]{6}$/)
    expect(mocks.from).toHaveBeenCalledWith('share_codes')
    expect(mocks.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        code: expect.stringMatching(/^[A-Za-z0-9]{6}$/),
        user_id: 'user-1',
        payload,
        expires_at: expect.any(String)
      })
    ])
  })

  it('createShareCode throws when the user is not authenticated', async () => {
    mocks.getCurrentUserId.mockReturnValue(null)

    const { createShareCode } = await loadShareCodes()

    await expect(createShareCode({})).rejects.toThrow(/not authenticated/i)
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it('createShareCode throws when the insert fails', async () => {
    mocks.insert.mockResolvedValue({ error: { message: 'insert failed' } })

    const { createShareCode } = await loadShareCodes()

    await expect(createShareCode({})).rejects.toThrow(/insert failed/)
  })

  it('getShareCodePayload calls the RPC with the correct parameters and returns the payload', async () => {
    const { getShareCodePayload } = await loadShareCodes()

    const result = await getShareCodePayload('ABC123')

    expect(mocks.rpc).toHaveBeenCalledWith('get_share_code', { code_input: 'ABC123' })
    expect(result).toEqual({ profileId: 'p1' })
  })

  it('getShareCodePayload throws when the RPC returns null', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null })

    const { getShareCodePayload } = await loadShareCodes()

    await expect(getShareCodePayload('MISSING')).rejects.toThrow(
      /not found or expired/i
    )
  })

  it('getShareCodePayload throws when the RPC fails', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'rpc error' } })

    const { getShareCodePayload } = await loadShareCodes()

    await expect(getShareCodePayload('BAD')).rejects.toThrow(/rpc error/)
  })
})
