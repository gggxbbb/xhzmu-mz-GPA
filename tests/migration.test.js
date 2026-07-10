import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { migrateLegacyData, hasLegacyData, clearLegacyData } from '../src/utils/migration'
import { DEFAULT_CLASSES, DEFAULT_TARGET_GPA } from '../src/utils/parsers'

describe('migration', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => {
    localStorage.clear()
  })

  it('detects legacy data', () => {
    expect(hasLegacyData()).toBe(false)
    localStorage.setItem('classesName', 'Test')
    expect(hasLegacyData()).toBe(true)
  })

  it('detects each individual legacy key', () => {
    const keys = ['classes', 'classesName', 'targetGPA', 'grades', 'showVeryLongGPA']
    for (const key of keys) {
      localStorage.clear()
      expect(hasLegacyData()).toBe(false)
      localStorage.setItem(key, 'x')
      expect(hasLegacyData()).toBe(true)
    }
  })

  it('migrates legacy data to v2 format', () => {
    localStorage.setItem('classesName', 'OldProfile')
    localStorage.setItem('targetGPA', '2.5')
    localStorage.setItem('classes', '大二上\n病理学 5')
    localStorage.setItem('grades', JSON.stringify({ '病理学': 88 }))
    localStorage.setItem('showVeryLongGPA', 'true')

    const data = migrateLegacyData()
    expect(data.version).toBe(2)
    expect(data.profiles[0].name).toBe('OldProfile')
    expect(data.profiles[0].targetGPA).toBe(2.5)
    expect(data.profiles[0].classes['大二上']).toEqual([{ name: '病理学', credit: 5 }])
    expect(data.grades[data.profiles[0].id]['病理学']).toBe(88)
    expect(data.app.showVeryLongGPA).toBe(true)
  })

  it('falls back to DEFAULT_CLASSES when classes is missing', () => {
    const data = migrateLegacyData()
    expect(data.profiles[0].classes).toEqual(DEFAULT_CLASSES)
  })

  it('falls back to DEFAULT_TARGET_GPA when targetGPA is missing or invalid', () => {
    const dataMissing = migrateLegacyData()
    expect(dataMissing.profiles[0].targetGPA).toBe(DEFAULT_TARGET_GPA)

    localStorage.setItem('targetGPA', 'not-a-number')
    const dataInvalid = migrateLegacyData()
    expect(dataInvalid.profiles[0].targetGPA).toBe(DEFAULT_TARGET_GPA)
  })

  it('ignores invalid grades JSON gracefully', () => {
    localStorage.setItem('classesName', 'Profile')
    localStorage.setItem('grades', '{ invalid json }')
    const data = migrateLegacyData()
    expect(data.grades[data.profiles[0].id]).toEqual({})
  })

  it('treats showVeryLongGPA values other than "true" as false', () => {
    localStorage.setItem('classesName', 'Profile')
    localStorage.setItem('showVeryLongGPA', 'false')
    expect(migrateLegacyData().app.showVeryLongGPA).toBe(false)

    localStorage.setItem('showVeryLongGPA', '1')
    expect(migrateLegacyData().app.showVeryLongGPA).toBe(false)

    localStorage.setItem('showVeryLongGPA', '')
    expect(migrateLegacyData().app.showVeryLongGPA).toBe(false)
  })

  it('removes all LEGACY_KEYS with clearLegacyData', () => {
    const keys = ['classes', 'classesName', 'targetGPA', 'grades', 'showVeryLongGPA']
    for (const key of keys) {
      localStorage.setItem(key, 'value')
    }
    clearLegacyData()
    for (const key of keys) {
      expect(localStorage.getItem(key)).toBeNull()
    }
  })
})
