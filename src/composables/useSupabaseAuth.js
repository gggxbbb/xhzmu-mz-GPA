import { ref, onMounted } from 'vue'
import { initAnonymousAuth, getCurrentUserId } from '../services/supabase/auth.js'

const ready = ref(false)
const userId = ref(null)
const error = ref(null)

export function useSupabaseAuth() {
  onMounted(async () => {
    if (ready.value) {
      return
    }

    try {
      const result = await initAnonymousAuth()
      const user = result?.user ?? null
      userId.value = user?.id || getCurrentUserId()
      error.value = result?.error ?? null

      if (error.value) {
        console.error('Supabase auth initialization failed:', error.value)
      }
    } catch (err) {
      error.value = err
      console.error('Unexpected error during Supabase auth initialization:', err)
    } finally {
      ready.value = true
    }
  })

  return { ready, userId, error }
}
