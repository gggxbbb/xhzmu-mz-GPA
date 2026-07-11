<template>
  <div class="card" style="background: linear-gradient(135deg, var(--brand), var(--brand-dark)); color: white; border: none;">
    <div style="text-align: center;">
      <div style="font-size: 0.9rem; opacity: 0.9;">当前学位绩点</div>
      <div class="gpa-display" :class="{ 'below-target': isBelowTarget }" style="margin: 0.5rem 0;">
        {{ formattedGPA }}
      </div>
      <div style="font-size: 0.85rem; opacity: 0.9;">
        目标 {{ targetGpa }} · {{ diffText }}
      </div>
    </div>
  </div>
</template>

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
