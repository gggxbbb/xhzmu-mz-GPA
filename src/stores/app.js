import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

const THEME_COLORS = { light: '#66ccff', dark: '#13171f' }

export const useAppStore = defineStore('app', () => {
  const showVeryLongGPA = ref(false)
  const theme = ref('auto')
  const currentProfileId = ref('default')

  const systemDark = ref(window.matchMedia('(prefers-color-scheme: dark)').matches)
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', (event) => {
      systemDark.value = event.matches
    })

  const isDark = computed(() => {
    if (theme.value === 'dark') return true
    if (theme.value === 'light') return false
    return systemDark.value
  })

  function applyTheme() {
    const value = isDark.value ? 'dark' : 'light'
    document.documentElement.dataset.theme = value
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', THEME_COLORS[value])
  }

  watch(isDark, applyTheme, { immediate: true, flush: 'sync' })

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
    if (!state) return
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
