import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUIStore = defineStore('ui', () => {
  const expandedSemesters = ref(new Set())
  const searchQuery = ref('')
  const activeWhatIfCourse = ref(null)

  function toggleSemester(semester) {
    if (expandedSemesters.value.has(semester)) {
      expandedSemesters.value.delete(semester)
    } else {
      expandedSemesters.value.add(semester)
    }
  }

  function setSearchQuery(query) {
    searchQuery.value = query
  }

  function setActiveWhatIfCourse(name) {
    activeWhatIfCourse.value = activeWhatIfCourse.value === name ? null : name
  }

  function reset() {
    expandedSemesters.value.clear()
    searchQuery.value = ''
    activeWhatIfCourse.value = null
  }

  return {
    expandedSemesters,
    searchQuery,
    activeWhatIfCourse,
    toggleSemester,
    setSearchQuery,
    setActiveWhatIfCourse,
    reset
  }
})
