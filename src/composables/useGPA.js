import { computed } from 'vue'
import { sortClasses } from '../utils/semesterSort'

// XZHMU official table (学籍管理规定第十二条): scores below 60 convert to
// grade point 0 — never negative; at or above 60, (score - 50) / 10.
function gradePoint(score) {
  return score < 60 ? 0 : (score - 50) / 10
}

export function calculateGPA(courses, grades) {
  let weightedGradePoints = 0
  let totalCredit = 0
  for (const course of courses) {
    const score = grades[course.name]
    if (score == null || isNaN(score)) continue
    weightedGradePoints += gradePoint(score) * course.credit
    totalCredit += course.credit
  }
  if (totalCredit <= 0) return 0
  return weightedGradePoints / totalCredit
}

export function useGPA(profile, grades) {
  const sortedClasses = computed(() => sortClasses(profile.value.classes))

  const allCourses = computed(() => {
    const list = []
    for (const semester of Object.keys(sortedClasses.value)) {
      for (const course of sortedClasses.value[semester]) {
        list.push({ ...course, semester })
      }
    }
    return list
  })

  const enteredCourses = computed(() =>
    allCourses.value.filter(c => grades.value[c.name] != null && !isNaN(grades.value[c.name]))
  )

  const currentGPA = computed(() => calculateGPA(allCourses.value, grades.value))

  const totalCredits = computed(() =>
    allCourses.value.reduce((sum, c) => sum + c.credit, 0)
  )

  const enteredCredits = computed(() =>
    enteredCourses.value.reduce((sum, c) => sum + c.credit, 0)
  )

  const semesterGPAs = computed(() => {
    const result = {}
    for (const semester of Object.keys(sortedClasses.value)) {
      result[semester] = calculateGPA(sortedClasses.value[semester], grades.value)
    }
    return result
  })

  // Degree courses with a failing grade (< 60): they contribute grade point 0
  // (see calculateGPA) and block the degree, so they are surfaced for warning.
  const failingCourses = computed(() =>
    enteredCourses.value
      .filter(c => grades.value[c.name] < 60)
      .map(c => ({ name: c.name, credit: c.credit, score: grades.value[c.name] }))
  )

  // Suspiciously low scores (< 10) are likely typos. They are still calculated
  // per the official table (grade point 0); this list only feeds the UI hint.
  const suspiciousGrades = computed(() =>
    enteredCourses.value.filter(c => grades.value[c.name] < 10).map(c => c.name)
  )

  const remainingCredits = computed(() =>
    allCourses.value
      .filter(c => grades.value[c.name] == null || isNaN(grades.value[c.name]))
      .reduce((sum, c) => sum + c.credit, 0)
  )

  const requiredAverageForTarget = computed(() => {
    const target = profile.value.targetGPA
    const currentTotalPoint = currentGPA.value * enteredCredits.value
    const needed = target * totalCredits.value - currentTotalPoint
    if (remainingCredits.value <= 0) return null
    if (needed <= 0) return 0
    const average = (needed / remainingCredits.value) * 10 + 50
    if (average > 100) return null
    // Grade points only accrue at scores >= 60; below that every course
    // contributes 0, so the minimum useful average is 60.
    return Math.max(60, average)
  })

  function predictedGPA(averageScore) {
    if (typeof averageScore !== 'number' || averageScore < 0 || averageScore > 100) {
      return currentGPA.value
    }
    const remaining = allCourses.value.filter(c => grades.value[c.name] == null || isNaN(grades.value[c.name]))
    const extraPoint = remaining.reduce((sum, c) => sum + gradePoint(averageScore) * c.credit, 0)
    const extraCredit = remaining.reduce((sum, c) => sum + c.credit, 0)
    const totalCredit = enteredCredits.value + extraCredit
    if (totalCredit <= 0) return 0
    return (currentGPA.value * enteredCredits.value + extraPoint) / totalCredit
  }

  return {
    allCourses,
    enteredCourses,
    currentGPA,
    totalCredits,
    enteredCredits,
    semesterGPAs,
    failingCourses,
    suspiciousGrades,
    remainingCredits,
    requiredAverageForTarget,
    predictedGPA
  }
}
