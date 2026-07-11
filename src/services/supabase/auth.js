import { supabase } from './client.js'

let currentUser = null

export async function initAnonymousAuth() {
  try {
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      console.error('Failed to retrieve session:', error)
      return
    }

    if (data?.session?.user) {
      currentUser = data.session.user
      return
    }

    const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously()

    if (signInError) {
      console.error('Failed to sign in anonymously:', signInError)
      return
    }

    currentUser = signInData?.user ?? null
  } catch (err) {
    console.error('Unexpected error during anonymous auth initialization:', err)
  }
}

export function getCurrentUserId() {
  return currentUser?.id ?? null
}

export function isAuthenticated() {
  return currentUser !== null
}
