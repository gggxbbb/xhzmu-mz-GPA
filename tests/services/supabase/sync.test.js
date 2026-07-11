import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => {
  const getCurrentUserId = vi.fn()

  const createTable = () => {
    const upsert = vi.fn()
    const select = vi.fn()
    const eq = vi.fn()

    select.mockReturnValue({ eq })

    return { upsert, select, eq }
  }

  const profiles = createTable()
  const grades = createTable()

  const from = vi.fn((table) => {
    if (table === 'profiles') return profiles
    if (table === 'grades') return grades
    throw new Error(`Unexpected table: ${table}`)
  })

  return { getCurrentUserId, from, profiles, grades }
})

vi.mock('../../../src/services/supabase/auth.js', () => ({
  getCurrentUserId: mocks.getCurrentUserId
}))

vi.mock('../../../src/services/supabase/client.js', () => ({
  supabase: { from: mocks.from }
}))

describe('Supabase sync service', () => {
  beforeEach(() => {
    vi.resetModules()

    mocks.getCurrentUserId.mockReset()
    mocks.from.mockClear()

    mocks.profiles.upsert.mockReset().mockResolvedValue({ error: null })
    mocks.profiles.select.mockReset().mockReturnValue({ eq: mocks.profiles.eq })
    mocks.profiles.eq.mockReset().mockResolvedValue({ data: [], error: null })

    mocks.grades.upsert.mockReset().mockResolvedValue({ error: null })
    mocks.grades.select.mockReset().mockReturnValue({ eq: mocks.grades.eq })
    mocks.grades.eq.mockReset().mockResolvedValue({ data: [], error: null })
  })

  async function loadSync() {
    return import('../../../src/services/supabase/sync.js')
  }

  it('pushState upserts profiles and grades', async () => {
    mocks.getCurrentUserId.mockReturnValue('user-1')

    const { pushState } = await loadSync()

    const profiles = [
      { id: 'p1', name: 'Test', targetGPA: 3.5, classes: { math: 4 } }
    ]
    const grades = { p1: { math: 85 } }

    const result = await pushState({ profiles, grades })

    expect(result.error).toBeNull()
    expect(mocks.from).toHaveBeenCalledWith('profiles')
    expect(mocks.from).toHaveBeenCalledWith('grades')
    expect(mocks.profiles.upsert).toHaveBeenCalledWith(
      [
        {
          user_id: 'user-1',
          local_id: 'p1',
          name: 'Test',
          target_gpa: 3.5,
          classes: { math: 4 }
        }
      ],
      { onConflict: 'user_id,local_id' }
    )
    expect(mocks.grades.upsert).toHaveBeenCalledWith(
      [
        {
          user_id: 'user-1',
          profile_local_id: 'p1',
          course_name: 'math',
          score: 85
        }
      ],
      { onConflict: 'user_id,profile_local_id,course_name' }
    )
  })

  it('pullState returns empty state when no data exists', async () => {
    mocks.getCurrentUserId.mockReturnValue('user-1')

    const { pullState } = await loadSync()

    const result = await pullState()

    expect(result.error).toBeNull()
    expect(result.profiles).toEqual([])
    expect(result.grades).toEqual({})
    expect(mocks.profiles.select).toHaveBeenCalledWith(
      'local_id, name, target_gpa, classes'
    )
    expect(mocks.profiles.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(mocks.grades.select).toHaveBeenCalledWith(
      'profile_local_id, course_name, score'
    )
    expect(mocks.grades.eq).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('pushState returns an error when not authenticated', async () => {
    mocks.getCurrentUserId.mockReturnValue(null)

    const { pushState } = await loadSync()

    const result = await pushState({ profiles: [], grades: {} })

    expect(result.error).toBeInstanceOf(Error)
    expect(result.error.message).toMatch(/not authenticated/i)
    expect(mocks.profiles.upsert).not.toHaveBeenCalled()
    expect(mocks.grades.upsert).not.toHaveBeenCalled()
  })

  it('pullState converts DB rows back to the local shape', async () => {
    mocks.getCurrentUserId.mockReturnValue('user-1')
    mocks.profiles.eq.mockResolvedValue({
      data: [
        { local_id: 'p1', name: 'Alice', target_gpa: 4.0, classes: { math: 4 } },
        { local_id: 'p2', name: 'Bob', target_gpa: 3.2, classes: {} }
      ],
      error: null
    })
    mocks.grades.eq.mockResolvedValue({
      data: [
        { profile_local_id: 'p1', course_name: 'math', score: 90 },
        { profile_local_id: 'p1', course_name: 'english', score: 88 }
      ],
      error: null
    })

    const { pullState } = await loadSync()

    const result = await pullState()

    expect(result.error).toBeNull()
    expect(result.profiles).toEqual([
      { id: 'p1', name: 'Alice', targetGPA: 4.0, classes: { math: 4 } },
      { id: 'p2', name: 'Bob', targetGPA: 3.2, classes: {} }
    ])
    expect(result.grades).toEqual({
      p1: { math: 90, english: 88 }
    })
  })

  it('pushState returns the first upsert error', async () => {
    mocks.getCurrentUserId.mockReturnValue('user-1')

    const profilesError = new Error('profiles upsert failed')
    mocks.profiles.upsert.mockResolvedValue({ error: profilesError })

    const { pushState } = await loadSync()

    const result = await pushState({
      profiles: [{ id: 'p1', name: 'Test', targetGPA: 3.5, classes: {} }],
      grades: { p1: { math: 80 } }
    })

    expect(result.error).toBe(profilesError)
    expect(mocks.grades.upsert).not.toHaveBeenCalled()
  })
})
