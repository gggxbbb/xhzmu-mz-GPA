<template>
  <div class="sync-status-bar" role="status" aria-live="polite">
    <span class="status-dot" :class="`status-${status}`" aria-hidden="true"></span>
    <span class="status-label">{{ label }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    default: 'idle',
    validator(value) {
      return ['idle', 'syncing', 'offline', 'error'].includes(value)
    }
  }
})

const labels = {
  idle: '已同步',
  syncing: '同步中…',
  offline: '离线模式',
  error: '同步失败'
}

const label = computed(() => labels[props.status] ?? labels.idle)
</script>

<style scoped>
.sync-status-bar {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--muted, #666666);
}

.status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  flex-shrink: 0;
  background-color: var(--status-color, #999999);
}

.status-idle {
  --status-color: var(--success, #4caf50);
  background-color: var(--success, #4caf50);
}

.status-syncing {
  --status-color: var(--brand, #66ccff);
  background-color: var(--brand, #66ccff);
  animation: pulse 1.2s ease-in-out infinite;
}

.status-offline {
  --status-color: var(--warning, #ff9800);
  background-color: var(--warning, #ff9800);
}

.status-error {
  --status-color: var(--danger, #f44336);
  background-color: var(--danger, #f44336);
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}
</style>
