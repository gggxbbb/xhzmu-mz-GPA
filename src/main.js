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
import { useSync } from './composables/useSync.js'
import { isSupabaseConfigured } from './services/supabase/config.js'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)

const { status, lastError } = useSync()

function initializeState({ flushAnalytics } = {}) {
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
  const current = profilesStore.profiles.find((p) => p.id === currentId)
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
    flushAnalytics?.().catch((err) =>
      console.error('Failed to flush analytics on unload:', err)
    )
  })
}

async function initializeSupabase() {
  status.value = 'syncing'
  lastError.value = null

  try {
    const [{ initAnonymousAuth }, { pushState, pullState }] = await Promise.all([
      import('./services/supabase/auth.js'),
      import('./services/supabase/sync.js')
    ])

    const { user, error: authError } = await initAnonymousAuth()
    if (authError || !user) {
      throw authError || new Error('Supabase anonymous auth failed')
    }

    const profilesStore = useProfilesStore()
    const gradesStore = useGradesStore()

    const pullResult = await pullState()
    if (pullResult?.error) {
      throw pullResult.error
    }

    // Pull first on initial sync so a fresh device loads an existing remote
    // backup before pushing its local state, preserving remote data.
    if (pullResult.profiles && pullResult.profiles.length > 0) {
      profilesStore.load(pullResult.profiles)
      gradesStore.load(pullResult.grades || {})
    }

    const pushResult = await pushState({
      profiles: profilesStore.profiles,
      grades: gradesStore.gradesByProfile
    })
    if (pushResult?.error) {
      throw pushResult.error
    }

    status.value = 'idle'
    console.log('[Supabase] Initialized and synced remote state:', pullResult)
  } catch (err) {
    status.value = 'error'
    lastError.value = err
    console.error('Failed to initialize Supabase:', err)
  }
}

async function bootstrap() {
  if (isSupabaseConfigured()) {
    const [{ installErrorHandlers }, { useAnalytics }, { flush }] =
      await Promise.all([
        import('./services/supabase/errorReporter.js'),
        import('./composables/useAnalytics.js'),
        import('./services/supabase/analytics.js')
      ])

    installErrorHandlers(app)

    const { trackPageView } = useAnalytics()
    router.afterEach((to) => trackPageView(to.path, to.name))

    initializeState({ flushAnalytics: flush })
    app.mount('#app')
    await initializeSupabase()
  } else {
    console.warn(
      'Supabase environment variables are missing; running without cloud sync.'
    )
    initializeState()
    app.mount('#app')
  }
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err)
})
