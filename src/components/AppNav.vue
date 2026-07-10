<template>
  <nav class="nav-bar">
    <RouterLink to="/" class="nav-item" :class="{ active: route.name === 'home' }">
      <span>🏠</span>
      <span>计算</span>
    </RouterLink>
    <RouterLink to="/stats" class="nav-item" :class="{ active: route.name === 'stats' }">
      <span>📊</span>
      <span>统计</span>
    </RouterLink>
    <RouterLink to="/profile" class="nav-item" :class="{ active: route.name === 'profile' }">
      <span>⚙️</span>
      <span>我的</span>
    </RouterLink>
  </nav>
</template>

<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
</script>
