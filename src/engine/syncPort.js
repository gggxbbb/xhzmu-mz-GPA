/**
 * SyncPort — the interface the SyncEngine uses to talk to any remote backend.
 *
 * Implementations must be supplied to `startSyncEngine({ adapter })`.
 *
 * @typedef {object} SyncPort
 * @property {() => Promise<{ userId: string }>} authenticate
 *   Ensure a user identity exists for the remote backend. Returns the user id.
 * @property {({ profiles: object[], grades: object }) => Promise<void>} push
 *   Push the current local state to the remote backend.
 * @property {() => Promise<{ profiles: object[], grades: object }>} pull
 *   Pull the latest remote state.
 */

/**
 * A no-op SyncPort used when the remote backend is not configured.
 * @type {SyncPort}
 */
export const noOpSyncAdapter = {
  authenticate: async () => ({ userId: 'offline' }),
  push: async () => {},
  pull: async () => ({ profiles: [], grades: {} })
}
