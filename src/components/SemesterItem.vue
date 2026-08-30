<template>
  <div class="neo-card semester-card">
    <button
      class="semester-header"
      :aria-expanded="expanded"
      @click="uiStore.toggleSemester(semester)"
    >
      <span class="semester-title">{{ semester }}</span>
      <span class="semester-gpa">
        {{ expanded ? '▼' : '▶' }} GPA {{ Number.isFinite(semesterGpa) ? semesterGpa.toFixed(2) : '0.00' }}
      </span>
    </button>
    <div v-if="expanded" class="semester-body">
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
  semesterGpa: { type: Number, default: 0 }
})

const emit = defineEmits(['updateGrade', 'toggleWhatIf'])

const uiStore = useUIStore()

const expanded = computed(() => uiStore.expandedSemesters.has(props.semester))
</script>
<style scoped>
.semester-card {
  padding: 0;
  overflow: hidden;
}

.semester-title {
  font-weight: var(--weight-heading);
}

.semester-gpa {
  font-size: var(--text-sm);
  color: var(--ink-soft);
}

.semester-body {
  padding: 0 0.8rem;
}
</style>
