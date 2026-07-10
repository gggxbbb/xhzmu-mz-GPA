<template>
  <div class="card" style="padding: 0; overflow: hidden;">
    <div
      style="padding: 0.8rem; background: var(--surface); display: flex; justify-content: space-between; align-items: center; cursor: pointer;"
      @click="uiStore.toggleSemester(semester)"
    >
      <span style="font-weight: bold;">{{ semester }}</span>
      <span style="font-size: 0.85rem; color: var(--muted);">
        {{ expanded ? '▼' : '▶' }} GPA {{ semesterGPA.toFixed(2) }}
      </span>
    </div>
    <div v-if="expanded" style="padding: 0 0.8rem;">
      <CourseRow
        v-for="course in courses"
        :key="course.name"
        :course="course"
        :grade="grades[course.name]"
        :all-courses="allCourses"
        :grades="grades"
        :is-active="uiStore.activeWhatIfCourse === course.name"
        @update-grade="(name, value) => $emit('updateGrade', name, value)"
        @toggle-what-if="$emit('toggleWhatIf', course.name)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useUIStore } from '../stores/ui'
import CourseRow from './CourseRow.vue'

const props = defineProps({
  semester: String,
  courses: Array,
  grades: Object,
  allCourses: Array,
  semesterGPA: Number
})

const emit = defineEmits(['updateGrade', 'toggleWhatIf'])

const uiStore = useUIStore()

const expanded = computed(() => uiStore.expandedSemesters.has(props.semester))
</script>
