import { parseClasses, DEFAULT_CLASSES, DEFAULT_PROFILE_NAME, DEFAULT_TARGET_GPA } from './parsers'

const LEGACY_KEYS = ['classes', 'classesName', 'targetGPA', 'grades', 'showVeryLongGPA']

export function hasLegacyData() {
  return LEGACY_KEYS.some(key => localStorage.getItem(key) !== null)
}

export function migrateLegacyData() {
  const classesStr = localStorage.getItem('classes')
  const classesName = localStorage.getItem('classesName')
  const targetGPA = parseFloat(localStorage.getItem('targetGPA'))
  const gradesStr = localStorage.getItem('grades')
  const showVeryLongGPA = localStorage.getItem('showVeryLongGPA')

  const profileId = 'migrated_default'
  const profile = {
    id: profileId,
    name: classesName || DEFAULT_PROFILE_NAME,
    targetGPA: isNaN(targetGPA) ? DEFAULT_TARGET_GPA : targetGPA,
    classes: parseClasses(classesStr) || DEFAULT_CLASSES
  }

  const grades = {}
  try {
    Object.assign(grades, JSON.parse(gradesStr) || {})
  } catch (e) {
    // ignore invalid grades
  }

  const normalizedGrades = {}
  for (const name of Object.keys(grades)) {
    const value = parseFloat(grades[name])
    if (!isNaN(value)) normalizedGrades[name] = value
  }

  const app = {
    showVeryLongGPA: showVeryLongGPA === 'true',
    theme: 'auto',
    currentProfileId: profileId
  }

  return {
    version: 2,
    app,
    profiles: [profile],
    grades: { [profileId]: normalizedGrades }
  }
}

export function clearLegacyData() {
  for (const key of LEGACY_KEYS) {
    localStorage.removeItem(key)
  }
}
