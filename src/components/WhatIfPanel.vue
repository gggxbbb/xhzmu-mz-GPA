<template>
  <div class="whatif-panel">
    <div class="whatif-header">
      <span class="whatif-label">假设分数</span>
      <span class="whatif-score">{{ assumedScore }}</span>
    </div>
    <input
      type="range"
      aria-label="假设分数"
      min="0"
      max="100"
      step="1"
      v-model.number="assumedScore"
      class="whatif-slider"
    />
    <div class="whatif-result">
      此科 {{ assumedScore }} 分时，总 GPA 将变为 <strong>{{ simulatedGPA.toFixed(2) }}</strong>
    </div>
  </div>
</template>

<style scoped>
.whatif-panel {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: var(--bg);
  border: 2px solid var(--ink);
  border-radius: 0.5rem;
}

.whatif-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.whatif-label {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
}

.whatif-score {
  font-weight: var(--weight-heading);
}

.whatif-slider {
  width: 100%;
  margin-bottom: 0.5rem;
}

.whatif-result {
  font-size: var(--text-xs);
  color: var(--ink-soft);
}
</style>

<script setup>
import { ref, computed, watch } from 'vue'
import { calculateGPA } from '../composables/useGPA'

const props = defineProps({
  course: Object,
  currentGrade: Number,
  allCourses: Array,
  grades: Object
})

const assumedScore = ref(props.currentGrade ?? 60)

watch(() => props.currentGrade, (newGrade) => {
  assumedScore.value = newGrade ?? 60
})

const simulatedGrades = computed(() => ({
  ...props.grades,
  [props.course.name]: assumedScore.value
}))

const simulatedGPA = computed(() => calculateGPA(props.allCourses, simulatedGrades.value))
</script>
