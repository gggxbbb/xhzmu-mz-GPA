<template>
  <section class="neo-card" aria-labelledby="score-distribution-title">
    <h2 id="score-distribution-title" class="chart-title">成绩分布</h2>
    <Bar
      :data="chartData"
      :options="chartOptions"
      role="img"
      aria-label="成绩分布柱状图"
    />
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { ChartJS } from '../plugins/chart.js'
import { useThemeTokens } from '../composables/useThemeTokens.js'

const props = defineProps({
  grades: Object
})

const { themeTick, token } = useThemeTokens()

const distribution = computed(() => {
  const buckets = { '90-100': 0, '80-89': 0, '70-79': 0, '60-69': 0, '<60': 0 }
  for (const score of Object.values(props.grades)) {
    if (typeof score !== 'number' || isNaN(score)) continue
    if (score >= 90) buckets['90-100']++
    else if (score >= 80) buckets['80-89']++
    else if (score >= 70) buckets['70-79']++
    else if (score >= 60) buckets['60-69']++
    else buckets['<60']++
  }
  return buckets
})

const chartData = computed(() => {
  themeTick.value
  // 及格区间统一 accent,不及格区间(<60)用 danger 标出
  const colors = Object.keys(distribution.value).map((bucket) =>
    bucket === '<60' ? token('--danger') : token('--accent')
  )
  return {
    labels: Object.keys(distribution.value),
    datasets: [{
      label: '课程数',
      data: Object.values(distribution.value),
      backgroundColor: colors,
      borderRadius: 0
    }]
  }
})

const chartOptions = computed(() => {
  themeTick.value
  const axis = {
    ticks: { color: token('--ink') },
    grid: { color: token('--ink-soft') }
  }
  return {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: axis,
      y: { ...axis, beginAtZero: true, ticks: { ...axis.ticks, stepSize: 1 } }
    }
  }
})
</script>
<style scoped>
.chart-title {
  font-size: var(--text-base);
  font-weight: var(--weight-heading);
  margin: 0 0 0.8rem 0;
}
</style>
