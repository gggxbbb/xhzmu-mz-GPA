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
import { onMounted, onUnmounted } from 'vue'
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

function syncStores() {
  sync({ profiles: profilesStore.profiles, grades: gradesStore.gradesByProfile })
}

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
  unsubs.forEach((unsub) => unsub())
  unsubs.length = 0

  window.removeEventListener('online', syncStores)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>
