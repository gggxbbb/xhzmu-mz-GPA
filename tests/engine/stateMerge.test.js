import { describe, it, expect } from 'vitest'
import { mergeProfiles, mergeGrades } from '../../src/engine/stateMerge.js'

describe('stateMerge', () => {
  describe('mergeProfiles', () => {
    it('keeps local profile when it is newer', () => {
      const local = [{ id: 'p1', name: 'Local', updatedAt: 2000 }]
      const remote = [{ id: 'p1', name: 'Remote', updatedAt: 1000 }]

      expect(mergeProfiles(local, remote)).toEqual(local)
    })

    it('overwrites local profile when remote is newer', () => {
      const local = [{ id: 'p1', name: 'Local', updatedAt: 1000 }]
      const remote = [{ id: 'p1', name: 'Remote', updatedAt: 2000 }]

      expect(mergeProfiles(local, remote)).toEqual(remote)
    })

    it('adds remote-only profiles and keeps local-only profiles', () => {
      const local = [{ id: 'p1', name: 'Local', updatedAt: 1000 }]
      const remote = [{ id: 'p2', name: 'Remote', updatedAt: 1000 }]

      const merged = mergeProfiles(local, remote)

      expect(merged).toHaveLength(2)
      expect(merged.find((p) => p.id === 'p1')).toEqual(local[0])
      expect(merged.find((p) => p.id === 'p2')).toEqual(remote[0])
    })

    it('in syncMode does not re-add remote-only profiles', () => {
      const local = [{ id: 'p1', updatedAt: 1000 }]
      const remote = [
        { id: 'p1', updatedAt: 2000 },
        { id: 'p2', updatedAt: 2000 }
      ]

      const merged = mergeProfiles(local, remote, { syncMode: true })

      expect(merged).toHaveLength(1)
      expect(merged[0].id).toBe('p1')
    })
  })

  describe('mergeGrades', () => {
    it('prefers remote grade when its updatedAt is newer', () => {
      const localProfiles = [{ id: 'p1', updatedAt: 2000 }]
      const remoteProfiles = [{ id: 'p1', updatedAt: 1000 }]
      const mergedProfiles = mergeProfiles(localProfiles, remoteProfiles)

      const localGrades = { p1: { math: { score: 80, updatedAt: 1000 } } }
      const remoteGrades = { p1: { math: { score: 95, updatedAt: 2000 } } }

      expect(mergeGrades(localGrades, remoteGrades, mergedProfiles)).toEqual({
        p1: { math: { score: 95, updatedAt: 2000 } }
      })
    })

    it('keeps local grade when its updatedAt is newer', () => {
      const localProfiles = [{ id: 'p1', updatedAt: 1000 }]
      const remoteProfiles = [{ id: 'p1', updatedAt: 2000 }]
      const mergedProfiles = mergeProfiles(localProfiles, remoteProfiles)

      const localGrades = { p1: { math: { score: 80, updatedAt: 2000 } } }
      const remoteGrades = { p1: { math: { score: 95, updatedAt: 1000 } } }

      expect(mergeGrades(localGrades, remoteGrades, mergedProfiles)).toEqual({
        p1: { math: { score: 80, updatedAt: 2000 } }
      })
    })

    it('prefers remote grade when timestamps are equal', () => {
      const localProfiles = [{ id: 'p1', updatedAt: 2000 }]
      const remoteProfiles = [{ id: 'p1', updatedAt: 2000 }]
      const mergedProfiles = mergeProfiles(localProfiles, remoteProfiles)

      const localGrades = { p1: { math: { score: 80, updatedAt: 2000 } } }
      const remoteGrades = { p1: { math: { score: 95, updatedAt: 2000 } } }

      expect(mergeGrades(localGrades, remoteGrades, mergedProfiles)).toEqual({
        p1: { math: { score: 95, updatedAt: 2000 } }
      })
    })

    it('merges per-course independently', () => {
      const localProfiles = [{ id: 'p1', updatedAt: 1000 }]
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

      expect(mergeGrades(localGrades, remoteGrades, mergedProfiles)).toEqual({
        p1: {
          math: { score: 80, updatedAt: 3000 },
          english: { score: 75, updatedAt: 3000 }
        }
      })
    })

    it('keeps local-only grades regardless of profile timestamps', () => {
      const localProfiles = [{ id: 'p1', updatedAt: 1000 }]
      const remoteProfiles = [{ id: 'p1', updatedAt: 2000 }]
      const mergedProfiles = mergeProfiles(localProfiles, remoteProfiles)

      const localGrades = { p1: { math: { score: 80, updatedAt: 1000 } } }
      const remoteGrades = {}

      expect(mergeGrades(localGrades, remoteGrades, mergedProfiles)).toEqual({
        p1: { math: { score: 80, updatedAt: 1000 } }
      })
    })

    it('in syncMode does not re-add remote-only courses', () => {
      const localProfiles = [{ id: 'p1', updatedAt: 1000 }]
      const remoteProfiles = [{ id: 'p1', updatedAt: 2000 }]
      const mergedProfiles = mergeProfiles(localProfiles, remoteProfiles)

      const localGrades = { p1: { math: { score: 80, updatedAt: 1000 } } }
      const remoteGrades = {
        p1: {
          math: { score: 90, updatedAt: 2000 },
          english: { score: 95, updatedAt: 2000 }
        }
      }

      const merged = mergeGrades(localGrades, remoteGrades, mergedProfiles, { syncMode: true })

      expect(merged).toEqual({
        p1: { math: { score: 90, updatedAt: 2000 } }
      })
    })
  })
})
