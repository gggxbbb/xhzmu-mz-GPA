<template>
  <div v-if="currentProfile">
    <GpaSummaryCard :gpa="gpa.currentGPA.value" :target-gpa="currentProfile?.targetGPA ?? 0" />
    <MetricGrid
      :total-credits="gpa.totalCredits.value"
      :remaining-credits="gpa.remainingCredits.value"
      :entered-count="gpa.enteredCourses.value.length"
      :total-count="gpa.allCourses.value.length"
      :semester-gpas="gpa.semesterGPAs.value"
    />
    <TargetAnalysisCard
      :current-gpa="gpa.currentGPA.value"
      :required-average="gpa.requiredAverageForTarget.value"
      :predicted="gpa.predictedGPA"
    />
    <FailingWarningCard :courses="failingCourses" />
    <GpaTrendChart :semester-gpas="gpa.semesterGPAs.value" />
    <ScoreDistributionChart :grades="currentGrades" />
  </div>
  <div v-else class="card" style="text-align: center;">加载中...</div>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '../stores/app'
import { useProfilesStore } from '../stores/profiles'
import { useGradesStore } from '../stores/grades'
import { useGPA } from '../composables/useGPA'
import GpaSummaryCard from '../components/GpaSummaryCard.vue'
import MetricGrid from '../components/MetricGrid.vue'
import TargetAnalysisCard from '../components/TargetAnalysisCard.vue'
import FailingWarningCard from '../components/FailingWarningCard.vue'
import GpaTrendChart from '../components/GpaTrendChart.vue'
import ScoreDistributionChart from '../components/ScoreDistributionChart.vue'

const appStore = useAppStore()
const profilesStore = useProfilesStore()
const gradesStore = useGradesStore()

const currentProfile = computed(() => profilesStore.getProfile(appStore.currentProfileId))
const currentGrades = computed(() => gradesStore.getGrades(appStore.currentProfileId))
const gpa = useGPA(currentProfile, currentGrades)

const failingCourses = computed(() => {
  const result = []
  for (const course of gpa.enteredCourses.value) {
    const score = currentGrades.value[course.name]
    if (score < 60) {
      result.push({ name: course.name, credit: course.credit, score })
    }
  }
  return result
})
</script>
