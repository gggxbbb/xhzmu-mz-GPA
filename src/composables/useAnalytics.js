import { track } from '../services/supabase/analytics.js'

export function useAnalytics() {
  function trackPageView(properties = {}) {
    track('page_view', properties)
  }

  function trackGradeEntered(properties = {}) {
    track('grade_entered', properties)
  }

  function trackProfileSwitched(properties = {}) {
    track('profile_switched', properties)
  }

  function trackProfileCreated(properties = {}) {
    track('profile_created', properties)
  }

  function trackProfileImported(properties = {}) {
    track('profile_imported', properties)
  }

  function trackProfileExported(properties = {}) {
    track('profile_exported', properties)
  }

  function trackShareCodeGenerated(properties = {}) {
    track('share_code_generated', properties)
  }

  function trackShareCodeRecovered(properties = {}) {
    track('share_code_recovered', properties)
  }

  function trackThemeChanged(properties = {}) {
    track('theme_changed', properties)
  }

  function trackSyncCompleted(properties = {}) {
    track('sync_completed', properties)
  }

  function trackSyncFailed(properties = {}) {
    track('sync_failed', properties)
  }

  return {
    track,
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
