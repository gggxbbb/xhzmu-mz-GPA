<template>
  <section class="neo-card" aria-labelledby="gpa-trend-title">
    <h2 id="gpa-trend-title" class="chart-title">学期 GPA 趋势</h2>
    <Bar
      :data="chartData"
      :options="chartOptions"
      role="img"
      aria-label="学期 GPA 趋势柱状图"
    />
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { ChartJS } from '../plugins/chart.js'
import { useAppStore } from '../stores/app'

const GPA_MAX = 5

const props = defineProps({
  semesterGpas: Object
})

const appStore = useAppStore()

const chartData = computed(() => ({
  labels: Object.keys(props.semesterGpas),
  datasets: [{
    label: '学期 GPA',
    data: Object.values(props.semesterGpas),
    backgroundColor: '#66ccff',
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
      y: { ...axis, min: 0, max: GPA_MAX }
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
