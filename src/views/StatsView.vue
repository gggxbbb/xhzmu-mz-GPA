<template>
  <div v-if="currentProfile" class="stats-page">
    <section class="stats-group" aria-label="汇总">
      <GpaSummaryCard :gpa="gpa.currentGPA.value" :target-gpa="currentProfile?.targetGPA ?? 0" />
    </section>
    <section class="stats-group" aria-label="指标">
      <MetricGrid
        :total-credits="gpa.totalCredits.value"
        :remaining-credits="gpa.remainingCredits.value"
        :entered-count="gpa.enteredCourses.value.length"
        :total-count="gpa.allCourses.value.length"
        :semester-gpas="gpa.semesterGPAs.value"
      />
    </section>
    <section class="stats-group" aria-label="警告">
      <FailingWarningCard :courses="gpa.failingCourses.value" />
    </section>
    <section class="stats-group" aria-label="图表">
      <GpaTrendChart :semester-gpas="gpa.semesterGPAs.value" />
      <ScoreDistributionChart :grades="currentGrades" />
    </section>
  </div>
  <div v-else class="neo-card loading-state">加载中...</div>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '../stores/app'
import { useProfilesStore } from '../stores/profiles'
import { useGradesStore } from '../stores/grades'
import { useGPA } from '../composables/useGPA'
import GpaSummaryCard from '../components/GpaSummaryCard.vue'
import MetricGrid from '../components/MetricGrid.vue'
import FailingWarningCard from '../components/FailingWarningCard.vue'
import GpaTrendChart from '../components/GpaTrendChart.vue'
import ScoreDistributionChart from '../components/ScoreDistributionChart.vue'

const appStore = useAppStore()
const profilesStore = useProfilesStore()
const gradesStore = useGradesStore()

const currentProfile = computed(() => profilesStore.getProfile(appStore.currentProfileId))
const currentGrades = computed(() => gradesStore.getGrades(appStore.currentProfileId))
const gpa = useGPA(currentProfile, currentGrades)

</script>
<style scoped>
/* 组间距与首页/我的页一致:卡片自身 margin-bottom: var(--spacing),
   组之间额外留白形成分组节奏 */
.stats-group {
  margin-bottom: 0.5rem;
}

.stats-group:last-child {
  margin-bottom: 0;
}

.loading-state {
  text-align: center;
}
</style>
