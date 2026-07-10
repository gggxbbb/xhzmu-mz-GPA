import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { migrateLegacyData, hasLegacyData, clearLegacyData } from '../src/utils/migration'

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

  it('clears legacy keys', () => {
    localStorage.setItem('classes', 'x')
    clearLegacyData()
    expect(localStorage.getItem('classes')).toBeNull()
  })
})
