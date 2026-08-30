<template>
  <section class="neo-card neo-card--accent">
    <div class="gpa-summary">
      <div class="gpa-summary-value">{{ gpa.toFixed(2) }}</div>
      <div class="gpa-summary-label">当前 GPA · 目标 {{ targetGpa }}</div>
      <div class="gpa-summary-text">
        {{ summaryText }}
      </div>
    </div>
  </section>
</template>

<style scoped>
.gpa-summary {
  text-align: center;
}

.gpa-summary-value {
  font-family: var(--font-digits);
  font-size: var(--text-2xl);
  font-weight: var(--weight-digits);
  line-height: 1.1;
}

.gpa-summary-label {
  font-size: var(--text-sm);
  font-weight: var(--weight-heading);
}

.gpa-summary-text {
  margin-top: 0.8rem;
  padding-top: 0.8rem;
  border-top: 3px solid var(--ink);
  font-size: var(--text-sm);
}
</style>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  gpa: { type: Number, default: 0 },
  targetGpa: { type: Number, default: 0 }
})

const gpa = computed(() => Number.isFinite(props.gpa) ? props.gpa : 0)
const targetGpa = computed(() => Number.isFinite(props.targetGpa) ? props.targetGpa : 0)

const summaryText = computed(() => {
  const diff = gpa.value - targetGpa.value
  if (!Number.isFinite(diff)) return '加载中...'
  if (Math.abs(diff) < 0.001) return '刚好达标'
  if (diff > 0) return `已超目标 ${diff.toFixed(2)}`
  return `还差 ${Math.abs(diff).toFixed(2)}`
})
</script>
