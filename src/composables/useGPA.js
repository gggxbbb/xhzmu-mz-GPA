import { computed } from 'vue'

export function calculateGPA(courses, grades) {
  let totalGrade = 0
  let totalCredit = 0
  for (const course of courses) {
    const score = grades[course.name]
    if (score == null || isNaN(score)) continue
    const gradePoint = (score - 50) / 10
    totalGrade += gradePoint * course.credit
    totalCredit += course.credit
  }
  if (totalCredit <= 0) return 0
  return totalGrade / totalCredit
}

export function useGPA(profile, grades) {
  const allCourses = computed(() => {
    const list = []
    for (const semester of Object.keys(profile.value.classes)) {
      for (const course of profile.value.classes[semester]) {
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
    for (const semester of Object.keys(profile.value.classes)) {
      result[semester] = calculateGPA(profile.value.classes[semester], grades.value)
    }
    return result
  })

  const illegalGrades = computed(() =>
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
    return (needed / remainingCredits.value) * 10 + 50
  })

  function predictedGPA(averageScore) {
    const remaining = allCourses.value.filter(c => grades.value[c.name] == null || isNaN(grades.value[c.name]))
    const extraPoint = remaining.reduce((sum, c) => sum + ((averageScore - 50) / 10) * c.credit, 0)
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
    illegalGrades,
    remainingCredits,
    requiredAverageForTarget,
    predictedGPA
  }
}
