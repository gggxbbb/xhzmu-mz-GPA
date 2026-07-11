import { ref } from 'vue'
import { pushState, pullState } from '../services/supabase/sync.js'

export function useSync() {
  const status = ref('idle')
  const lastError = ref(null)

  async function sync({ profiles = [], grades = {} } = {}) {
    lastError.value = null

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      status.value = 'offline'
      return { profiles: [], grades: {}, error: new Error('Device is offline') }
    }

    status.value = 'syncing'

    const pushResult = await pushState({ profiles, grades })
    if (pushResult?.error) {
      status.value = 'error'
      lastError.value = pushResult.error
      return { profiles: [], grades: {}, error: pushResult.error }
    }

    const pullResult = await pullState()
    if (pullResult?.error) {
      status.value = 'error'
      lastError.value = pullResult.error
      return { profiles: [], grades: {}, error: pullResult.error }
    }

    status.value = 'idle'
    return pullResult
  }

  return { status, lastError, sync }
}
