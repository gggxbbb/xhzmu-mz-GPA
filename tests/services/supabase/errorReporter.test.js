import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  insert: vi.fn(() => Promise.resolve({ error: null })),
  getCurrentUserId: vi.fn(() => 'user-123')
}))

vi.mock('../../../src/services/supabase/client.js', () => ({
  supabase: {
    from: vi.fn(() => ({ insert: mocks.insert }))
  }
}))

vi.mock('../../../src/services/supabase/auth.js', () => ({
  getCurrentUserId: mocks.getCurrentUserId
}))

async function loadReporter() {
  return import('../../../src/services/supabase/errorReporter.js')
}

describe('Supabase error reporter', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.insert.mockReset()
    mocks.insert.mockResolvedValue({ error: null })
    mocks.getCurrentUserId.mockReturnValue('user-123')
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('inserts error reports into the errors table with safe fields', async () => {
    const { reportError } = await loadReporter()
    const error = new Error('Something broke')
    error.stack = 'Error: Something broke\n    at foo:1:1'

    await reportError(error, 'TestComponent')

    expect(mocks.insert).toHaveBeenCalledTimes(1)
    expect(mocks.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: 'user-123',
        message: 'Something broke',
        stack: 'Error: Something broke\n    at foo:1:1',
        component: 'TestComponent',
        url: expect.any(String)
      })
    ])
  })

  it('does not throw when the insert fails', async () => {
    const { reportError } = await loadReporter()
    mocks.insert.mockRejectedValue(new Error('DB down'))

    await expect(reportError(new Error('Boom'), 'Comp')).resolves.toBeUndefined()
    expect(mocks.insert).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalled()
  })

  it('rate limits repeated errors with the same component and message', async () => {
    vi.useFakeTimers()
    const { reportError } = await loadReporter()
    const error = new Error('Repeated failure')

    await reportError(error, 'Widget')
    await reportError(error, 'Widget')
    await reportError(error, 'Widget')
    await reportError(error, 'Widget')

    expect(mocks.insert).toHaveBeenCalledTimes(3)

    await vi.advanceTimersByTimeAsync(60_000)

    await reportError(error, 'Widget')
    expect(mocks.insert).toHaveBeenCalledTimes(4)
  })

  it('rate limits errors by component regardless of message', async () => {
    vi.useFakeTimers()
    const { reportError } = await loadReporter()

    await reportError(new Error('failure 1'), 'Widget')
    await reportError(new Error('failure 2'), 'Widget')
    await reportError(new Error('failure 3'), 'Widget')
    await reportError(new Error('failure 4'), 'Widget')

    expect(mocks.insert).toHaveBeenCalledTimes(3)
  })

  it('handles non-Error input by converting to a string message', async () => {
    const { reportError } = await loadReporter()

    await reportError('plain string error', 'StringComponent')

    expect(mocks.insert).toHaveBeenCalledTimes(1)
    expect(mocks.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        message: 'plain string error',
        component: 'StringComponent',
        stack: null
      })
    ])
  })

  it('installs a Vue error handler only once', async () => {
    const { installErrorHandlers } = await loadReporter()
    const app = { config: {} }

    installErrorHandlers(app)
    const firstHandler = app.config.errorHandler
    installErrorHandlers(app)
    const secondHandler = app.config.errorHandler

    expect(typeof firstHandler).toBe('function')
    expect(firstHandler).toBe(secondHandler)
  })
})
