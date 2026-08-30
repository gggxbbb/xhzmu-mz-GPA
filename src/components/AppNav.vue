<template>
  <nav class="nav-bar">
    <RouterLink to="/" class="nav-item" :class="{ active: route.name === 'home' }" :aria-current="route.name === 'home' ? 'page' : undefined">
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">
        <path d="M3 12 L12 4 L21 12" />
        <path d="M6 10.5 V20 H18 V10.5" />
      </svg>
      <span>计算</span>
    </RouterLink>
    <RouterLink to="/stats" class="nav-item" :class="{ active: route.name === 'stats' }" :aria-current="route.name === 'stats' ? 'page' : undefined">
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">
        <path d="M4 4 V20 H20" />
        <path d="M8 16 V10" />
        <path d="M12 16 V6" />
        <path d="M16 16 V12" />
      </svg>
      <span>统计</span>
    </RouterLink>
    <RouterLink to="/profile" class="nav-item" :class="{ active: route.name === 'profile' }" :aria-current="route.name === 'profile' ? 'page' : undefined">
      <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20 C4 15.5 7.5 13 12 13 C16.5 13 20 15.5 20 20" />
      </svg>
      <span>我的</span>
    </RouterLink>
  </nav>
</template>

<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<style scoped>
.nav-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--nav-height);
  background: var(--surface);
  border-top: 3px solid var(--ink);
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  z-index: 100;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--ink-soft);
  text-decoration: none;
  font-size: var(--text-xs);
}

.nav-item.active {
  color: var(--accent-strong);
  font-weight: var(--weight-heading);
}

.nav-item:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* ticket 06 — nav SVG icons: thick strokes, ink color, theme-flipping */
.nav-icon {
  width: 24px;
  height: 24px;
  color: var(--ink);
  margin-bottom: 2px;
  flex-shrink: 0;
}

.nav-item.active .nav-icon {
  color: var(--accent-strong);
}
</style>
