<template>
  <div>
    <GpaCard :gpa="gpa.currentGPA.value" :target-gpa="currentProfile.targetGPA" />
    <StatChips
      :total-credits="gpa.totalCredits.value"
      :entered-count="gpa.enteredCourses.value.length"
      :semester-count="Object.keys(currentProfile.classes).length"
    />
    <SearchBar v-model="uiStore.searchQuery" />
    <IllegalWarning :courses="gpa.illegalGrades.value" />
    <SemesterItem
      v-for="(courses, semester) in filteredClasses"
      :key="semester"
      :semester="semester"
      :courses="courses"
      :grades="currentGrades"
      :all-courses="gpa.allCourses.value"
      :semester-gpa="gpa.semesterGPAs.value[semester] || 0"
      @update-grade="onUpdateGrade"
      @toggle-what-if="uiStore.setActiveWhatIfCourse"
    />
    <div v-if="!hasFilteredClasses" style="text-align: center; color: var(--muted); padding: 2rem;">
      未找到匹配课程
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '../stores/app'
import { useProfilesStore } from '../stores/profiles'
import { useGradesStore } from '../stores/grades'
import { useUIStore } from '../stores/ui'
import { useGPA } from '../composables/useGPA'
import GpaCard from '../components/GpaCard.vue'
import StatChips from '../components/StatChips.vue'
import SearchBar from '../components/SearchBar.vue'
import SemesterItem from '../components/SemesterItem.vue'
import IllegalWarning from '../components/IllegalWarning.vue'

const appStore = useAppStore()
const profilesStore = useProfilesStore()
const gradesStore = useGradesStore()
const uiStore = useUIStore()

const currentProfile = computed(() => profilesStore.getProfile(appStore.currentProfileId.value))
const currentGrades = computed(() => gradesStore.getGrades(appStore.currentProfileId.value))

const gpa = useGPA(currentProfile, currentGrades)

const filteredClasses = computed(() => {
  const query = uiStore.searchQuery.trim().toLowerCase()
  const result = {}
  for (const semester of Object.keys(currentProfile.value.classes)) {
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
  gradesStore.setGrade(appStore.currentProfileId.value, courseName, value)
}
</script>
