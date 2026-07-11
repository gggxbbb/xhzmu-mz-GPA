import { installErrorHandlers } from '../services/supabase/errorReporter.js'

export function useErrorReporter() {
  return {
    install(app) {
      installErrorHandlers(app)
    }
  }
}
