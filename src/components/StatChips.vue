<template>
  <div class="stat-chips">
    <div class="neo-card stat-chip">
      <div class="stat-chip-value">{{ totalCredits.toFixed(1) }}</div>
      <div class="stat-chip-label">总学分</div>
    </div>
    <div class="neo-card stat-chip">
      <div class="stat-chip-value">{{ enteredCount }}</div>
      <div class="stat-chip-label">已录入</div>
    </div>
    <div class="neo-card stat-chip">
      <div class="stat-chip-value">{{ semesterCount }}</div>
      <div class="stat-chip-label">学期</div>
    </div>
  </div>
</template>

<style scoped>
.stat-chips {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.stat-chip {
  text-align: center;
  margin-bottom: 0;
  padding: 0.75rem 0.5rem;
}

.stat-chip-value {
  font-family: var(--font-digits);
  font-size: var(--text-lg);
  font-weight: var(--weight-digits);
}

.stat-chip-label {
  font-size: var(--text-xs);
  color: var(--ink-soft);
}
</style>

<script setup>
defineProps({
  totalCredits: Number,
  enteredCount: Number,
  semesterCount: Number
})
</script>
