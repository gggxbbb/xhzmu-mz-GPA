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
import { useAnalytics } from './composables/useAnalytics.js'
import { startSyncEngine, syncNow } from './engine/syncEngine.js'
import { createConfiguredSyncAdapter } from './adapters/supabaseSyncAdapter.js'
import { isSupabaseConfigured } from './services/supabase/config.js'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)

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

async function startCloudSync() {
  const profilesStore = useProfilesStore()
  const gradesStore = useGradesStore()
  const adapter = createConfiguredSyncAdapter()

  startSyncEngine({
    stores: { profilesStore, gradesStore },
    adapter
  })

  syncNow()
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
    await startCloudSync()
  } else {
    console.warn(
      'Supabase environment variables are missing; running without cloud sync.'
    )
    initializeState()
    app.mount('#app')
    startCloudSync()
  }
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err)
})
