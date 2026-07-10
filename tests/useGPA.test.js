import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useGPA, calculateGPA } from '../src/composables/useGPA'
import { DEFAULT_CLASSES } from '../src/utils/parsers'

describe('calculateGPA', () => {
  it('calculates basic GPA', () => {
    const courses = [{ name: 'A', credit: 5 }, { name: 'B', credit: 5 }]
    const grades = { A: 80, B: 90 }
    expect(calculateGPA(courses, grades)).toBe(3.5)
  })

  it('ignores missing grades', () => {
    const courses = [{ name: 'A', credit: 5 }, { name: 'B', credit: 5 }]
    const grades = { A: 80 }
    expect(calculateGPA(courses, grades)).toBe(3.0)
  })

  it('returns 0 when no grades entered', () => {
    expect(calculateGPA([{ name: 'A', credit: 5 }], {})).toBe(0)
  })
})

describe('useGPA', () => {
  const profile = ref({
    name: 'Test',
    targetGPA: 2.0,
    classes: DEFAULT_CLASSES
  })
  const grades = ref({
    '病理学': 85,
    '医学微生物学与免疫学': 78
  })

  it('computes current GPA and totals', () => {
    const gpa = useGPA(profile, grades)
    expect(gpa.currentGPA.value).toBeGreaterThan(0)
    expect(gpa.totalCredits.value).toBeGreaterThan(0)
    expect(gpa.enteredCredits.value).toBe(11)
    expect(gpa.illegalGrades.value).toEqual([])
  })

  it('flags illegal grades (< 10) in illegalGrades', () => {
    const grades = ref({ '病理学': 5 })
    const gpa = useGPA(profile, grades)
    expect(gpa.illegalGrades.value).toContain('病理学')
  })

  it('returns null from requiredAverageForTarget when all courses are entered', () => {
    const profile = ref({ name: 'Test', targetGPA: 2.0, classes: DEFAULT_CLASSES })
    const grades = ref({})
    const gpa = useGPA(profile, grades)
    for (const c of gpa.allCourses.value) {
      grades.value[c.name] = 80
    }
    expect(gpa.requiredAverageForTarget.value).toBeNull()
  })

  it('returns a positive predicted GPA for a valid average score with remaining courses', () => {
    const profile = ref({ name: 'Test', targetGPA: 2.0, classes: DEFAULT_CLASSES })
    const grades = ref({ '病理学': 85 })
    const gpa = useGPA(profile, grades)
    expect(gpa.predictedGPA(85)).toBeGreaterThan(0)
  })

  it('returns current GPA for invalid predictedGPA input', () => {
    const profile = ref({ name: 'Test', targetGPA: 2.0, classes: DEFAULT_CLASSES })
    const grades = ref({ '病理学': 85 })
    const gpa = useGPA(profile, grades)
    expect(gpa.predictedGPA('invalid')).toBe(gpa.currentGPA.value)
  })
})
