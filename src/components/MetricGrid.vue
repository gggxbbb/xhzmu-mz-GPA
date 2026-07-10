<template>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; margin-bottom: 1rem;">
    <div class="card" style="text-align: center; margin-bottom: 0;">
      <div style="font-size: 1.4rem; font-weight: bold;">{{ totalCredits.toFixed(1) }}</div>
      <div style="font-size: 0.7rem; color: var(--muted);">总学分</div>
    </div>
    <div class="card" style="text-align: center; margin-bottom: 0;">
      <div style="font-size: 1.4rem; font-weight: bold;">{{ remainingCredits.toFixed(1) }}</div>
      <div style="font-size: 0.7rem; color: var(--muted);">剩余学分</div>
    </div>
    <div class="card" style="text-align: center; margin-bottom: 0;">
      <div style="font-size: 1.4rem; font-weight: bold;">{{ enteredCount }} / {{ totalCount }}</div>
      <div style="font-size: 0.7rem; color: var(--muted);">已录入 / 总课程</div>
    </div>
    <div class="card" style="text-align: center; margin-bottom: 0;">
      <div style="font-size: 1.4rem; font-weight: bold;">{{ highestSemesterGPA.toFixed(2) }}</div>
      <div style="font-size: 0.7rem; color: var(--muted);">最高学期 GPA</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  totalCredits: Number,
  remainingCredits: Number,
  enteredCount: Number,
  totalCount: Number,
  semesterGPAs: Object
})

const highestSemesterGPA = computed(() => {
  const values = Object.values(props.semesterGPAs)
  if (values.length === 0) return 0
  return Math.max(...values)
})
</script>
