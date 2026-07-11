import { installErrorHandlers } from '../services/supabase/errorReporter.js'

export function useErrorReporter(app) {
  installErrorHandlers(app)
}
