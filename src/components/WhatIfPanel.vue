<template>
  <div style="margin-top: 0.5rem; padding: 0.75rem; background: var(--bg); border: 1px solid var(--border); border-radius: 0.5rem;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
      <span style="font-size: 0.85rem; font-weight: 500;">假设分数</span>
      <span style="font-weight: bold;">{{ assumedScore }}</span>
    </div>
    <input
      type="range"
      aria-label="假设分数"
      min="0"
      max="100"
      step="1"
      v-model.number="assumedScore"
      style="width: 100%; margin-bottom: 0.5rem;"
    />
    <div style="font-size: 0.8rem; color: var(--muted);">
      此科 {{ assumedScore }} 分时，总 GPA 将变为 <strong>{{ simulatedGPA.toFixed(2) }}</strong>
    </div>
  </div>
</template>

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
