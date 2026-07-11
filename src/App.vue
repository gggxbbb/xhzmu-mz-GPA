<template>
  <div :data-theme="appStore.isDark ? 'dark' : 'light'">
    <SyncStatusBar :status="syncStatus" />
    <main class="main-content">
      <RouterView />
    </main>
    <AppNav />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import { useAppStore } from './stores/app'
import { useProfilesStore } from './stores/profiles'
import { useGradesStore } from './stores/grades'
import AppNav from './components/AppNav.vue'
import SyncStatusBar from './components/SyncStatusBar.vue'
import { useSync } from './composables/useSync.js'

const appStore = useAppStore()
const profilesStore = useProfilesStore()
const gradesStore = useGradesStore()
const { status: syncStatus, sync } = useSync()

let syncTimeout = null
let pendingSync = false

function syncStores() {
  if (syncStatus.value === 'syncing') {
    pendingSync = true
    return
  }
  pendingSync = false
  clearTimeout(syncTimeout)
  syncTimeout = setTimeout(() => {
    sync({
      profiles: profilesStore.profiles,
      grades: gradesStore.gradesByProfile
    })
  }, 3000)
}

const unwatchStatus = watch(syncStatus, (newStatus) => {
  if (newStatus === 'idle' && pendingSync) {
    pendingSync = false
    syncStores()
  }
})

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    syncStores()
  }
}

const unsubs = []

onMounted(() => {
  unsubs.push(profilesStore.$subscribe(syncStores))
  unsubs.push(gradesStore.$subscribe(syncStores))

  window.addEventListener('online', syncStores)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  clearTimeout(syncTimeout)
  unwatchStatus()

  unsubs.forEach((unsub) => unsub())
  unsubs.length = 0

  window.removeEventListener('online', syncStores)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>
