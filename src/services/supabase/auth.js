import { supabase } from './client.js'

let currentUser = null
let initPromise = null

export async function initAnonymousAuth() {
  if (initPromise) {
    return initPromise
  }

  initPromise = (async () => {
    try {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Failed to retrieve session:', error)
      }

      if (data?.session?.user) {
        currentUser = data.session.user
        return { user: currentUser, error: null }
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously()

      if (signInError) {
        console.error('Failed to sign in anonymously:', signInError)
        return { user: null, error: signInError }
      }

      currentUser = signInData?.user ?? null
      return { user: currentUser, error: null }
    } catch (err) {
      console.error('Unexpected error during anonymous auth initialization:', err)
      return { user: null, error: err }
    }
  })()

  return initPromise
}

export function getCurrentUserId() {
  return currentUser?.id ?? null
}

export function isAuthenticated() {
  return currentUser !== null
}
