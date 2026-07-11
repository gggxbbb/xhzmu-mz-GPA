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

  it('pushState upserts profiles and grades with updated_at', async () => {
    mocks.getCurrentUserId.mockReturnValue('user-1')

    const { pushState } = await loadSync()

    const now = 1_700_000_000_000
    const profiles = [
      { id: 'p1', name: 'Test', targetGPA: 3.5, classes: { math: 4 }, updatedAt: now }
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
          classes: { math: 4 },
          updated_at: new Date(now).toISOString()
        }
      ],
      { onConflict: 'user_id,local_id' }
    )
    expect(mocks.grades.upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          user_id: 'user-1',
          profile_local_id: 'p1',
          course_name: 'math',
          score: 85,
          updated_at: expect.any(String)
        })
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
      'local_id, name, target_gpa, classes, updated_at'
    )
    expect(mocks.profiles.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(mocks.grades.select).toHaveBeenCalledWith(
      'profile_local_id, course_name, score, updated_at'
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
        {
          local_id: 'p1',
          name: 'Alice',
          target_gpa: 4.0,
          classes: { math: 4 },
          updated_at: '2023-11-14T00:00:00.000Z'
        },
        {
          local_id: 'p2',
          name: 'Bob',
          target_gpa: 3.2,
          classes: {},
          updated_at: '2023-11-15T00:00:00.000Z'
        }
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
      {
        id: 'p1',
        name: 'Alice',
        targetGPA: 4.0,
        classes: { math: 4 },
        updatedAt: new Date('2023-11-14T00:00:00.000Z').getTime()
      },
      {
        id: 'p2',
        name: 'Bob',
        targetGPA: 3.2,
        classes: {},
        updatedAt: new Date('2023-11-15T00:00:00.000Z').getTime()
      }
    ])
    expect(result.grades).toEqual({
      p1: {
        math: { score: 90, updatedAt: 0 },
        english: { score: 88, updatedAt: 0 }
      }
    })
  })

  it('pushState returns the first upsert error', async () => {
    mocks.getCurrentUserId.mockReturnValue('user-1')

    const profilesError = new Error('profiles upsert failed')
    mocks.profiles.upsert.mockResolvedValue({ error: profilesError })

    const { pushState } = await loadSync()

    const result = await pushState({
      profiles: [{ id: 'p1', name: 'Test', targetGPA: 3.5, classes: {}, updatedAt: Date.now() }],
      grades: { p1: { math: 80 } }
    })

    expect(result.error).toBe(profilesError)
    expect(mocks.grades.upsert).not.toHaveBeenCalled()
  })

  it('mergeProfiles keeps local profile when it is newer', async () => {
    const { mergeProfiles } = await loadSync()

    const local = [{ id: 'p1', name: 'Local', updatedAt: 2000 }]
    const remote = [{ id: 'p1', name: 'Remote', updatedAt: 1000 }]

    expect(mergeProfiles(local, remote)).toEqual(local)
  })

  it('mergeProfiles overwrites local profile when remote is newer', async () => {
    const { mergeProfiles } = await loadSync()

    const local = [{ id: 'p1', name: 'Local', updatedAt: 1000 }]
    const remote = [{ id: 'p1', name: 'Remote', updatedAt: 2000 }]

    expect(mergeProfiles(local, remote)).toEqual(remote)
  })

  it('mergeProfiles adds remote-only profiles and keeps local-only profiles', async () => {
    const { mergeProfiles } = await loadSync()

    const local = [{ id: 'p1', name: 'Local', updatedAt: 1000 }]
    const remote = [{ id: 'p2', name: 'Remote', updatedAt: 1000 }]

    const merged = mergeProfiles(local, remote)

    expect(merged).toHaveLength(2)
    expect(merged.find((p) => p.id === 'p1')).toEqual(local[0])
    expect(merged.find((p) => p.id === 'p2')).toEqual(remote[0])
  })

  it('mergeGrades uses remote grades when remote profile is newer', async () => {
    const { mergeProfiles, mergeGrades } = await loadSync()

    const localProfiles = [{ id: 'p1', updatedAt: 1000 }]
    const remoteProfiles = [{ id: 'p1', updatedAt: 2000 }]
    const mergedProfiles = mergeProfiles(localProfiles, remoteProfiles)

    const localGrades = { p1: { math: { score: 80, updatedAt: 1000 } } }
    const remoteGrades = { p1: { math: { score: 95, updatedAt: 2000 } } }

    expect(
      mergeGrades(localGrades, remoteGrades, mergedProfiles, localProfiles, remoteProfiles)
    ).toEqual({ p1: { math: { score: 95, updatedAt: 2000 } } })
  })

  it('mergeGrades keeps local grades when local profile is newer', async () => {
    const { mergeProfiles, mergeGrades } = await loadSync()

    const localProfiles = [{ id: 'p1', updatedAt: 2000 }]
    const remoteProfiles = [{ id: 'p1', updatedAt: 1000 }]
    const mergedProfiles = mergeProfiles(localProfiles, remoteProfiles)

    const localGrades = { p1: { math: { score: 80, updatedAt: 1000 } } }
    const remoteGrades = { p1: { math: { score: 95, updatedAt: 2000 } } }

    expect(
      mergeGrades(localGrades, remoteGrades, mergedProfiles, localProfiles, remoteProfiles)
    ).toEqual({ p1: { math: { score: 80, updatedAt: 1000 } } })
  })

  it('mergeGrades prefers remote grades when timestamps are equal', async () => {
    const { mergeProfiles, mergeGrades } = await loadSync()

    const localProfiles = [{ id: 'p1', updatedAt: 2000 }]
    const remoteProfiles = [{ id: 'p1', updatedAt: 2000 }]
    const mergedProfiles = mergeProfiles(localProfiles, remoteProfiles)

    const localGrades = { p1: { math: { score: 80, updatedAt: 1000 } } }
    const remoteGrades = { p1: { math: { score: 95, updatedAt: 2000 } } }

    expect(
      mergeGrades(localGrades, remoteGrades, mergedProfiles, localProfiles, remoteProfiles)
    ).toEqual({ p1: { math: { score: 95, updatedAt: 2000 } } })
  })

  it('mergeGrades merges per-course when profile timestamps are equal', async () => {
    const { mergeProfiles, mergeGrades } = await loadSync()

    const localProfiles = [{ id: 'p1', updatedAt: 2000 }]
    const remoteProfiles = [{ id: 'p1', updatedAt: 2000 }]
    const mergedProfiles = mergeProfiles(localProfiles, remoteProfiles)

    const localGrades = {
      p1: {
        math: { score: 80, updatedAt: 3000 },
        english: { score: 70, updatedAt: 1000 }
      }
    }
    const remoteGrades = {
      p1: {
        math: { score: 95, updatedAt: 2000 },
        english: { score: 75, updatedAt: 3000 }
      }
    }

    expect(
      mergeGrades(localGrades, remoteGrades, mergedProfiles, localProfiles, remoteProfiles)
    ).toEqual({
      p1: {
        math: { score: 80, updatedAt: 3000 },
        english: { score: 75, updatedAt: 3000 }
      }
    })
  })

  it('mergeGrades clears local grades when remote profile is newer and has no grades', async () => {
    const { mergeProfiles, mergeGrades } = await loadSync()

    const localProfiles = [{ id: 'p1', updatedAt: 1000 }]
    const remoteProfiles = [{ id: 'p1', updatedAt: 2000 }]
    const mergedProfiles = mergeProfiles(localProfiles, remoteProfiles)

    const localGrades = { p1: { math: { score: 80, updatedAt: 1000 } } }
    const remoteGrades = {}

    expect(
      mergeGrades(localGrades, remoteGrades, mergedProfiles, localProfiles, remoteProfiles)
    ).toEqual({ p1: {} })
  })
})
