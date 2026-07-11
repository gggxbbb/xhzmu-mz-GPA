<template>
  <nav class="nav-bar">
    <RouterLink to="/" class="nav-item" :class="{ active: route.name === 'home' }" :aria-current="route.name === 'home' ? 'page' : undefined">
      <span>🏠</span>
      <span>计算</span>
    </RouterLink>
    <RouterLink to="/stats" class="nav-item" :class="{ active: route.name === 'stats' }" :aria-current="route.name === 'stats' ? 'page' : undefined">
      <span>📊</span>
      <span>统计</span>
    </RouterLink>
    <RouterLink to="/profile" class="nav-item" :class="{ active: route.name === 'profile' }" :aria-current="route.name === 'profile' ? 'page' : undefined">
      <span>⚙️</span>
      <span>我的</span>
    </RouterLink>
  </nav>
</template>

<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
</script>
