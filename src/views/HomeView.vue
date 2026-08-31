<template>
  <div v-if="currentProfile">
    <GpaCard :gpa="gpa.currentGPA.value" :target-gpa="currentProfile.targetGPA" />
    <TargetAnalysisCard
      :current-gpa="gpa.currentGPA.value"
      :required-average="gpa.requiredAverageForTarget.value"
      :remaining-credits="gpa.remainingCredits.value"
      :predicted="gpa.predictedGPA"
    />
    <StatChips
      :total-credits="gpa.totalCredits.value"
      :entered-count="gpa.enteredCourses.value.length"
      :semester-count="Object.keys(currentProfile.classes).length"
    />
    <SearchBar v-model="uiStore.searchQuery" />
    <IllegalWarning :courses="gpa.suspiciousGrades.value" />
    <SemesterItem
      v-for="(courses, semester) in filteredClasses"
      :key="semester"
      :semester="semester"
      :courses="courses"
      :grades="currentGrades"
      :all-courses="gpa.allCourses.value"
      :semester-gpa="gpa.semesterGPAs.value?.[semester] ?? 0"
      @update-grade="onUpdateGrade"
      @toggle-what-if="uiStore.setActiveWhatIfCourse"
    />
    <div v-if="!hasFilteredClasses" class="empty-state">
      未找到匹配课程
    </div>
  </div>
  <div v-else class="neo-card loading-state">加载中...</div>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '../stores/app'
import { useProfilesStore } from '../stores/profiles'
import { useGradesStore } from '../stores/grades'
import { useUIStore } from '../stores/ui'
import { useGPA } from '../composables/useGPA'
import { sortClasses } from '../utils/semesterSort'
import GpaCard from '../components/GpaCard.vue'
import TargetAnalysisCard from '../components/TargetAnalysisCard.vue'
import StatChips from '../components/StatChips.vue'
import SearchBar from '../components/SearchBar.vue'
import SemesterItem from '../components/SemesterItem.vue'
import IllegalWarning from '../components/IllegalWarning.vue'

const appStore = useAppStore()
const profilesStore = useProfilesStore()
const gradesStore = useGradesStore()
const uiStore = useUIStore()

const currentProfile = computed(() => profilesStore.getProfile(appStore.currentProfileId))
const currentGrades = computed(() => gradesStore.getGrades(appStore.currentProfileId))

const gpa = useGPA(currentProfile, currentGrades)

const filteredClasses = computed(() => {
  const query = uiStore.searchQuery.trim().toLowerCase()
  const result = {}
  for (const semester of Object.keys(sortClasses(currentProfile.value.classes))) {
    const courses = currentProfile.value.classes[semester]
    const filtered = query
      ? courses.filter(c => c.name.toLowerCase().includes(query))
      : courses
    if (filtered.length > 0) {
      result[semester] = filtered
    }
  }
  return result
})

const hasFilteredClasses = computed(() => Object.keys(filteredClasses.value).length > 0)

function onUpdateGrade(courseName, value) {
  gradesStore.setGrade(appStore.currentProfileId, courseName, value)
}
</script>
<style scoped>
.empty-state {
  text-align: center;
  color: var(--ink-soft);
  padding: 2rem;
}

.loading-state {
  text-align: center;
}
</style>
