import { ref } from 'vue'
import { pushState, pullState } from '../services/supabase/sync.js'

const status = ref('idle')
const lastError = ref(null)

export function useSync() {
  async function sync({ profiles = [], grades = {} } = {}) {
    lastError.value = null

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      status.value = 'offline'
      return { error: new Error('Offline') }
    }

    status.value = 'syncing'

    try {
      const pushResult = await pushState({ profiles, grades })
      if (pushResult?.error) {
        status.value = 'error'
        lastError.value = pushResult.error
        return { error: pushResult.error }
      }

      const pullResult = await pullState()
      if (pullResult?.error) {
        status.value = 'error'
        lastError.value = pullResult.error
        return { error: pullResult.error }
      }

      status.value = 'idle'
      return {
        profiles: pullResult.profiles,
        grades: pullResult.grades,
        error: null
      }
    } catch (err) {
      status.value = 'error'
      lastError.value = err
      return { error: err }
    }
  }

  return { status, lastError, sync }
}
