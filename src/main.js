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
import { useAnalytics } from './composables/useAnalytics.js'
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
    const [
      { initAnonymousAuth },
      { pushState, pullState, mergeProfiles, mergeGrades }
    ] = await Promise.all([
      import('./services/supabase/auth.js'),
      import('./services/supabase/sync.js')
    ])

    const { user, error: authError } = await initAnonymousAuth()
    if (authError || !user) {
      throw authError || new Error('Supabase anonymous auth failed')
    }

    const appStore = useAppStore()
    const profilesStore = useProfilesStore()
    const gradesStore = useGradesStore()
    const { trackSyncCompleted, trackSyncFailed } = useAnalytics()

    // Push local state first, then pull remote state and merge newer records
    // back into the local stores using last-write-wins on updatedAt.
    const pushResult = await pushState({
      profiles: profilesStore.profiles,
      grades: gradesStore.gradesByProfile
    })
    if (pushResult?.error) {
      throw pushResult.error
    }

    const pullResult = await pullState()
    if (pullResult?.error) {
      throw pullResult.error
    }

    const mergedProfiles = mergeProfiles(
      profilesStore.profiles,
      pullResult.profiles
    )
    const mergedGrades = mergeGrades(
      gradesStore.gradesByProfile,
      pullResult.grades,
      mergedProfiles
    )

    profilesStore.load(mergedProfiles)
    gradesStore.load(mergedGrades)

    const currentId = appStore.currentProfileId
    if (!mergedProfiles.some((p) => p.id === currentId)) {
      appStore.setCurrentProfileId(mergedProfiles[0]?.id || 'default')
    }

    status.value = 'idle'
    trackSyncCompleted('push_pull')
    console.log('[Supabase] Initialized and synced remote state:', {
      profiles: mergedProfiles,
      grades: mergedGrades
    })
  } catch (err) {
    status.value = 'error'
    lastError.value = err
    const { trackSyncFailed } = useAnalytics()
    trackSyncFailed(String(err?.message ?? err))
    console.error('Failed to initialize Supabase:', err)
  }
}

async function bootstrap() {
  if (isSupabaseConfigured()) {
    const [{ installErrorHandlers }, { flush }] = await Promise.all([
      import('./services/supabase/errorReporter.js'),
      import('./services/supabase/analytics.js')
    ])

    installErrorHandlers(app)

    const { trackPageView } = useAnalytics()
    router.afterEach((to) => trackPageView(to.path, to.name ?? to.path))

    initializeState({ flushAnalytics: flush })
    app.mount('#app')
    await initializeSupabase()
  } else {
    console.warn(
      'Supabase environment variables are missing; running without cloud sync.'
    )
    status.value = 'offline'
    initializeState()
    app.mount('#app')
  }
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err)
})
