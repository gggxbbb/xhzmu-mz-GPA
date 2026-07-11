import { ref } from 'vue'
import { isSupabaseConfigured } from '../services/supabase/config.js'
import { useProfilesStore } from '../stores/profiles.js'
import { useGradesStore } from '../stores/grades.js'
import { useAnalytics } from './useAnalytics.js'

const status = ref('idle')
const lastError = ref(null)

const { trackSyncCompleted, trackSyncFailed } = useAnalytics()

export function useSync() {
  async function sync({ profiles = [], grades = {} } = {}) {
    lastError.value = null

    if (!isSupabaseConfigured()) {
      console.warn('Supabase is not configured; skipping sync.')
      status.value = 'offline'
      return { error: null }
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      status.value = 'offline'
      return { error: new Error('Offline') }
    }

    status.value = 'syncing'

    try {
      const {
        pushState,
        pullState,
        mergeProfiles,
        mergeGrades
      } = await import('../services/supabase/sync.js')

      const pushResult = await pushState({ profiles, grades })
      if (pushResult?.error) {
        throw pushResult.error
      }

      const pullResult = await pullState()
      if (pullResult?.error) {
        throw pullResult.error
      }

      const profilesStore = useProfilesStore()
      const gradesStore = useGradesStore()

      const mergedProfiles = mergeProfiles(profiles, pullResult.profiles)
      const mergedGrades = mergeGrades(grades, pullResult.grades, mergedProfiles)

      profilesStore.load(mergedProfiles)
      gradesStore.load(mergedGrades)

      status.value = 'idle'
      trackSyncCompleted('pull')

      return {
        profiles: mergedProfiles,
        grades: mergedGrades,
        error: null
      }
    } catch (err) {
      status.value = 'error'
      lastError.value = err
      trackSyncFailed(String(err?.message ?? err))
      return { error: err }
    }
  }

  return { status, lastError, sync }
}
