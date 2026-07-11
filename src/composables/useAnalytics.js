let trackFn = null
let trackPromise = null

async function loadTracker() {
  if (trackFn) return trackFn
  if (!trackPromise) {
    trackPromise = import('../services/supabase/analytics.js')
      .then((mod) => {
        trackFn = mod.track
        return trackFn
      })
      .catch((err) => {
        console.error('Failed to load analytics tracker:', err)
        trackPromise = null
        throw err
      })
  }
  return trackPromise
}

function enqueue(name, properties = {}) {
  loadTracker()
    .then((track) => track(name, properties))
    .catch(() => {})
}

export function useAnalytics() {
  function trackPageView(path, routeName) {
    enqueue('page_view', { path, routeName })
  }

  function trackGradeEntered(courseCount) {
    enqueue('grade_entered', { courseCount })
  }

  function trackProfileSwitched(profileCount) {
    enqueue('profile_switched', { profileCount })
  }

  function trackProfileCreated() {
    enqueue('profile_created')
  }

  function trackProfileImported(format) {
    enqueue('profile_imported', { format })
  }

  function trackProfileExported(format) {
    enqueue('profile_exported', { format })
  }

  function trackShareCodeGenerated() {
    enqueue('share_code_generated')
  }

  function trackShareCodeRecovered() {
    enqueue('share_code_recovered')
  }

  function trackThemeChanged(theme) {
    enqueue('theme_changed', { theme })
  }

  function trackSyncCompleted(direction) {
    enqueue('sync_completed', { direction })
  }

  function trackSyncFailed(errorCode) {
    enqueue('sync_failed', { errorCode })
  }

  return {
    trackPageView,
    trackGradeEntered,
    trackProfileSwitched,
    trackProfileCreated,
    trackProfileImported,
    trackProfileExported,
    trackShareCodeGenerated,
    trackShareCodeRecovered,
    trackThemeChanged,
    trackSyncCompleted,
    trackSyncFailed
  }
}
