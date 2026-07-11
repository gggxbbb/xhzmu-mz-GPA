import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { track, flush, clearQueue } from '../../../src/services/supabase/analytics.js'
import { supabase } from '../../../src/services/supabase/client.js'

const mocks = {
  insert: vi.fn(() => Promise.resolve({ error: null }))
}

const authState = {
  currentUserId: null
}

vi.mock('../../../src/services/supabase/client.js', () => ({
  supabase: {
    from: vi.fn(() => ({ insert: mocks.insert }))
  }
}))

vi.mock('../../../src/services/supabase/auth.js', () => ({
  getCurrentUserId: vi.fn(() => authState.currentUserId)
}))

function setUserId(id) {
  authState.currentUserId = id
}

describe('analytics service', () => {
  beforeEach(() => {
    clearQueue()
    setUserId('user-1')
    mocks.insert.mockClear()
    mocks.insert.mockResolvedValue({ error: null })
    supabase.from.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('queues events and flushes them after the interval', async () => {
    vi.useFakeTimers()

    track('button_click', { target: 'save-profile' })

    expect(mocks.insert).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(5000)

    expect(supabase.from).toHaveBeenCalledWith('events')
    expect(mocks.insert).toHaveBeenCalledWith([
      {
        user_id: 'user-1',
        name: 'button_click',
        properties: { target: 'save-profile' }
      }
    ])
  })

  it('filters out sensitive properties before sending', async () => {
    track('grade_added', {
      courseName: 'Math',
      score: 95,
      profileName: 'Alice',
      courseNames: ['Math', 'Science'],
      scores: [95, 88],
      email: 'alice@example.com',
      phone: '555-1234',
      name: 'Alice Smith',
      password: 'secret',
      token: 'abc123',
      userId: 'user-123',
      id: 'record-1',
      address: '123 Main St',
      note: 'private note',
      notes: ['note 1', 'note 2'],
      source: 'manual'
    })

    await flush()

    expect(mocks.insert).toHaveBeenCalledWith([
      {
        user_id: 'user-1',
        name: 'grade_added',
        properties: { source: 'manual' }
      }
    ])
  })

  it('re-queues events when the user is not authenticated', async () => {
    setUserId(null)

    track('page_view', { page: 'dashboard' })

    await flush()

    expect(mocks.insert).not.toHaveBeenCalled()

    setUserId('user-2')

    await flush()

    expect(mocks.insert).toHaveBeenCalledWith([
      {
        user_id: 'user-2',
        name: 'page_view',
        properties: { page: 'dashboard' }
      }
    ])
  })

  it('flushes immediately when the queue reaches 10 events', async () => {
    for (let i = 0; i < 10; i++) {
      track('interaction', { index: i })
    }

    expect(mocks.insert).toHaveBeenCalledTimes(1)
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          user_id: 'user-1',
          name: 'interaction',
          properties: { index: expect.any(Number) }
        })
      ])
    )
  })

  it('re-queues events when insert returns an error', async () => {
    mocks.insert.mockResolvedValue({ error: new Error('DB down') })

    track('click', { target: 'button' })

    await flush()
    await flush()
    await flush()
    await flush()

    expect(mocks.insert).toHaveBeenCalledTimes(4)

    mocks.insert.mockClear()
    await flush()
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it('re-queues events when insert throws', async () => {
    mocks.insert.mockRejectedValue(new Error('Network error'))

    track('click', { target: 'button' })

    await flush()
    await flush()
    await flush()
    await flush()

    expect(mocks.insert).toHaveBeenCalledTimes(4)

    mocks.insert.mockClear()
    await flush()
    expect(mocks.insert).not.toHaveBeenCalled()
  })
})
