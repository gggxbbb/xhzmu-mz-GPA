import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useGPA, calculateGPA } from '../src/composables/useGPA'
import { DEFAULT_CLASSES } from '../src/utils/parsers'

// Total credits across DEFAULT_CLASSES: 106.5
describe('calculateGPA', () => {
  it('calculates basic GPA', () => {
    const courses = [{ name: 'A', credit: 5 }, { name: 'B', credit: 5 }]
    const grades = { A: 80, B: 90 }
    expect(calculateGPA(courses, grades)).toBe(3.5)
  })

  it('converts a failing score (< 60) to grade point 0, never negative', () => {
    const courses = [{ name: 'A', credit: 5 }]
    expect(calculateGPA(courses, { A: 45 })).toBe(0)
    expect(calculateGPA(courses, { A: 0 })).toBe(0)
  })

  it('converts exactly 60 to grade point 1.0', () => {
    const courses = [{ name: 'A', credit: 5 }]
    expect(calculateGPA(courses, { A: 60 })).toBe(1.0)
  })

  it('weights a failing course at grade point 0 alongside passing courses', () => {
    const courses = [{ name: 'A', credit: 5 }, { name: 'B', credit: 5 }]
    const grades = { A: 45, B: 80 }
    // (0 * 5 + 3.0 * 5) / 10
    expect(calculateGPA(courses, grades)).toBe(1.5)
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
  const makeProfile = (targetGPA = 2.0) => ref({
    name: 'Test',
    targetGPA,
    classes: DEFAULT_CLASSES
  })

  it('computes current GPA and totals', () => {
    const grades = ref({
      '病理学': 85,
      '医学微生物学与免疫学': 78
    })
    const gpa = useGPA(makeProfile(), grades)
    expect(gpa.currentGPA.value).toBeCloseTo((3.5 * 5 + 2.8 * 6) / 11)
    expect(gpa.totalCredits.value).toBeCloseTo(106.5)
    expect(gpa.enteredCredits.value).toBe(11)
    expect(gpa.suspiciousGrades.value).toEqual([])
    expect(gpa.failingCourses.value).toEqual([])
  })

  it('flags suspicious grades (< 10) without affecting currentGPA', () => {
    const typo = useGPA(makeProfile(), ref({ '病理学': 5 }))
    expect(typo.suspiciousGrades.value).toContain('病理学')
    // A <10 score is still calculated per the official table: grade point 0.
    expect(typo.currentGPA.value).toBe(0)
    const failing = useGPA(makeProfile(), ref({ '病理学': 45 }))
    expect(failing.suspiciousGrades.value).toEqual([])
    expect(failing.currentGPA.value).toBe(typo.currentGPA.value)
  })

  it('lists failing courses (< 60) with name, credit and score', () => {
    const grades = ref({
      '病理学': 45,
      '医学微生物学与免疫学': 80
    })
    const gpa = useGPA(makeProfile(), grades)
    expect(gpa.failingCourses.value).toEqual([
      { name: '病理学', credit: 5, score: 45 }
    ])
  })

  it('a single failing course yields currentGPA 0', () => {
    const gpa = useGPA(makeProfile(), ref({ '病理学': 45 }))
    expect(gpa.currentGPA.value).toBe(0)
  })

  it('returns 0 from requiredAverageForTarget when the target is already met', () => {
    const grades = ref({})
    const gpa = useGPA(makeProfile(2.0), grades)
    // Enter the first four semesters at 100: grade point 5.0 each, so the
    // accumulated points (54.5 credits * 5.0 = 272.5) exceed the target's
    // total requirement (2.0 * 106.5 = 213) while credits remain.
    for (const c of gpa.allCourses.value.slice(0, 11)) {
      grades.value[c.name] = 100
    }
    expect(gpa.remainingCredits.value).toBeGreaterThan(0)
    expect(gpa.requiredAverageForTarget.value).toBe(0)
  })

  it('floors requiredAverageForTarget at 60 when the raw average is below 60', () => {
    const grades = ref({ '病理学': 90 })
    const gpa = useGPA(makeProfile(1.0), grades)
    // needed = 1.0 * 106.5 - 4.0 * 5 = 86.5; raw average = (86.5 / 101.5) * 10 + 50 ≈ 58.5
    expect(gpa.requiredAverageForTarget.value).toBe(60)
  })

  it('returns null from requiredAverageForTarget when the target is unreachable (> 100)', () => {
    const grades = ref({ '病理学': 90 })
    const gpa = useGPA(makeProfile(5.0), grades)
    // needed = 5.0 * 106.5 - 20 = 512.5; raw average ≈ 100.49 > 100
    expect(gpa.requiredAverageForTarget.value).toBeNull()
  })

  it('returns null from requiredAverageForTarget when all courses are entered', () => {
    const grades = ref({})
    const gpa = useGPA(makeProfile(), grades)
    for (const c of gpa.allCourses.value) {
      grades.value[c.name] = 80
    }
    expect(gpa.requiredAverageForTarget.value).toBeNull()
  })

  it('returns a positive predicted GPA for a valid average score with remaining courses', () => {
    const grades = ref({ '病理学': 85 })
    const gpa = useGPA(makeProfile(), grades)
    expect(gpa.predictedGPA(85)).toBeGreaterThan(0)
  })

  it('floors the simulated contribution in predictedGPA at grade point 0', () => {
    const grades = ref({ '病理学': 85 })
    const gpa = useGPA(makeProfile(), grades)
    // Averages below 60 contribute grade point 0: 40 and 50 simulate identically.
    const floored = gpa.predictedGPA(50)
    expect(gpa.predictedGPA(40)).toBe(floored)
    // An average in [50, 60) also contributes 0 per the official table.
    expect(gpa.predictedGPA(55)).toBe(floored)
    expect(floored).toBeCloseTo((3.5 * 5) / 106.5)
    // An average of 60 contributes grade point 1.0 per remaining credit.
    expect(gpa.predictedGPA(60)).toBeCloseTo((3.5 * 5 + 1.0 * 101.5) / 106.5)
  })

  it('returns current GPA for invalid predictedGPA input', () => {
    const grades = ref({ '病理学': 85 })
    const gpa = useGPA(makeProfile(), grades)
    expect(gpa.predictedGPA('invalid')).toBe(gpa.currentGPA.value)
  })
})
