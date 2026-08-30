<template>
  <section class="card" aria-labelledby="score-distribution-title">
    <h2 id="score-distribution-title" style="font-size: 1rem; font-weight: bold; margin: 0 0 0.8rem 0;">成绩分布</h2>
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
import { useAppStore } from '../stores/app'

const props = defineProps({
  grades: Object
})

const appStore = useAppStore()

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

const chartData = computed(() => ({
  labels: Object.keys(distribution.value),
  datasets: [{
    label: '课程数',
    data: Object.values(distribution.value),
    backgroundColor: ['#4caf50', '#66ccff', '#ff9800', '#ff5722', '#f44336'],
    borderRadius: 4
  }]
}))

const chartOptions = computed(() => {
  const dark = appStore.isDark
  const axis = {
    ticks: { color: dark ? '#f0f0f0' : '#1a1a1a' },
    grid: { color: dark ? '#333844' : '#dddddd' }
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
