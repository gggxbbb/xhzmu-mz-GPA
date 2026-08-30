<template>
  <div class="course-row">
    <div class="course-row-main">
      <div class="course-row-info">
        <div class="course-row-name">{{ course.name }}</div>
        <div class="course-row-credit">{{ course.credit }} 学分</div>
      </div>
      <input
        type="number"
        class="neo-input grade-input"
        :aria-label="`${course.name} 成绩`"
        min="0"
        max="100"
        step="1"
        :value="grade ?? ''"
        @input="onInput"
      />
      <button
        class="neo-btn whatif-btn"
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

const emit = defineEmits(['updateGrade', 'toggleWhatIf'])

function onInput(event) {
  const value = event.target.value
  if (value === '') {
    emit('updateGrade', props.course.name, '')
    return
  }
  const number = Number(value)
  if (!Number.isNaN(number) && number >= 0 && number <= 100) {
    emit('updateGrade', props.course.name, number)
  }
}

function toggleWhatIf() {
  emit('toggleWhatIf', props.course.name)
}
</script>
<style scoped>
.course-row {
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--ink-soft);
}

.course-row-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.course-row-info {
  flex: 1;
  min-width: 0;
}

.course-row-name {
  font-weight: var(--weight-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.course-row-credit {
  font-size: var(--text-xs);
  color: var(--ink-soft);
}

.grade-input {
  width: 80px;
  text-align: center;
}

.whatif-btn {
  padding: 0.3rem 0.5rem;
  font-size: var(--text-xs);
  min-height: 36px;
}
</style>
