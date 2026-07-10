const STORAGE_KEY = 'gpa_v2'

export function loadAppState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    console.error('Failed to load app state', e)
    return null
  }
}

export function saveAppState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('Failed to save app state', e)
  }
}
