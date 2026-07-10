import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAppStore = defineStore('app', () => {
  const showVeryLongGPA = ref(false)
  const theme = ref('auto')
  const currentProfileId = ref('default')

  const isDark = computed(() => {
    if (theme.value === 'dark') return true
    if (theme.value === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  function setShowVeryLongGPA(value) {
    showVeryLongGPA.value = value
  }

  function setTheme(value) {
    theme.value = value
  }

  function setCurrentProfileId(id) {
    currentProfileId.value = id
  }

  function load(state) {
    if (state.showVeryLongGPA != null) showVeryLongGPA.value = state.showVeryLongGPA
    if (state.theme) theme.value = state.theme
    if (state.currentProfileId) currentProfileId.value = state.currentProfileId
  }

  function dump() {
    return {
      showVeryLongGPA: showVeryLongGPA.value,
      theme: theme.value,
      currentProfileId: currentProfileId.value
    }
  }

  return {
    showVeryLongGPA,
    theme,
    currentProfileId,
    isDark,
    setShowVeryLongGPA,
    setTheme,
    setCurrentProfileId,
    load,
    dump
  }
})
