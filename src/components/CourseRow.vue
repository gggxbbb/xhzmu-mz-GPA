<template>
  <div style="padding: 0.6rem 0; border-bottom: 1px solid var(--border);">
    <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ course.name }}</div>
        <div style="font-size: 0.75rem; color: var(--muted);">{{ course.credit }} 学分</div>
      </div>
      <input
        type="number"
        class="input"
        style="width: 80px; text-align: center;"
        :aria-label="`${course.name} 成绩`"
        min="0"
        max="100"
        step="1"
        :value="grade ?? ''"
        @input="onInput"
      />
      <button
        class="btn"
        style="padding: 0.3rem 0.5rem; font-size: 0.75rem;"
        aria-label="查看此科成绩影响"
        @click="toggleWhatIf"
      >
        📈
      </button>
    </div>
    <WhatIfPanel
      v-if="isActive"
      :course="course"
      :current-grade="grade"
      :all-courses="allCourses"
      :grades="grades"
    />
  </div>
</template>

<script setup>
import WhatIfPanel from './WhatIfPanel.vue'

const props = defineProps({
  course: Object,
  grade: Number,
  allCourses: Array,
  grades: Object,
  isActive: Boolean
})

const emit = defineEmits(['update:grade', 'toggleWhatIf'])

function onInput(event) {
  const value = event.target.value
  if (value === '') {
    emit('update:grade', props.course.name, '')
    return
  }
  const number = Number(value)
  if (!Number.isNaN(number) && number >= 0 && number <= 100) {
    emit('update:grade', props.course.name, number)
  }
}

function toggleWhatIf() {
  emit('toggleWhatIf', props.course.name)
}
</script>
