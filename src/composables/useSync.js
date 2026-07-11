import { ref } from 'vue'
import { isSupabaseConfigured } from '../services/supabase/config.js'

const status = ref('idle')
const lastError = ref(null)

export function useSync() {
  async function sync({ profiles = [], grades = {} } = {}) {
    lastError.value = null

    if (!isSupabaseConfigured()) {
      console.warn('Supabase is not configured; skipping sync.')
      return { error: null }
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      status.value = 'offline'
      return { error: new Error('Offline') }
    }

    status.value = 'syncing'

    try {
      const { pushState, pullState } = await import(
        '../services/supabase/sync.js'
      )

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

      // Ongoing sync is primarily a backup mechanism. A full bidirectional
      // merge is out of scope, so the pulled state is logged but not applied
      // automatically.
      console.log(
        '[useSync] Pulled remote state (not applied on ongoing sync):',
        pullResult
      )

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
