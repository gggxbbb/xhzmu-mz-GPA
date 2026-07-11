import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useGradesStore = defineStore('grades', () => {
  const gradesByProfile = ref({})

  function getGrades(profileId) {
    return gradesByProfile.value[profileId] || {}
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
        gradesByProfile.value[profileId][courseName] = num
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
    gradesByProfile.value = (data && typeof data === 'object' && !Array.isArray(data)) ? data : {}
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
