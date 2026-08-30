<template>
  <div class="neo-card neo-card--accent">
    <div class="gpa-hero">
      <div class="gpa-hero-label">当前学位绩点</div>
      <div class="gpa-display" :class="{ 'below-target': isBelowTarget }">
        {{ formattedGPA }}
      </div>
      <div class="gpa-hero-sub">
        目标 {{ targetGpa }} · {{ diffText }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.gpa-hero {
  text-align: center;
}

.gpa-hero .gpa-display {
  margin: 0.5rem 0;
}

.gpa-hero-label {
  font-size: var(--text-sm);
  font-weight: var(--weight-heading);
}

.gpa-hero-sub {
  font-size: var(--text-sm);
}
</style>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '../stores/app'

const props = defineProps({
  gpa: { type: Number, required: true },
  targetGpa: { type: Number, default: 0 }
})

const appStore = useAppStore()

const safeGPA = computed(() => Number.isFinite(props.gpa) ? props.gpa : 0)
const safeTarget = computed(() => Number.isFinite(props.targetGpa) ? props.targetGpa : 0)

const formattedGPA = computed(() => {
  const decimals = appStore.showVeryLongGPA ? 5 : (Math.abs(safeGPA.value - safeTarget.value) < 0.01 ? 3 : 2)
  return safeGPA.value.toFixed(decimals)
})

const isBelowTarget = computed(() => safeGPA.value < safeTarget.value && safeGPA.value > 0)

const diffText = computed(() => {
  const diff = safeGPA.value - safeTarget.value
  if (Math.abs(diff) < 0.001) return '刚好达标'
  if (diff > 0) return `已超 ${diff.toFixed(2)}`
  return `还差 ${Math.abs(diff).toFixed(2)}`
})
</script>
