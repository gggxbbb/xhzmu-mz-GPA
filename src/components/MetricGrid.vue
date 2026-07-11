<template>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; margin-bottom: 1rem;">
    <section class="card" style="text-align: center; margin-bottom: 0;">
      <div style="font-size: 1.4rem; font-weight: bold;">{{ Number.isFinite(totalCredits) ? totalCredits.toFixed(1) : '0.0' }}</div>
      <div style="font-size: 0.7rem; color: var(--muted);">总学分</div>
    </section>
    <section class="card" style="text-align: center; margin-bottom: 0;">
      <div style="font-size: 1.4rem; font-weight: bold;">{{ Number.isFinite(remainingCredits) ? remainingCredits.toFixed(1) : '0.0' }}</div>
      <div style="font-size: 0.7rem; color: var(--muted);">剩余学分</div>
    </section>
    <section class="card" style="text-align: center; margin-bottom: 0;">
      <div style="font-size: 1.4rem; font-weight: bold;">{{ enteredCount ?? 0 }} / {{ totalCount ?? 0 }}</div>
      <div style="font-size: 0.7rem; color: var(--muted);">已录入 / 总课程</div>
    </section>
    <section class="card" style="text-align: center; margin-bottom: 0;">
      <div style="font-size: 1.4rem; font-weight: bold;">{{ Number.isFinite(highestSemesterGPA) ? highestSemesterGPA.toFixed(2) : '0.00' }}</div>
      <div style="font-size: 0.7rem; color: var(--muted);">最高学期 GPA</div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  totalCredits: { type: Number, default: 0 },
  remainingCredits: { type: Number, default: 0 },
  enteredCount: { type: Number, default: 0 },
  totalCount: { type: Number, default: 0 },
  semesterGPAs: { type: Object, default: () => ({}) }
})

const highestSemesterGPA = computed(() => {
  const values = Object.values(props.semesterGPAs || {})
  if (values.length === 0) return 0
  return Math.max(...values)
})
</script>
