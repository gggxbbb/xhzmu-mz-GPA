import './assets/styles.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { loadAppState, saveAppState } from './utils/storage'
import { migrateLegacyData, hasLegacyData } from './utils/migration'
import { useAppStore } from './stores/app'
import { useProfilesStore } from './stores/profiles'
import { useGradesStore } from './stores/grades'
import { initAnonymousAuth } from './services/supabase/auth.js'
import { pushState, pullState } from './services/supabase/sync.js'
import { flush } from './services/supabase/analytics.js'
import { installErrorHandlers } from './services/supabase/errorReporter.js'
import { useAnalytics } from './composables/useAnalytics.js'

const pinia = createPinia()
const app = createApp(App)

installErrorHandlers(app)

app.use(pinia)
app.use(router)

const { trackPageView } = useAnalytics()
router.afterEach((to) => trackPageView(to.path, to.name))

function initializeState() {
  const appStore = useAppStore()
  const profilesStore = useProfilesStore()
  const gradesStore = useGradesStore()

  let state = loadAppState()

  if (!state && hasLegacyData()) {
    state = migrateLegacyData()
  }

  if (state) {
    appStore.load(state.app)
    profilesStore.load(state.profiles)
    gradesStore.load(state.grades)
  } else {
    profilesStore.resetToDefault()
  }

  const currentId = appStore.currentProfileId
  const current = profilesStore.profiles.find(p => p.id === currentId)
  if (!current) {
    appStore.setCurrentProfileId(profilesStore.profiles[0]?.id || 'default')
  }

  if (!appStore.currentProfileId) {
    appStore.setCurrentProfileId('default')
  }

  const save = () => {
    saveAppState({
      version: 2,
      app: appStore.dump(),
      profiles: profilesStore.dump(),
      grades: gradesStore.dump()
    })
  }

  const unsubApp = appStore.$subscribe(save)
  const unsubProfiles = profilesStore.$subscribe(save)
  const unsubGrades = gradesStore.$subscribe(save)
  save()

  window.addEventListener('beforeunload', () => {
    unsubApp()
    unsubProfiles()
    unsubGrades()
    flush().catch((err) => console.error('Failed to flush analytics on unload:', err))
  })
}

async function initializeSupabase() {
  try {
    const { user, error: authError } = await initAnonymousAuth()
    if (authError || !user) {
      console.error('Supabase anonymous auth failed:', authError)
      return
    }

    const profilesStore = useProfilesStore()
    const gradesStore = useGradesStore()

    const pushResult = await pushState({
      profiles: profilesStore.profiles,
      grades: gradesStore.gradesByProfile
    })
    if (pushResult?.error) {
      console.error('Failed to push state to Supabase:', pushResult.error)
      return
    }

    const pullResult = await pullState()
    if (pullResult?.error) {
      console.error('Failed to pull state from Supabase:', pullResult.error)
      return
    }

    profilesStore.load(pullResult.profiles)
    gradesStore.load(pullResult.grades)
  } catch (err) {
    console.error('Unexpected error initializing Supabase:', err)
  }
}

initializeState()
app.mount('#app')
initializeSupabase()
