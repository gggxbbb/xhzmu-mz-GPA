import { track } from '../services/supabase/analytics.js'

export function useAnalytics() {
  function trackPageView(path, name) {
    track('page_view', { path, name })
  }

  function trackGradeEntered(courseCount) {
    track('grade_entered', { courseCount })
  }

  function trackProfileSwitched(profileCount) {
    track('profile_switched', { profileCount })
  }

  function trackProfileCreated() {
    track('profile_created')
  }

  function trackProfileImported(format) {
    track('profile_imported', { format })
  }

  function trackProfileExported(format) {
    track('profile_exported', { format })
  }

  function trackShareCodeGenerated() {
    track('share_code_generated')
  }

  function trackShareCodeRecovered() {
    track('share_code_recovered')
  }

  function trackThemeChanged(theme) {
    track('theme_changed', { theme })
  }

  function trackSyncCompleted(direction) {
    track('sync_completed', { direction })
  }

  function trackSyncFailed(errorCode) {
    track('sync_failed', { errorCode })
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
