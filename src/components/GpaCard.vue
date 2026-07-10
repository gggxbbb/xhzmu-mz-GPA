<template>
  <div class="card" style="background: linear-gradient(135deg, var(--brand), var(--brand-dark)); color: white; border: none;">
    <div style="text-align: center;">
      <div style="font-size: 0.9rem; opacity: 0.9;">当前学位绩点</div>
      <div class="gpa-display" :class="{ 'below-target': isBelowTarget }" style="margin: 0.5rem 0;">
        {{ formattedGPA }}
      </div>
      <div style="font-size: 0.85rem; opacity: 0.9;">
        目标 {{ targetGPA }} · {{ diffText }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '../stores/app'

const props = defineProps({
  gpa: { type: Number, required: true },
  targetGPA: { type: Number, required: true }
})

const appStore = useAppStore()

const formattedGPA = computed(() => {
  const decimals = appStore.showVeryLongGPA ? 5 : (Math.abs(props.gpa - props.targetGPA) < 0.01 ? 3 : 2)
  return props.gpa.toFixed(decimals)
})

const isBelowTarget = computed(() => props.gpa < props.targetGPA && props.gpa > 0)

const diffText = computed(() => {
  const diff = props.gpa - props.targetGPA
  if (Math.abs(diff) < 0.001) return '刚好达标'
  if (diff > 0) return `已超 ${diff.toFixed(2)}`
  return `还差 ${Math.abs(diff).toFixed(2)}`
})
</script>
