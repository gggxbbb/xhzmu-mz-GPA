import { defineStore } from 'pinia'
import { ref } from 'vue'

function normalizeGrade(value) {
  if (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof value.score === 'number'
  ) {
    return { score: value.score, updatedAt: value.updatedAt }
  }
  if (typeof value === 'number') {
    return { score: value, updatedAt: Date.now() }
  }
  return null
}

export const useGradesStore = defineStore('grades', () => {
  const gradesByProfile = ref({})

  function getGrades(profileId) {
    const result = {}
    for (const [courseName, entry] of Object.entries(gradesByProfile.value[profileId] || {})) {
      const normalized = normalizeGrade(entry)
      if (normalized) {
        result[courseName] = normalized.score
      }
    }
    return result
  }

  function setGrade(profileId, courseName, score) {
    if (!gradesByProfile.value[profileId]) {
      gradesByProfile.value[profileId] = {}
    }
    if (score === '' || score == null) {
      delete gradesByProfile.value[profileId][courseName]
    } else {
      const num = parseFloat(score)
      if (!isNaN(num)) {
        gradesByProfile.value[profileId][courseName] = { score: num, updatedAt: Date.now() }
      }
    }
  }

  function clearGrades(profileId) {
    if (profileId) {
      delete gradesByProfile.value[profileId]
    } else {
      gradesByProfile.value = {}
    }
  }

  function load(data) {
    const normalized = {}
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      for (const [profileId, courses] of Object.entries(data)) {
        if (typeof courses !== 'object' || Array.isArray(courses)) {
          continue
        }
        normalized[profileId] = {}
        for (const [courseName, value] of Object.entries(courses)) {
          const normalizedGrade = normalizeGrade(value)
          if (normalizedGrade) {
            normalized[profileId][courseName] = normalizedGrade
          }
        }
      }
    }
    gradesByProfile.value = normalized
  }

  function dump() {
    return gradesByProfile.value
  }

  return {
    gradesByProfile,
    getGrades,
    setGrade,
    clearGrades,
    load,
    dump
  }
})
