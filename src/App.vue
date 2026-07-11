<template>
  <div :data-theme="appStore.isDark ? 'dark' : 'light'">
    <main class="main-content">
      <RouterView />
    </main>
    <AppNav />
  </div>
</template>

<script setup>
import { useAppStore } from './stores/app'
import AppNav from './components/AppNav.vue'

const appStore = useAppStore()
</script>
