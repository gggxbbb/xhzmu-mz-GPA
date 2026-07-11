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

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)

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
  })
}

initializeState()
app.mount('#app')
