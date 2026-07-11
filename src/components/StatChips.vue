<template>
  <div style="display: flex; gap: 0.5rem; overflow-x: auto; margin-bottom: 1rem;">
    <div class="card" style="min-width: 80px; text-align: center; margin-bottom: 0;">
      <div style="font-size: 1.2rem; font-weight: bold;">{{ totalCredits.toFixed(1) }}</div>
      <div style="font-size: 0.7rem; color: var(--muted);">总学分</div>
    </div>
    <div class="card" style="min-width: 80px; text-align: center; margin-bottom: 0;">
      <div style="font-size: 1.2rem; font-weight: bold;">{{ enteredCount }}</div>
      <div style="font-size: 0.7rem; color: var(--muted);">已录入</div>
    </div>
    <div class="card" style="min-width: 80px; text-align: center; margin-bottom: 0;">
      <div style="font-size: 1.2rem; font-weight: bold;">{{ semesterCount }}</div>
      <div style="font-size: 0.7rem; color: var(--muted);">学期</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  totalCredits: Number,
  enteredCount: Number,
  semesterCount: Number
})
</script>
