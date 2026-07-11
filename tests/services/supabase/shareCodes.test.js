import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => {
  const getCurrentUserId = vi.fn()
  const insert = vi.fn()
  const rpc = vi.fn()

  const from = vi.fn(() => ({ insert }))

  let randomCallCount = 0
  const getRandomValues = vi.fn((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = randomCallCount * 100 + i
    }
    randomCallCount++
    return array
  })

  const resetRandomCallCount = () => {
    randomCallCount = 0
  }

  Object.defineProperty(globalThis, 'crypto', {
    value: { getRandomValues },
    writable: true,
    configurable: true
  })

  return {
    getCurrentUserId,
    from,
    insert,
    rpc,
    getRandomValues,
    resetRandomCallCount
  }
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
    mocks.getRandomValues.mockClear()
    mocks.resetRandomCallCount()
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

  it('createShareCode uses crypto.getRandomValues for secure random generation', async () => {
    const { createShareCode } = await loadShareCodes()

    await createShareCode({ profileId: 'p1' })

    expect(mocks.getRandomValues).toHaveBeenCalledTimes(1)
    expect(mocks.getRandomValues).toHaveBeenCalledWith(expect.any(Uint32Array))
    const array = mocks.getRandomValues.mock.calls[0][0]
    expect(array).toHaveLength(6)
  })

  it('createShareCode retries on duplicate key collision and succeeds', async () => {
    mocks.insert
      .mockResolvedValueOnce({
        error: {
          code: '23505',
          message: 'duplicate key value violates unique constraint'
        }
      })
      .mockResolvedValueOnce({ error: null })

    const { createShareCode } = await loadShareCodes()

    const code = await createShareCode({ profileId: 'p1' })

    expect(code).toHaveLength(6)
    expect(mocks.insert).toHaveBeenCalledTimes(2)
    expect(mocks.getRandomValues).toHaveBeenCalledTimes(2)
  })

  it('createShareCode throws after max retries on repeated collisions', async () => {
    mocks.insert.mockResolvedValue({
      error: {
        code: '23505',
        message: 'duplicate key value violates unique constraint'
      }
    })

    const { createShareCode } = await loadShareCodes()

    await expect(createShareCode({ profileId: 'p1' })).rejects.toThrow(
      /Failed to create share code, please try again/i
    )
    expect(mocks.insert).toHaveBeenCalledTimes(5)
  })

  it('createShareCode throws when the user is not authenticated', async () => {
    mocks.getCurrentUserId.mockReturnValue(null)

    const { createShareCode } = await loadShareCodes()

    await expect(createShareCode({})).rejects.toThrow(/not authenticated/i)
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it('createShareCode throws when the payload is not a non-null object', async () => {
    const { createShareCode } = await loadShareCodes()

    await expect(createShareCode(null)).rejects.toThrow(/Invalid payload/i)
    await expect(createShareCode('string')).rejects.toThrow(/Invalid payload/i)
    await expect(createShareCode([])).rejects.toThrow(/Invalid payload/i)
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it('createShareCode defaults invalid ttlDays to 7', async () => {
    const { createShareCode } = await loadShareCodes()

    await createShareCode({ profileId: 'p1' }, -1)

    const inserted = mocks.insert.mock.calls[0][0][0]
    const expiresAt = new Date(inserted.expires_at)
    const now = new Date()
    const diffDays = (expiresAt - now) / (1000 * 60 * 60 * 24)
    expect(diffDays).toBeCloseTo(7, 0)
  })

  it('createShareCode throws a sanitized error when the insert fails', async () => {
    mocks.insert.mockResolvedValue({ error: { message: 'insert failed' } })

    const { createShareCode } = await loadShareCodes()

    await expect(createShareCode({})).rejects.toThrow(
      /Failed to create share code, please try again/i
    )
    await expect(createShareCode({})).rejects.not.toThrow(/insert failed/i)
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

  it('getShareCodePayload throws a sanitized error when the RPC fails', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'rpc error' } })

    const { getShareCodePayload } = await loadShareCodes()

    await expect(getShareCodePayload('BAD')).rejects.toThrow(
      /Failed to retrieve share code, please try again/i
    )
    await expect(getShareCodePayload('BAD')).rejects.not.toThrow(/rpc error/i)
  })
})
