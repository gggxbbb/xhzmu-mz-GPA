# SyncEngine module and SyncPort adapter

## Context

Cloud-sync scheduling and execution were spread across `App.vue` (debounce, online/offline, visibilitychange, pending-sync queue), `main.js` (store loading, migration, Supabase authentication), and `src/services/supabase/sync.js` (DB row mapping, push/pull, and domain merge logic). The seam was hidden inside Supabase-specific modules, so the sync policy could not be tested without mocking Supabase internals.

## Decision

Introduce a single `SyncEngine` module (`src/engine/syncEngine.js`) that owns the full sync lifecycle: it subscribes to the Pinia stores, debounces local changes for three seconds, and exposes `startSyncEngine({ stores, adapter })`, `stopSyncEngine()`, `syncNow()`, plus readonly `status` and `lastError`.

Remote transport is hidden behind a `SyncPort` interface (`src/engine/syncPort.js`) with `authenticate()`, `push({ profiles, grades })`, and `pull()`. The Supabase implementation lives in `src/adapters/supabaseSyncAdapter.js`. Domain merging of local and remote state lives in `src/engine/stateMerge.js`.

`src/composables/useSync.js` is kept as a thin backward-compatible wrapper over the engine.

## Considered options

1. **Keep the current split.** Rejected: the policy leaks into UI components and cannot be tested without module mocks.
2. **Make `SyncEngine` a Vue composable.** Rejected: sync is an application-level service, not per-component state.
3. **Inline Supabase calls in the engine.** Rejected: it would keep the transport seam hard-coded and block test doubles.

## Consequences

- Sync behavior is now testable with an in-memory `SyncPort` adapter and fake timers.
- `App.vue` no longer schedules sync; it only renders `status`.
- Future backends only need a new `SyncPort` adapter; the engine stays the same.
