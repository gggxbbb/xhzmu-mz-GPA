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

  it('installs global window listeners only once', async () => {
    const { installErrorHandlers } = await loadReporter()
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

    installErrorHandlers()
    installErrorHandlers()

    const errorCalls = addEventListenerSpy.mock.calls.filter(([type]) => type === 'error')
    const rejectionCalls = addEventListenerSpy.mock.calls.filter(
      ([type]) => type === 'unhandledrejection'
    )

    expect(errorCalls).toHaveLength(1)
    expect(rejectionCalls).toHaveLength(1)
  })

  it('dispatches window error events to reportError', async () => {
    const { installErrorHandlers } = await loadReporter()
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

    installErrorHandlers()
    const handler = addEventListenerSpy.mock.calls.find(([type]) => type === 'error')[1]
    const error = new Error('window error')

    handler(new ErrorEvent('error', { error, message: error.message }))

    await vi.waitFor(() => expect(mocks.insert).toHaveBeenCalledTimes(1))
    expect(mocks.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        message: 'window error',
        component: 'window'
      })
    ])
  })

  it('dispatches unhandledrejection events to reportError', async () => {
    const { installErrorHandlers } = await loadReporter()
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

    installErrorHandlers()
    const handler = addEventListenerSpy.mock.calls.find(
      ([type]) => type === 'unhandledrejection'
    )[1]
    const error = new Error('unhandled rejection')

    handler({ reason: error })

    await vi.waitFor(() => expect(mocks.insert).toHaveBeenCalledTimes(1))
    expect(mocks.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        message: 'unhandled rejection',
        component: 'unhandledrejection'
      })
    ])
  })

  it('does not crash or loop when reportError rejects from a window handler', async () => {
    const { installErrorHandlers } = await loadReporter()
    mocks.getCurrentUserId.mockImplementation(() => {
      throw new Error('auth failure')
    })
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

    installErrorHandlers()
    const handler = addEventListenerSpy.mock.calls.find(([type]) => type === 'error')[1]

    expect(() =>
      handler(new ErrorEvent('error', { error: new Error('window error') }))
    ).not.toThrow()

    await vi.waitFor(() => expect(mocks.getCurrentUserId).toHaveBeenCalled())
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it('does not crash or loop when the Vue error handler rejects', async () => {
    const { installErrorHandlers } = await loadReporter()
    mocks.getCurrentUserId.mockImplementation(() => {
      throw new Error('auth failure')
    })
    const app = { config: {} }

    installErrorHandlers(app)

    expect(() => app.config.errorHandler(new Error('vue error'), null, 'info')).not.toThrow()

    await vi.waitFor(() => expect(mocks.getCurrentUserId).toHaveBeenCalled())
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it('prunes stale entries after the rate-limit window passes', async () => {
    vi.useFakeTimers()
    const { reportError } = await loadReporter()

    await reportError(new Error('stale'), 'Widget')
    expect(mocks.insert).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(60_000)

    await reportError(new Error('stale'), 'Widget')
    expect(mocks.insert).toHaveBeenCalledTimes(2)
  })

  it('logs to console.error when Supabase insert returns an error without throwing', async () => {
    const { reportError } = await loadReporter()
    const insertError = new Error('Supabase insert failed')
    mocks.insert.mockResolvedValue({ error: insertError })

    await expect(reportError(new Error('Boom'), 'Comp')).resolves.toBeUndefined()

    expect(console.error).toHaveBeenCalledWith(
      'Failed to report error to Supabase:',
      insertError
    )
  })

  it('masks PII in message, stack, and url before reporting', async () => {
    const { reportError } = await loadReporter()
    const error = new Error('Contact user@example.com or 13800138000 about score 85')
    error.stack = 'Error: Contact user@example.com\n    at foo:1:1'

    vi.stubGlobal('window', {
      ...window,
      location: { href: 'http://app.test/?email=user@example.com&score=92' }
    })

    await reportError(error, 'PIIComponent')

    expect(mocks.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        message: 'Contact [email] or [phone] about score [score]',
        stack: 'Error: Contact [email]\n    at foo:1:1',
        url: 'http://app.test/?email=[email]&score=[score]'
      })
    ])

    vi.unstubAllGlobals()
  })
})
