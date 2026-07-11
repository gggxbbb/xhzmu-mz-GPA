import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { supabase, mockInsert } from '../../../src/services/supabase/client.js'
import { getCurrentUserId, setUserId } from '../../../src/services/supabase/auth.js'
import { track, flush, clearQueue } from '../../../src/services/supabase/analytics.js'

vi.mock('../../../src/services/supabase/client.js', () => {
  const mockInsert = vi.fn(() => Promise.resolve({ error: null }))

  return {
    mockInsert,
    supabase: {
      from: vi.fn(() => ({
        insert: mockInsert
      }))
    }
  }
})

vi.mock('../../../src/services/supabase/auth.js', () => {
  let currentUserId = null

  return {
    getCurrentUserId: vi.fn(() => currentUserId),
    setUserId: (id) => {
      currentUserId = id
    }
  }
})

describe('analytics service', () => {
  beforeEach(() => {
    clearQueue()
    setUserId('user-1')
    mockInsert.mockClear()
    supabase.from.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('queues events and flushes them after the interval', async () => {
    vi.useFakeTimers()

    track('button_click', { target: 'save-profile' })

    expect(mockInsert).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(5000)

    expect(supabase.from).toHaveBeenCalledWith('events')
    expect(mockInsert).toHaveBeenCalledWith([
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
      source: 'manual'
    })

    await flush()

    expect(mockInsert).toHaveBeenCalledWith([
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

    expect(mockInsert).not.toHaveBeenCalled()

    setUserId('user-2')

    await flush()

    expect(mockInsert).toHaveBeenCalledWith([
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

    expect(mockInsert).toHaveBeenCalledTimes(1)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          user_id: 'user-1',
          name: 'interaction',
          properties: { index: expect.any(Number) }
        })
      ])
    )
  })
})
