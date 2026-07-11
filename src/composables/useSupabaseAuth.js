import { ref, onMounted } from 'vue'
import { initAnonymousAuth } from '../services/supabase/auth.js'

export function useSupabaseAuth() {
  const ready = ref(false)
  const userId = ref(null)
  const error = ref(null)

  onMounted(async () => {
    const result = await initAnonymousAuth()
    userId.value = result?.user?.id ?? null
    error.value = result?.error ?? null
    ready.value = true
  })

  return { ready, userId, error }
}
