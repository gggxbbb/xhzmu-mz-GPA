/**
 * Backward-compatible wrapper over the SyncEngine.
 *
 * The actual sync lifecycle, scheduling, and remote seam live in
 * `src/engine/syncEngine.js`. This composable re-exports the engine's public
 * surface so existing callers can migrate gradually.
 *
 * @deprecated Prefer importing directly from `src/engine/syncEngine.js`.
 */
import { syncNow, status, lastError, isApplying } from '../engine/syncEngine.js'

export function useSync() {
  return {
    status,
    lastError,
    isApplying,
    sync: syncNow
  }
}
