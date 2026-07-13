import { isSupabaseConfigured } from '../services/supabase/config.js'
import { noOpSyncAdapter } from '../engine/syncPort.js'

/**
 * Create a SyncPort adapter backed by Supabase.
 * @returns {import('../engine/syncPort.js').SyncPort}
 */
export function createSupabaseSyncAdapter() {
  return {
    authenticate: async () => {
      const { initAnonymousAuth, getCurrentUserId } = await import('../services/supabase/auth.js')

      if (!getCurrentUserId()) {
        const { error } = await initAnonymousAuth()
        if (error || !getCurrentUserId()) {
          throw error || new Error('Anonymous authentication failed')
        }
      }

      return { userId: getCurrentUserId() }
    },

    push: async ({ profiles = [], grades = {} } = {}) => {
      const { pushState } = await import('../services/supabase/sync.js')
      const result = await pushState({ profiles, grades })
      if (result?.error) throw result.error
    },

    pull: async () => {
      const { pullState } = await import('../services/supabase/sync.js')
      const result = await pullState()
      if (result?.error) throw result.error
      return { profiles: result.profiles, grades: result.grades }
    }
  }
}

/**
 * Convenience: returns a real Supabase adapter when configured, otherwise a no-op adapter.
 * @returns {import('../engine/syncPort.js').SyncPort}
 */
export function createConfiguredSyncAdapter() {
  return isSupabaseConfigured() ? createSupabaseSyncAdapter() : noOpSyncAdapter
}
