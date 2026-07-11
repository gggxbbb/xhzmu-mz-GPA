import { describe, it, expect } from 'vitest'
import { sortClasses } from '../../src/utils/semesterSort'

describe('sortClasses', () => {
  it('sorts standard semesters in canonical order', () => {
    const input = {
      '大四下': [],
      '大一上': [],
      '大二下': [],
      '大三上': []
    }
    const result = sortClasses(input)
    expect(Object.keys(result)).toEqual(['大一上', '大二下', '大三上', '大四下'])
  })

  it('places non-standard semesters after standard ones', () => {
    const input = {
      '重修': [],
      '大一上': [],
      '实习期': []
    }
    const result = sortClasses(input)
    expect(Object.keys(result)).toEqual(['大一上', '重修', '实习期'])
  })

  it('preserves original insertion order for non-standard semesters', () => {
    const input = {
      '研一下': [],
      '大一上': [],
      '研一上': [],
      '大一下': [],
      '实习期': []
    }
    const result = sortClasses(input)
    expect(Object.keys(result)).toEqual(['大一上', '大一下', '研一下', '研一上', '实习期'])
  })

  it('returns empty object for invalid inputs', () => {
    expect(sortClasses(null)).toEqual({})
    expect(sortClasses(undefined)).toEqual({})
    expect(sortClasses([])).toEqual({})
    expect(sortClasses('string')).toEqual({})
    expect(sortClasses(42)).toEqual({})
  })

  it('returns empty object for empty object input', () => {
    expect(sortClasses({})).toEqual({})
  })

  it('does not mutate the input object', () => {
    const input = {
      '大二下': [],
      '大一上': []
    }
    const snapshot = JSON.stringify(Object.keys(input))
    sortClasses(input)
    expect(JSON.stringify(Object.keys(input))).toBe(snapshot)
  })
})
