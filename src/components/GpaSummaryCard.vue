<template>
  <section class="card" style="background: linear-gradient(135deg, var(--brand), var(--brand-dark)); color: white; border: none;">
    <div style="text-align: center;">
      <div style="font-size: 2.8rem; font-weight: bold;">{{ gpa.toFixed(2) }}</div>
      <div style="font-size: 0.9rem; opacity: 0.9;">当前 GPA · 目标 {{ targetGpa }}</div>
      <div style="margin-top: 0.8rem; padding-top: 0.8rem; border-top: 1px solid rgba(255,255,255,0.3); font-size: 0.85rem;">
        {{ summaryText }}
      </div>
    </div>
  </section>
</template>

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
